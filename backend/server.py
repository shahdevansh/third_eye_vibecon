from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import requests
import io
import base64
from docx import Document
from PyPDF2 import PdfReader
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Environment variables
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
PARALLEL_API_KEY = os.environ.get('PARALLEL_API_KEY')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models
class UserProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    locations: Optional[List[str]] = []
    startup_stages: Optional[List[str]] = []
    industries: Optional[List[str]] = []
    job_titles: Optional[List[str]] = []
    resume_text: Optional[str] = None
    resume_filename: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class JobPreferences(BaseModel):
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    locations: Optional[List[str]] = []
    startup_stages: Optional[List[str]] = []
    industries: Optional[List[str]] = []
    job_titles: Optional[List[str]] = []

class Job(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    company: str
    location: Optional[str] = None
    description: str
    url: str
    posted_date: Optional[str] = None
    salary: Optional[str] = None
    relevance_score: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TailoredResume(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    job_id: str
    job_title: str
    company: str
    tailored_content: str
    pdf_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ResumeUploadResponse(BaseModel):
    message: str
    filename: str
    text_preview: str

class JobSearchResponse(BaseModel):
    jobs: List[Job]
    count: int

class TailorRequest(BaseModel):
    job_id: str
    job_title: str
    company: str
    job_description: str
    job_url: str

# Helper functions
async def parse_resume_file(file_content: bytes, filename: str) -> str:
    """Parse resume from PDF or DOCX"""
    try:
        if filename.endswith('.pdf'):
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            return text
        elif filename.endswith('.docx'):
            doc_file = io.BytesIO(file_content)
            doc = Document(doc_file)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text
        else:
            raise ValueError("Unsupported file format. Please upload PDF or DOCX.")
    except Exception as e:
        logger.error(f"Error parsing resume: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error parsing resume: {str(e)}")

async def search_jobs_parallel_ai(objective: str, max_results: int = 10) -> List[Dict[str, Any]]:
    """Search jobs using Parallel AI API"""
    try:
        response = requests.post(
            "https://api.parallel.ai/v1beta/search",
            headers={
                "x-api-key": PARALLEL_API_KEY,
                "Content-Type": "application/json",
                "parallel-beta": "search-extract-2025-10-10"
            },
            json={
                "mode": "one-shot",
                "search_queries": None,
                "max_results": max_results,
                "objective": objective
            },
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        logger.info(f"Parallel AI response: {json.dumps(data, indent=2)}")
        return data.get('results', [])
    except Exception as e:
        logger.error(f"Error searching jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error searching jobs: {str(e)}")

async def generate_tailored_resume(resume_text: str, job_description: str, job_title: str, company: str) -> str:
    """Generate tailored resume using OpenAI via Emergent LLM"""
    try:
        # Create LLM chat instance
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message="You are an expert resume writer and career coach specializing in tailoring resumes to job descriptions."
        ).with_model("openai", "gpt-4o-mini")

        prompt = f"""I need you to tailor this resume to match the following job description.

ORIGINAL RESUME:
{resume_text}

JOB TITLE: {job_title}
COMPANY: {company}

JOB DESCRIPTION:
{job_description}

Please rewrite the resume to:
1. Emphasize relevant skills and experiences that match the job requirements
2. Use keywords from the job description naturally
3. Reframe bullet points to align with the company's values and the role's responsibilities
4. Keep it professional and concise (1 page ideal)
5. Maintain the original structure but optimize content

Return ONLY the tailored resume text in a professional format, ready to be converted to PDF. Do not include any explanations or meta-commentary."""

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return response
    except Exception as e:
        logger.error(f"Error generating tailored resume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating tailored resume: {str(e)}")

async def create_resume_pdf(content: str, filename: str) -> str:
    """Create PDF from resume content"""
    try:
        pdf_dir = Path("/app/backend/resumes")
        pdf_dir.mkdir(exist_ok=True)
        pdf_path = pdf_dir / f"{filename}.pdf"
        
        # Create PDF
        doc = SimpleDocTemplate(
            str(pdf_path),
            pagesize=letter,
            topMargin=0.5*inch,
            bottomMargin=0.5*inch,
            leftMargin=0.75*inch,
            rightMargin=0.75*inch
        )
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor='#1a1a1a',
            spaceAfter=12,
            alignment=TA_CENTER
        )
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=12,
            textColor='#2c3e50',
            spaceAfter=6,
            spaceBefore=12
        )
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['BodyText'],
            fontSize=10,
            textColor='#333333',
            spaceAfter=6,
            leading=14
        )
        
        # Build content
        story = []
        lines = content.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                story.append(Spacer(1, 0.1*inch))
                continue
            
            # Detect headings (all caps or ends with colon)
            if line.isupper() or line.endswith(':'):
                story.append(Paragraph(line, heading_style))
            else:
                story.append(Paragraph(line, body_style))
        
        doc.build(story)
        return str(pdf_path)
    except Exception as e:
        logger.error(f"Error creating PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating PDF: {str(e)}")

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Jobby API is running", "version": "1.0.0"}

@api_router.post("/upload-resume", response_model=ResumeUploadResponse)
async def upload_resume(file: UploadFile = File(...)):
    """Upload and parse resume"""
    try:
        # Read file content
        content = await file.read()
        
        # Parse resume
        resume_text = await parse_resume_file(content, file.filename)
        
        # Store in database
        profile = UserProfile(
            resume_text=resume_text,
            resume_filename=file.filename
        )
        
        await db.user_profiles.delete_many({})  # For MVP, keep only one profile
        await db.user_profiles.insert_one(profile.dict())
        
        # Return preview
        preview = resume_text[:500] + "..." if len(resume_text) > 500 else resume_text
        
        return ResumeUploadResponse(
            message="Resume uploaded successfully",
            filename=file.filename,
            text_preview=preview
        )
    except Exception as e:
        logger.error(f"Error uploading resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/profile/preferences")
async def save_preferences(preferences: JobPreferences):
    """Save job preferences"""
    try:
        # Get existing profile or create new
        profile = await db.user_profiles.find_one()
        
        if profile:
            # Update existing
            await db.user_profiles.update_one(
                {"id": profile["id"]},
                {"$set": {
                    **preferences.dict(),
                    "updated_at": datetime.utcnow()
                }}
            )
        else:
            # Create new
            profile = UserProfile(**preferences.dict())
            await db.user_profiles.insert_one(profile.dict())
        
        return {"message": "Preferences saved successfully"}
    except Exception as e:
        logger.error(f"Error saving preferences: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/profile")
async def get_profile():
    """Get user profile"""
    try:
        profile = await db.user_profiles.find_one()
        if not profile:
            return {"profile": None}
        
        # Remove MongoDB _id field
        profile.pop('_id', None)
        return {"profile": profile}
    except Exception as e:
        logger.error(f"Error getting profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/jobs", response_model=JobSearchResponse)
async def search_jobs():
    """Search for jobs based on user profile"""
    try:
        # Get user profile
        profile = await db.user_profiles.find_one()
        if not profile or not profile.get('resume_text'):
            raise HTTPException(status_code=400, detail="Please upload resume first")
        
        # Build search objective
        objective_parts = ["Find the top 10 most relevant job postings"]
        
        if profile.get('job_titles'):
            objective_parts.append(f"for roles like {', '.join(profile['job_titles'])}")
        
        if profile.get('locations'):
            objective_parts.append(f"in {', '.join(profile['locations'])}")
        
        if profile.get('salary_min'):
            objective_parts.append(f"with salary above ${profile['salary_min']:,}")
        
        objective_parts.append("posted in the last 24 hours from startup and tech company career pages.")
        objective_parts.append("Include job title, company name, location, job description, and apply URL.")
        
        objective = " ".join(objective_parts)
        logger.info(f"Search objective: {objective}")
        
        # Search using Parallel AI
        results = await search_jobs_parallel_ai(objective, max_results=10)
        
        # Parse results and create Job objects
        jobs = []
        for idx, result in enumerate(results):
            # Extract information from result
            content = result.get('content', '')
            url = result.get('url', '')
            
            # Simple parsing - in production, use more sophisticated extraction
            job = Job(
                title=result.get('title', f"Job {idx + 1}"),
                company=result.get('source', 'Unknown Company'),
                location=None,
                description=content[:500] if content else "No description available",
                url=url,
                posted_date="Last 24 hours",
                relevance_score=1.0 - (idx * 0.1)
            )
            jobs.append(job)
        
        # Store in database
        await db.jobs.delete_many({})  # Clear old jobs
        if jobs:
            await db.jobs.insert_many([job.dict() for job in jobs])
        
        return JobSearchResponse(jobs=jobs, count=len(jobs))
    except Exception as e:
        logger.error(f"Error searching jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/tailor-resume")
async def tailor_resume(request: TailorRequest):
    """Tailor resume for specific job"""
    try:
        # Get user profile
        profile = await db.user_profiles.find_one()
        if not profile or not profile.get('resume_text'):
            raise HTTPException(status_code=400, detail="Please upload resume first")
        
        resume_text = profile['resume_text']
        
        # Generate tailored resume
        tailored_content = await generate_tailored_resume(
            resume_text=resume_text,
            job_description=request.job_description,
            job_title=request.job_title,
            company=request.company
        )
        
        # Create PDF
        pdf_filename = f"resume_{request.company.replace(' ', '_')}_{uuid.uuid4().hex[:8]}"
        pdf_path = await create_resume_pdf(tailored_content, pdf_filename)
        
        # Store in database
        tailored = TailoredResume(
            user_id=profile['id'],
            job_id=request.job_id,
            job_title=request.job_title,
            company=request.company,
            tailored_content=tailored_content,
            pdf_path=pdf_path
        )
        
        await db.tailored_resumes.insert_one(tailored.dict())
        
        return {
            "message": "Resume tailored successfully",
            "resume_id": tailored.id,
            "pdf_path": pdf_path,
            "content_preview": tailored_content[:300] + "..."
        }
    except Exception as e:
        logger.error(f"Error tailoring resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/download-resume/{resume_id}")
async def download_resume(resume_id: str):
    """Download tailored resume PDF"""
    try:
        # Get from database
        resume = await db.tailored_resumes.find_one({"id": resume_id})
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        pdf_path = resume.get('pdf_path')
        if not pdf_path or not Path(pdf_path).exists():
            raise HTTPException(status_code=404, detail="PDF file not found")
        
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=f"{resume['company']}_resume.pdf"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
