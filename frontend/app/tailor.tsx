import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function TailorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [tailoring, setTailoring] = useState(false);
  const [tailoredResume, setTailoredResume] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  const jobId = params.jobId as string;
  const jobTitle = params.jobTitle as string;
  const company = params.company as string;
  const jobDescription = params.jobDescription as string;
  const jobUrl = params.jobUrl as string;

  const handleTailorResume = async () => {
    setTailoring(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/tailor-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: jobId,
          job_title: jobTitle,
          company: company,
          job_description: jobDescription,
          job_url: jobUrl
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to tailor resume');
      }

      const data = await response.json();
      setTailoredResume(data);
      Alert.alert('Success', 'Resume tailored successfully!');
    } catch (error) {
      console.error('Error tailoring resume:', error);
      Alert.alert('Error', 'Failed to tailor resume. Please try again.');
    } finally {
      setTailoring(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!tailoredResume) return;

    setDownloading(true);
    try {
      const downloadUrl = `${EXPO_PUBLIC_BACKEND_URL}/api/download-resume/${tailoredResume.resume_id}`;
      const fileUri = FileSystem.documentDirectory + `${company}_resume.pdf`;

      const downloadResult = await FileSystem.downloadAsync(downloadUrl, fileUri);
      
      if (downloadResult.status === 200) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri);
        } else {
          Alert.alert('Success', `Resume saved to ${downloadResult.uri}`);
        }
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Error', 'Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const openJobUrl = () => {
    Linking.openURL(jobUrl).catch(() => {
      Alert.alert('Error', 'Failed to open job URL');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Tailor Resume</Text>
          <Text style={styles.subtitle}>{company}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Job Info Card */}
        <View style={styles.jobInfoCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="briefcase" size={32} color="#6366f1" />
          </View>
          <Text style={styles.jobTitle}>{jobTitle}</Text>
          <Text style={styles.company}>{company}</Text>
          <TouchableOpacity style={styles.viewJobLink} onPress={openJobUrl}>
            <Ionicons name="open-outline" size={16} color="#6366f1" />
            <Text style={styles.viewJobLinkText}>View Full Job Description</Text>
          </TouchableOpacity>
        </View>

        {/* Description Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Description Preview</Text>
          <Text style={styles.description} numberOfLines={5}>
            {jobDescription}
          </Text>
        </View>

        {/* Tailor Button */}
        {!tailoredResume && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Resume Tailoring</Text>
            <Text style={styles.infoText}>
              Our AI will analyze the job description and tailor your resume to:
            </Text>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
                <Text style={styles.featureText}>Match keywords and skills</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
                <Text style={styles.featureText}>Emphasize relevant experience</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
                <Text style={styles.featureText}>Align with company values</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.tailorButton, tailoring && styles.buttonDisabled]} 
              onPress={handleTailorResume}
              disabled={tailoring}
            >
              {tailoring ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#ffffff" />
                  <Text style={styles.tailorButtonText}>Tailor My Resume</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Tailored Resume Result */}
        {tailoredResume && (
          <View style={styles.section}>
            <View style={styles.successHeader}>
              <Ionicons name="checkmark-circle" size={32} color="#059669" />
              <Text style={styles.successTitle}>Resume Tailored Successfully!</Text>
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Content Preview</Text>
              <Text style={styles.previewText} numberOfLines={10}>
                {tailoredResume.content_preview}
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.downloadButton, downloading && styles.buttonDisabled]} 
              onPress={handleDownloadPDF}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="download" size={20} color="#ffffff" />
                  <Text style={styles.downloadButtonText}>Download PDF</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.newTailorButton}
              onPress={() => setTailoredResume(null)}
            >
              <Ionicons name="refresh" size={20} color="#6366f1" />
              <Text style={styles.newTailorButtonText}>Tailor Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  jobInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  company: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
    marginBottom: 16,
  },
  viewJobLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewJobLinkText: {
    color: '#6366f1',
    fontSize: 14,
    marginLeft: 4,
    textDecorationLine: 'underline',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  featureList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 8,
  },
  tailorButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  tailorButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 12,
  },
  previewCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  downloadButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  downloadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  newTailorButton: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newTailorButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});