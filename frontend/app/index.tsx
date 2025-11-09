import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Predefined options
const INDUSTRY_OPTIONS = ['Technology', 'Finance', 'Healthcare', 'E-commerce', 'SaaS', 'AI/ML', 'Fintech', 'EdTech', 'Gaming', 'Cybersecurity', 'Marketing', 'Retail'];
const STARTUP_STAGE_OPTIONS = ['Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Growth', 'Pre-IPO', 'Public'];
const LOCATION_SUGGESTIONS = ['San Francisco, CA', 'New York, NY', 'Remote', 'Los Angeles, CA', 'Seattle, WA', 'Austin, TX', 'Boston, MA', 'Chicago, IL', 'Denver, CO', 'Miami, FL'];
const JOB_TITLE_SUGGESTIONS = ['Software Engineer', 'Senior Software Engineer', 'Full Stack Developer', 'Backend Engineer', 'Frontend Engineer', 'Product Manager', 'Engineering Manager', 'Data Scientist', 'DevOps Engineer', 'Mobile Developer'];

export default function OnboardingScreen() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  
  // Multi-select state
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedJobTitles, setSelectedJobTitles] = useState<string[]>([]);
  
  // Input and suggestion state
  const [locationInput, setLocationInput] = useState('');
  const [jobTitleInput, setJobTitleInput] = useState('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showJobTitleSuggestions, setShowJobTitleSuggestions] = useState(false);
  
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const toggleSelection = (item: string, selected: string[], setSelected: (items: string[]) => void) => {
    if (selected.includes(item)) {
      setSelected(selected.filter(i => i !== item));
    } else {
      setSelected([...selected, item]);
    }
  };

  const addLocation = (location: string) => {
    if (location.trim() && !selectedLocations.includes(location.trim())) {
      setSelectedLocations([...selectedLocations, location.trim()]);
      setLocationInput('');
      setShowLocationSuggestions(false);
    }
  };

  const addJobTitle = (title: string) => {
    if (title.trim() && !selectedJobTitles.includes(title.trim())) {
      setSelectedJobTitles([...selectedJobTitles, title.trim()]);
      setJobTitleInput('');
      setShowJobTitleSuggestions(false);
    }
  };

  const handleUploadAndContinue = async () => {
    console.log('handleUploadAndContinue called');
    console.log('Selected file:', selectedFile);
    
    setUploading(true);
    try {
      // Only upload resume if file is selected
      if (selectedFile) {
        console.log('Uploading resume...');
        const formData = new FormData();
        formData.append('file', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType || 'application/pdf',
        } as any);

        const uploadResponse = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/upload-resume`, {
          method: 'POST',
          body: formData,
        });

        console.log('Upload response status:', uploadResponse.status);
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Upload error:', errorText);
          Alert.alert('Warning', 'Resume upload failed. Continuing without resume.');
        } else {
          console.log('Resume uploaded successfully');
        }
      } else {
        console.log('No file selected, skipping upload');
      }

      // Save preferences (optional)
      if (selectedJobTitles.length > 0 || selectedLocations.length > 0 || selectedIndustries.length > 0 || selectedStages.length > 0) {
        console.log('Saving preferences...');
        const prefsData = {
          salary_min: salaryMin ? parseInt(salaryMin) : null,
          salary_max: salaryMax ? parseInt(salaryMax) : null,
          locations: selectedLocations,
          startup_stages: selectedStages,
          industries: selectedIndustries,
          job_titles: selectedJobTitles
        };

        const prefsResponse = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/profile/preferences`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(prefsData),
        });

        console.log('Preferences response status:', prefsResponse.status);
        
        if (prefsResponse.ok) {
          console.log('Preferences saved successfully');
        }
      }

      // Always navigate to jobs screen
      console.log('Navigating to /jobs');
      router.push('/jobs');
      console.log('Navigation called');
    } catch (error) {
      console.error('Error in handleUploadAndContinue:', error);
      // Still navigate even if there's an error
      console.log('Error occurred, but navigating anyway');
      router.push('/jobs');
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    router.push('/jobs');
  };

  const filteredLocationSuggestions = locationInput
    ? LOCATION_SUGGESTIONS.filter(loc => 
        loc.toLowerCase().includes(locationInput.toLowerCase()) &&
        !selectedLocations.includes(loc)
      )
    : LOCATION_SUGGESTIONS.filter(loc => !selectedLocations.includes(loc));

  const filteredJobTitleSuggestions = jobTitleInput
    ? JOB_TITLE_SUGGESTIONS.filter(title => 
        title.toLowerCase().includes(jobTitleInput.toLowerCase()) &&
        !selectedJobTitles.includes(title)
      )
    : JOB_TITLE_SUGGESTIONS.filter(title => !selectedJobTitles.includes(title));

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Ionicons name="briefcase" size={48} color="#6366f1" />
            <Text style={styles.title}>Welcome to Jobby</Text>
            <Text style={styles.subtitle}>Find your perfect job match</Text>
          </View>

          {/* Resume Upload Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upload Your Resume</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
              <Ionicons name="cloud-upload-outline" size={32} color="#6366f1" />
              <Text style={styles.uploadButtonText}>
                {selectedFile ? selectedFile.name : 'Choose PDF or DOCX file'}
              </Text>
            </TouchableOpacity>
            {selectedFile && (
              <View style={styles.fileChip}>
                <Ionicons name="document-text" size={20} color="#059669" />
                <Text style={styles.fileChipText}>{selectedFile.name}</Text>
                <TouchableOpacity onPress={() => setSelectedFile(null)}>
                  <Ionicons name="close-circle" size={20} color="#dc2626" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Job Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Preferences</Text>
            
            {/* Job Titles with Autocomplete */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Job Titles</Text>
              {selectedJobTitles.length > 0 && (
                <View style={styles.pillContainer}>
                  {selectedJobTitles.map((title) => (
                    <View key={title} style={styles.pill}>
                      <Text style={styles.pillText}>{title}</Text>
                      <TouchableOpacity
                        onPress={() => setSelectedJobTitles(selectedJobTitles.filter(t => t !== title))}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="close" size={16} color="#6366f1" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <TextInput
                style={styles.textInput}
                placeholder="Type to search or add custom..."
                value={jobTitleInput}
                onChangeText={setJobTitleInput}
                onFocus={() => setShowJobTitleSuggestions(true)}
                onSubmitEditing={() => {
                  if (jobTitleInput.trim()) {
                    addJobTitle(jobTitleInput);
                  }
                }}
              />
              {showJobTitleSuggestions && filteredJobTitleSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {filteredJobTitleSuggestions.slice(0, 5).map((title) => (
                    <TouchableOpacity
                      key={title}
                      style={styles.suggestionItem}
                      onPress={() => addJobTitle(title)}
                    >
                      <Ionicons name="add-circle-outline" size={20} color="#6366f1" />
                      <Text style={styles.suggestionText}>{title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Locations with Autocomplete */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Locations</Text>
              {selectedLocations.length > 0 && (
                <View style={styles.pillContainer}>
                  {selectedLocations.map((location) => (
                    <View key={location} style={styles.pill}>
                      <Text style={styles.pillText}>{location}</Text>
                      <TouchableOpacity
                        onPress={() => setSelectedLocations(selectedLocations.filter(l => l !== location))}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="close" size={16} color="#6366f1" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <TextInput
                style={styles.textInput}
                placeholder="Type to search or add custom..."
                value={locationInput}
                onChangeText={setLocationInput}
                onFocus={() => setShowLocationSuggestions(true)}
                onSubmitEditing={() => {
                  if (locationInput.trim()) {
                    addLocation(locationInput);
                  }
                }}
              />
              {showLocationSuggestions && filteredLocationSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {filteredLocationSuggestions.slice(0, 5).map((location) => (
                    <TouchableOpacity
                      key={location}
                      style={styles.suggestionItem}
                      onPress={() => addLocation(location)}
                    >
                      <Ionicons name="add-circle-outline" size={20} color="#6366f1" />
                      <Text style={styles.suggestionText}>{location}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Salary Range */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Min Salary</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="100000"
                  value={salaryMin}
                  onChangeText={setSalaryMin}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Max Salary</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="200000"
                  value={salaryMax}
                  onChangeText={setSalaryMax}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Industries - Multi-select Pills */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Industries</Text>
              <View style={styles.pillContainer}>
                {INDUSTRY_OPTIONS.map((industry) => (
                  <TouchableOpacity
                    key={industry}
                    style={[
                      styles.selectablePill,
                      selectedIndustries.includes(industry) && styles.selectablePillActive
                    ]}
                    onPress={() => toggleSelection(industry, selectedIndustries, setSelectedIndustries)}
                  >
                    <Text style={[
                      styles.selectablePillText,
                      selectedIndustries.includes(industry) && styles.selectablePillTextActive
                    ]}>
                      {industry}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Startup Stages - Multi-select Pills */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Startup Stages</Text>
              <View style={styles.pillContainer}>
                {STARTUP_STAGE_OPTIONS.map((stage) => (
                  <TouchableOpacity
                    key={stage}
                    style={[
                      styles.selectablePill,
                      selectedStages.includes(stage) && styles.selectablePillActive
                    ]}
                    onPress={() => toggleSelection(stage, selectedStages, setSelectedStages)}
                  >
                    <Text style={[
                      styles.selectablePillText,
                      selectedStages.includes(stage) && styles.selectablePillTextActive
                    ]}>
                      {stage}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Continue Button */}
          <TouchableOpacity 
            style={[styles.continueButton, uploading && styles.buttonDisabled]} 
            onPress={handleUploadAndContinue}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.continueButtonText}>Continue to Job Search</Text>
                <Ionicons name="arrow-forward" size={20} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>

          {/* Skip Button for Testing */}
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for now (Testing)</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
  },
  uploadButtonText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  fileChipText: {
    flex: 1,
    marginLeft: 8,
    color: '#059669',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#ffffff',
    minHeight: 44,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  pillText: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '500',
  },
  selectablePill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  selectablePillActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  selectablePillText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  selectablePillTextActive: {
    color: '#ffffff',
  },
  suggestionsContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionText: {
    fontSize: 14,
    color: '#1e293b',
  },
  continueButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  skipButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  skipButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
});