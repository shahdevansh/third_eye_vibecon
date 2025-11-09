import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  description: string;
  url: string;
  posted_date?: string;
  salary?: string;
  relevance_score?: number;
}

export default function JobsScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const searchJobs = async () => {
    setSearching(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/jobs`);
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      const data = await response.json();
      setJobs(data.jobs || []);
      
      if (data.jobs.length === 0) {
        Alert.alert('No Jobs Found', 'No jobs found matching your criteria. Try adjusting your preferences.');
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      Alert.alert('Error', 'Failed to fetch jobs. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleTailorResume = (job: Job) => {
    router.push({
      pathname: '/tailor',
      params: {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        jobDescription: job.description,
        jobUrl: job.url
      }
    });
  };

  const openJobUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Failed to open job URL');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Job Search</Text>
          <Text style={styles.subtitle}>Top 3 AI-matched jobs with reasoning</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
      </View>

      {jobs.length === 0 && !searching && (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={64} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Find Your Dream Job</Text>
          <Text style={styles.emptySubtitle}>Search for the most relevant jobs posted in the last 24 hours</Text>
          <TouchableOpacity 
            style={styles.searchButton} 
            onPress={searchJobs}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="search" size={20} color="#ffffff" />
                <Text style={styles.searchButtonText}>Search Jobs</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {searching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Searching for jobs...</Text>
        </View>
      )}

      {jobs.length > 0 && (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>{jobs.length} jobs found</Text>
            <TouchableOpacity onPress={searchJobs} disabled={searching}>
              <Ionicons name="refresh" size={24} color="#6366f1" />
            </TouchableOpacity>
          </View>

          {jobs.map((job, index) => (
            <View key={job.id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                {job.posted_date && (
                  <View style={styles.timeBadge}>
                    <Ionicons name="time-outline" size={14} color="#059669" />
                    <Text style={styles.timeText}>{job.posted_date}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.company}>{job.company}</Text>
              
              {job.location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={16} color="#64748b" />
                  <Text style={styles.location}>{job.location}</Text>
                </View>
              )}

              {job.salary && (
                <View style={styles.salaryRow}>
                  <Ionicons name="cash-outline" size={16} color="#059669" />
                  <Text style={styles.salary}>{job.salary}</Text>
                </View>
              )}

              {/* Extract and display "Why Apply" reasoning if present */}
              {job.description && job.description.includes('**Why Apply:**') && (
                <View style={styles.reasoningBox}>
                  <View style={styles.reasoningHeader}>
                    <Ionicons name="checkmark-circle" size={18} color="#059669" />
                    <Text style={styles.reasoningTitle}>Why This Match?</Text>
                  </View>
                  <Text style={styles.reasoningText}>
                    {job.description.split('**Why Apply:**')[1].split('\n\n')[0].trim()}
                  </Text>
                </View>
              )}

              <Text style={styles.description} numberOfLines={job.description.includes('**Why Apply:**') ? 2 : 3}>
                {job.description.includes('**Why Apply:**') 
                  ? job.description.split('\n\n').slice(1).join('\n\n')
                  : job.description
                }
              </Text>

              {/* Job URL Display */}
              {job.url && (
                <TouchableOpacity 
                  style={styles.urlContainer}
                  onPress={() => openJobUrl(job.url)}
                >
                  <Ionicons name="link" size={14} color="#6366f1" />
                  <Text style={styles.urlText} numberOfLines={1}>
                    {job.url}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color="#6366f1" />
                </TouchableOpacity>
              )}

              {job.relevance_score && (
                <View style={styles.relevanceBar}>
                  <View style={[styles.relevanceFill, { width: `${job.relevance_score * 100}%` }]} />
                </View>
              )}

              <View style={styles.cardActions}>
                <TouchableOpacity 
                  style={styles.viewJobButton}
                  onPress={() => openJobUrl(job.url)}
                >
                  <Ionicons name="open-outline" size={16} color="#6366f1" />
                  <Text style={styles.viewJobText}>Apply Now</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.tailorButton}
                  onPress={() => handleTailorResume(job)}
                >
                  <Ionicons name="document-text-outline" size={16} color="#ffffff" />
                  <Text style={styles.tailorButtonText}>Tailor Resume</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
  },
  searchButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    minWidth: 200,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  jobCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankBadge: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rankText: {
    color: '#0284c7',
    fontWeight: '600',
    fontSize: 12,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  company: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  salary: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    marginLeft: 4,
  },
  reasoningBox: {
    backgroundColor: '#ecfdf5',
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  reasoningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  reasoningTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  reasoningText: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 18,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    gap: 6,
  },
  urlText: {
    flex: 1,
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  relevanceBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  relevanceFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  viewJobButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
  },
  viewJobText: {
    color: '#6366f1',
    fontWeight: '600',
    marginLeft: 4,
  },
  tailorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 8,
  },
  tailorButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 4,
  },
});