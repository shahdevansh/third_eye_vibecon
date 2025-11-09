#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Jobby Application
Tests all API endpoints with success and error cases
"""

import requests
import json
import os
import tempfile
from pathlib import Path
import time
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from docx import Document

# Get backend URL from frontend .env file
def get_backend_url():
    frontend_env_path = Path("/app/frontend/.env")
    if frontend_env_path.exists():
        with open(frontend_env_path, 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    return "http://localhost:8001"

BACKEND_URL = get_backend_url()
API_BASE = f"{BACKEND_URL}/api"

print(f"Testing backend at: {API_BASE}")

class JobbyAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.resume_id = None
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def create_test_pdf(self):
        """Create a test PDF resume"""
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            doc = SimpleDocTemplate(tmp.name, pagesize=letter)
            styles = getSampleStyleSheet()
            
            story = []
            story.append(Paragraph("John Smith", styles['Title']))
            story.append(Paragraph("Software Engineer", styles['Heading2']))
            story.append(Paragraph("Email: john.smith@email.com", styles['Normal']))
            story.append(Paragraph("Phone: (555) 123-4567", styles['Normal']))
            story.append(Paragraph("", styles['Normal']))
            story.append(Paragraph("EXPERIENCE", styles['Heading2']))
            story.append(Paragraph("Senior Software Engineer at TechCorp (2020-2023)", styles['Normal']))
            story.append(Paragraph("• Developed scalable web applications using Python and React", styles['Normal']))
            story.append(Paragraph("• Led a team of 5 developers on multiple projects", styles['Normal']))
            story.append(Paragraph("• Improved system performance by 40%", styles['Normal']))
            story.append(Paragraph("", styles['Normal']))
            story.append(Paragraph("SKILLS", styles['Heading2']))
            story.append(Paragraph("Python, JavaScript, React, FastAPI, MongoDB, AWS", styles['Normal']))
            
            doc.build(story)
            return tmp.name
            
    def create_test_docx(self):
        """Create a test DOCX resume"""
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp:
            doc = Document()
            doc.add_heading('Jane Doe', 0)
            doc.add_heading('Product Manager', level=1)
            doc.add_paragraph('Email: jane.doe@email.com')
            doc.add_paragraph('Phone: (555) 987-6543')
            doc.add_paragraph('')
            doc.add_heading('EXPERIENCE', level=1)
            doc.add_paragraph('Senior Product Manager at StartupXYZ (2019-2023)')
            doc.add_paragraph('• Managed product roadmap for B2B SaaS platform')
            doc.add_paragraph('• Increased user engagement by 60%')
            doc.add_paragraph('• Coordinated with engineering and design teams')
            doc.add_paragraph('')
            doc.add_heading('SKILLS', level=1)
            doc.add_paragraph('Product Strategy, User Research, Agile, SQL, Analytics')
            
            doc.save(tmp.name)
            return tmp.name

    def test_health_check(self):
        """Test GET /api/ - Health check"""
        try:
            response = self.session.get(f"{API_BASE}/")
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "version" in data:
                    self.log_test("Health Check", True, f"Response: {data}")
                else:
                    self.log_test("Health Check", False, f"Missing fields in response: {data}")
            else:
                self.log_test("Health Check", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")

    def test_upload_resume_pdf(self):
        """Test POST /api/upload-resume with PDF"""
        try:
            pdf_path = self.create_test_pdf()
            
            with open(pdf_path, 'rb') as f:
                files = {'file': ('test_resume.pdf', f, 'application/pdf')}
                response = self.session.post(f"{API_BASE}/upload-resume", files=files)
            
            os.unlink(pdf_path)  # Clean up
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['message', 'filename', 'text_preview']
                if all(field in data for field in required_fields):
                    self.log_test("Upload Resume (PDF)", True, f"Filename: {data['filename']}, Preview length: {len(data['text_preview'])}")
                else:
                    self.log_test("Upload Resume (PDF)", False, f"Missing fields in response: {data}")
            else:
                self.log_test("Upload Resume (PDF)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Upload Resume (PDF)", False, f"Exception: {str(e)}")

    def test_upload_resume_docx(self):
        """Test POST /api/upload-resume with DOCX"""
        try:
            docx_path = self.create_test_docx()
            
            with open(docx_path, 'rb') as f:
                files = {'file': ('test_resume.docx', f, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
                response = self.session.post(f"{API_BASE}/upload-resume", files=files)
            
            os.unlink(docx_path)  # Clean up
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['message', 'filename', 'text_preview']
                if all(field in data for field in required_fields):
                    self.log_test("Upload Resume (DOCX)", True, f"Filename: {data['filename']}, Preview length: {len(data['text_preview'])}")
                else:
                    self.log_test("Upload Resume (DOCX)", False, f"Missing fields in response: {data}")
            else:
                self.log_test("Upload Resume (DOCX)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Upload Resume (DOCX)", False, f"Exception: {str(e)}")

    def test_upload_resume_invalid_format(self):
        """Test POST /api/upload-resume with invalid file format"""
        try:
            # Create a text file
            with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as tmp:
                tmp.write(b"This is a text file, not a resume")
                tmp_path = tmp.name
            
            with open(tmp_path, 'rb') as f:
                files = {'file': ('test_resume.txt', f, 'text/plain')}
                response = self.session.post(f"{API_BASE}/upload-resume", files=files)
            
            os.unlink(tmp_path)  # Clean up
            
            if response.status_code == 400:
                self.log_test("Upload Resume (Invalid Format)", True, "Correctly rejected invalid file format")
            else:
                self.log_test("Upload Resume (Invalid Format)", False, f"Expected 400, got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Upload Resume (Invalid Format)", False, f"Exception: {str(e)}")

    def test_save_preferences(self):
        """Test POST /api/profile/preferences"""
        try:
            preferences = {
                "salary_min": 80000,
                "salary_max": 150000,
                "locations": ["San Francisco", "New York", "Remote"],
                "startup_stages": ["Series A", "Series B", "Growth"],
                "industries": ["Technology", "FinTech", "Healthcare"],
                "job_titles": ["Software Engineer", "Senior Software Engineer", "Tech Lead"]
            }
            
            response = self.session.post(
                f"{API_BASE}/profile/preferences",
                json=preferences,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("Save Preferences", True, f"Response: {data['message']}")
                else:
                    self.log_test("Save Preferences", False, f"Missing message in response: {data}")
            else:
                self.log_test("Save Preferences", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Save Preferences", False, f"Exception: {str(e)}")

    def test_get_profile_with_data(self):
        """Test GET /api/profile when profile exists"""
        try:
            response = self.session.get(f"{API_BASE}/profile")
            
            if response.status_code == 200:
                data = response.json()
                if "profile" in data and data["profile"] is not None:
                    profile = data["profile"]
                    expected_fields = ["id", "salary_min", "salary_max", "locations", "job_titles"]
                    if any(field in profile for field in expected_fields):
                        self.log_test("Get Profile (With Data)", True, f"Profile found with fields: {list(profile.keys())}")
                    else:
                        self.log_test("Get Profile (With Data)", False, f"Profile missing expected fields: {profile}")
                else:
                    self.log_test("Get Profile (With Data)", False, f"No profile found: {data}")
            else:
                self.log_test("Get Profile (With Data)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Get Profile (With Data)", False, f"Exception: {str(e)}")

    def test_search_jobs_without_resume(self):
        """Test GET /api/jobs without resume uploaded"""
        try:
            # First clear any existing profile
            response = self.session.post(
                f"{API_BASE}/profile/preferences",
                json={"salary_min": 100000},
                headers={'Content-Type': 'application/json'}
            )
            
            # Now try to search jobs
            response = self.session.get(f"{API_BASE}/jobs")
            
            if response.status_code == 400:
                self.log_test("Search Jobs (No Resume)", True, "Correctly rejected request without resume")
            else:
                self.log_test("Search Jobs (No Resume)", False, f"Expected 400, got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Search Jobs (No Resume)", False, f"Exception: {str(e)}")

    def test_search_jobs_with_resume(self):
        """Test GET /api/jobs with resume uploaded"""
        try:
            # First upload a resume
            pdf_path = self.create_test_pdf()
            with open(pdf_path, 'rb') as f:
                files = {'file': ('test_resume.pdf', f, 'application/pdf')}
                upload_response = self.session.post(f"{API_BASE}/upload-resume", files=files)
            os.unlink(pdf_path)
            
            if upload_response.status_code != 200:
                self.log_test("Search Jobs (With Resume)", False, "Failed to upload resume first")
                return
            
            # Now search for jobs
            response = self.session.get(f"{API_BASE}/jobs")
            
            if response.status_code == 200:
                data = response.json()
                if "jobs" in data and "count" in data:
                    jobs = data["jobs"]
                    self.log_test("Search Jobs (With Resume)", True, f"Found {data['count']} jobs, first job: {jobs[0]['title'] if jobs else 'None'}")
                else:
                    self.log_test("Search Jobs (With Resume)", False, f"Missing fields in response: {data}")
            else:
                self.log_test("Search Jobs (With Resume)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Search Jobs (With Resume)", False, f"Exception: {str(e)}")

    def test_tailor_resume_without_resume(self):
        """Test POST /api/tailor-resume without resume uploaded"""
        try:
            tailor_request = {
                "job_id": "test-job-123",
                "job_title": "Senior Software Engineer",
                "company": "TechCorp",
                "job_description": "We are looking for a senior software engineer with Python and React experience...",
                "job_url": "https://techcorp.com/jobs/senior-engineer"
            }
            
            response = self.session.post(
                f"{API_BASE}/tailor-resume",
                json=tailor_request,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 400:
                self.log_test("Tailor Resume (No Resume)", True, "Correctly rejected request without resume")
            else:
                self.log_test("Tailor Resume (No Resume)", False, f"Expected 400, got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Tailor Resume (No Resume)", False, f"Exception: {str(e)}")

    def test_tailor_resume_with_resume(self):
        """Test POST /api/tailor-resume with resume uploaded"""
        try:
            # First upload a resume
            pdf_path = self.create_test_pdf()
            with open(pdf_path, 'rb') as f:
                files = {'file': ('test_resume.pdf', f, 'application/pdf')}
                upload_response = self.session.post(f"{API_BASE}/upload-resume", files=files)
            os.unlink(pdf_path)
            
            if upload_response.status_code != 200:
                self.log_test("Tailor Resume (With Resume)", False, "Failed to upload resume first")
                return
            
            # Now tailor resume
            tailor_request = {
                "job_id": "test-job-456",
                "job_title": "Senior Software Engineer",
                "company": "InnovativeTech",
                "job_description": "We are seeking a Senior Software Engineer with expertise in Python, FastAPI, and React. The ideal candidate will have experience building scalable web applications and working in agile environments.",
                "job_url": "https://innovativetech.com/jobs/senior-engineer"
            }
            
            response = self.session.post(
                f"{API_BASE}/tailor-resume",
                json=tailor_request,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['message', 'resume_id', 'pdf_path', 'content_preview']
                if all(field in data for field in required_fields):
                    self.resume_id = data['resume_id']  # Store for download test
                    self.log_test("Tailor Resume (With Resume)", True, f"Resume ID: {data['resume_id']}, Preview length: {len(data['content_preview'])}")
                else:
                    self.log_test("Tailor Resume (With Resume)", False, f"Missing fields in response: {data}")
            else:
                self.log_test("Tailor Resume (With Resume)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Tailor Resume (With Resume)", False, f"Exception: {str(e)}")

    def test_download_resume_invalid_id(self):
        """Test GET /api/download-resume/{resume_id} with invalid ID"""
        try:
            invalid_id = "invalid-resume-id-123"
            response = self.session.get(f"{API_BASE}/download-resume/{invalid_id}")
            
            if response.status_code == 404:
                self.log_test("Download Resume (Invalid ID)", True, "Correctly returned 404 for invalid resume ID")
            else:
                self.log_test("Download Resume (Invalid ID)", False, f"Expected 404, got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Download Resume (Invalid ID)", False, f"Exception: {str(e)}")

    def test_download_resume_valid_id(self):
        """Test GET /api/download-resume/{resume_id} with valid ID"""
        try:
            if not self.resume_id:
                self.log_test("Download Resume (Valid ID)", False, "No resume ID available from previous test")
                return
            
            response = self.session.get(f"{API_BASE}/download-resume/{self.resume_id}")
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'application/pdf' in content_type:
                    content_length = len(response.content)
                    self.log_test("Download Resume (Valid ID)", True, f"PDF downloaded successfully, size: {content_length} bytes")
                else:
                    self.log_test("Download Resume (Valid ID)", False, f"Wrong content type: {content_type}")
            else:
                self.log_test("Download Resume (Valid ID)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Download Resume (Valid ID)", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 60)
        print("JOBBY BACKEND API COMPREHENSIVE TESTING")
        print("=" * 60)
        
        # Test in logical order
        self.test_health_check()
        
        # Resume upload tests
        self.test_upload_resume_pdf()
        self.test_upload_resume_docx() 
        self.test_upload_resume_invalid_format()
        
        # Profile tests
        self.test_save_preferences()
        self.test_get_profile_with_data()
        
        # Job search tests
        self.test_search_jobs_without_resume()
        self.test_search_jobs_with_resume()
        
        # Resume tailoring tests
        self.test_tailor_resume_without_resume()
        self.test_tailor_resume_with_resume()
        
        # Download tests
        self.test_download_resume_invalid_id()
        self.test_download_resume_valid_id()
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        print("\nFAILED TESTS:")
        for result in self.test_results:
            if not result['success']:
                print(f"❌ {result['test']}: {result['details']}")
        
        print("\nPASSED TESTS:")
        for result in self.test_results:
            if result['success']:
                print(f"✅ {result['test']}")
        
        return passed == total

if __name__ == "__main__":
    tester = JobbyAPITester()
    success = tester.run_all_tests()
    exit(0 if success else 1)