import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function OnboardingScreen() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [preferences, setPreferences] = useState({
    salary_min: '',
    salary_max: '',
    locations: '',
    startup_stages: '',
    industries: '',
    job_titles: ''
  });

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

  const handleUploadAndContinue = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please upload your resume first');
      return;
    }

    setUploading(true);
    try {
      // Upload resume
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

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload resume');
      }

      // Save preferences
      const prefsData = {
        salary_min: preferences.salary_min ? parseInt(preferences.salary_min) : null,
        salary_max: preferences.salary_max ? parseInt(preferences.salary_max) : null,
        locations: preferences.locations ? preferences.locations.split(',').map(l => l.trim()) : [],
        startup_stages: preferences.startup_stages ? preferences.startup_stages.split(',').map(s => s.trim()) : [],
        industries: preferences.industries ? preferences.industries.split(',').map(i => i.trim()) : [],
        job_titles: preferences.job_titles ? preferences.job_titles.split(',').map(j => j.trim()) : []
      };

      const prefsResponse = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/profile/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prefsData),
      });

      if (!prefsResponse.ok) {
        throw new Error('Failed to save preferences');
      }

      Alert.alert('Success', 'Profile created successfully!', [
        { text: 'OK', onPress: () => router.push('/jobs') }
      ]);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to create profile. Please try again.');
    } finally {
      setUploading(false);
    }
  };

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
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Job Titles (comma-separated)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Software Engineer, Product Manager"
                value={preferences.job_titles}
                onChangeText={(text) => setPreferences({...preferences, job_titles: text})}
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Locations (comma-separated)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., San Francisco, Remote, New York"
                value={preferences.locations}
                onChangeText={(text) => setPreferences({...preferences, locations: text})}
                multiline
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Min Salary</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="100000"
                  value={preferences.salary_min}
                  onChangeText={(text) => setPreferences({...preferences, salary_min: text})}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Max Salary</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="200000"
                  value={preferences.salary_max}
                  onChangeText={(text) => setPreferences({...preferences, salary_max: text})}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Industries (comma-separated)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Technology, Finance, Healthcare"
                value={preferences.industries}
                onChangeText={(text) => setPreferences({...preferences, industries: text})}
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Startup Stages (comma-separated)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Series A, Series B, Growth"
                value={preferences.startup_stages}
                onChangeText={(text) => setPreferences({...preferences, startup_stages: text})}
                multiline
              />
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
  continueButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 32,
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
});