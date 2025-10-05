import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/api';
import { RootStackParamList, CVDResults, UserProfile, TestQuestion } from '../types';

type HistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'History'>;

const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<HistoryScreenNavigationProp>();
  const [testResults, setTestResults] = useState<CVDResults[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedTest, setSelectedTest] = useState<CVDResults | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    try {
      // Load user profile
      const savedProfile = await AsyncStorage.getItem('userProfile');
      let userProfile = null;
      if (savedProfile) {
        userProfile = JSON.parse(savedProfile);
        setProfile(userProfile);
      }

      // Load test results - prioritize user-specific storage
      let results: CVDResults[] = [];
      
      // First try to get user-specific results
      if (userProfile && userProfile.user_id) {
        const userResults = await AsyncStorage.getItem(`cvd_results_${userProfile.user_id}`);
        if (userResults) {
          results = JSON.parse(userResults);
        }
      }
      
      // If no user-specific results, try legacy storage
      if (results.length === 0) {
        const savedResults = await AsyncStorage.getItem('cvdTestResults');
        
        if (savedResults) {
          results = JSON.parse(savedResults);
        }
      }
      
      // Also check for single latest result format
      if (results.length === 0) {
        const latestResults = await AsyncStorage.getItem('latestTestResults');
        if (latestResults) {
          const latestResult = JSON.parse(latestResults);
          results = [latestResult];
        }
      }
      
      // Sort by timestamp (newest first)
      if (results.length > 0) {
        results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
      
      setTestResults(results);
      
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert('Error', 'Failed to load test history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTestQuestions = async (testId: string) => {
    try {
      const savedQuestions = await AsyncStorage.getItem(`testQuestions_${testId}`);
      
      if (savedQuestions) {
        const questions = JSON.parse(savedQuestions);
        setTestQuestions(questions);
      } else {
        setTestQuestions([]);
      }
    } catch (error) {
      console.error('Error loading test questions:', error);
      setTestQuestions([]);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'none':
        return '#4CAF50';
      case 'mild':
        return '#FF9800';
      case 'moderate':
        return '#F44336';
      case 'severe':
        return '#D32F2F';
      default:
        return '#666';
    }
  };

  const getDominantDeficiency = (results: CVDResults): { type: string; score: number } => {
    const scores = [
      { type: 'Protanopia', score: results.protanopia },
      { type: 'Deuteranopia', score: results.deuteranopia },
      { type: 'Tritanopia', score: results.tritanopia },
    ];
    
    return scores.reduce((max, current) => current.score > max.score ? current : max);
  };

  const viewTestDetails = async (result: CVDResults) => {
    setSelectedTest(result);
    await loadTestQuestions(result.test_id);
    setShowDetailModal(true);
  };

  const getAnswerExplanation = (question: TestQuestion, userResponse: boolean, correctAnswer: boolean): string => {
    const isCorrect = userResponse === correctAnswer;
    const deficiencyType = question.filter_type;
    
    if (isCorrect) {
      if (correctAnswer) {
        return `✓ Correct! The images were indeed the same. This suggests normal color discrimination for ${deficiencyType} patterns.`;
      } else {
        return `✓ Correct! You successfully detected the difference between these images, showing good color vision for ${deficiencyType} patterns.`;
      }
    } else {
      if (correctAnswer && !userResponse) {
        return `✗ The images were actually the same, but you saw them as different. This could indicate some sensitivity in ${deficiencyType} color discrimination.`;
      } else {
        return `✗ These images were different, but you perceived them as the same. This suggests difficulty distinguishing ${deficiencyType} color patterns, which may indicate ${deficiencyType}.`;
      }
    }
  };

  const clearHistory = () => {
    console.log('clearHistory function called');
    
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all test history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            console.log('User confirmed clear history');
            try {
              setLoading(true);
              console.log('Starting history clear process...');
              
              // Get all keys and filter test-related ones
              const allKeys = await AsyncStorage.getAllKeys();
              const testKeys = allKeys.filter(key => 
                key.startsWith('testQuestions_') || 
                key.startsWith('cvd_results_') ||
                key.includes('cvdTestResults') ||
                key.includes('latestTestResults') ||
                key.includes('latest_cvd_result')
              );
              
              console.log('Test keys to remove:', testKeys);
              
              // Remove test-related keys
              if (testKeys.length > 0) {
                await AsyncStorage.multiRemove(testKeys);
                console.log('Test keys removed');
              }
              
              // Also remove legacy keys
              const legacyKeys = [
                'cvdTestResults',
                'latestTestResults', 
                'latest_cvd_result',
              ];
              
              await AsyncStorage.multiRemove(legacyKeys);
              console.log('Legacy keys removed');
              
              // Update UI immediately
              setTestResults([]);
              setSelectedTest(null);
              setTestQuestions([]);
              
              console.log('UI state updated');
              
              // Force reload
              await loadHistory();
              console.log('History reloaded');
              
              Alert.alert('Success', 'Test history cleared successfully.');
              console.log('Clear completed successfully');
              
            } catch (error) {
              console.error('Error clearing history:', error);
              Alert.alert('Error', 'Failed to clear history. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderHistoryItem = ({ item }: { item: CVDResults }) => {
    const dominant = getDominantDeficiency(item);
    
    return (
      <TouchableOpacity
        style={styles.historyItem}
        onPress={() => viewTestDetails(item)}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemDate}>{formatDate(item.timestamp)}</Text>
          <Text style={styles.itemTime}>{formatTime(item.timestamp)}</Text>
        </View>
        
        <View style={styles.itemContent}>
          <View style={styles.severityContainer}>
            <Text style={styles.severityLabel}>Overall Severity</Text>
            <Text style={[styles.severity, { color: getSeverityColor(item.overall_severity) }]}>
              {item.overall_severity.toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.dominantTypeContainer}>
            <Text style={styles.dominantTypeLabel}>Dominant Type</Text>
            <Text style={styles.dominantType}>{dominant.type}</Text>
            <Text style={styles.dominantScore}>{(dominant.score * 100).toFixed(0)}%</Text>
          </View>
        </View>
        
        <View style={styles.itemFooter}>
          <Text style={styles.scoresText}>
            P: {(item.protanopia * 100).toFixed(0)}% | D: {(item.deuteranopia * 100).toFixed(0)}% | T: {(item.tritanopia * 100).toFixed(0)}%
          </Text>
          <Text style={styles.viewDetailsText}>Tap to view details →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => (
    <Modal
      visible={showDetailModal}
      animationType="slide"
      presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Test Results Detail</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowDetailModal(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
        
        {selectedTest && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.resultsSummary}>
              <Text style={styles.resultsTitle}>Color Vision Assessment</Text>
              <Text style={styles.resultsDate}>{formatDate(selectedTest.timestamp)} at {formatTime(selectedTest.timestamp)}</Text>
              
              <View style={styles.scoresGrid}>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Protanopia (Red-blind)</Text>
                  <Text style={styles.scoreValue}>{(selectedTest.protanopia * 100).toFixed(0)}%</Text>
                </View>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Deuteranopia (Green-blind)</Text>
                  <Text style={styles.scoreValue}>{(selectedTest.deuteranopia * 100).toFixed(0)}%</Text>
                </View>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Tritanopia (Blue-blind)</Text>
                  <Text style={styles.scoreValue}>{(selectedTest.tritanopia * 100).toFixed(0)}%</Text>
                </View>
              </View>
              
              <View style={styles.overallResult}>
                <Text style={styles.overallLabel}>Overall Severity</Text>
                <Text style={[styles.overallValue, { color: getSeverityColor(selectedTest.overall_severity) }]}>
                  {selectedTest.overall_severity.toUpperCase()}
                </Text>
              </View>
            </View>
            
            {testQuestions.length > 0 && (
              <View style={styles.questionsSection}>
                <Text style={styles.sectionTitle}>Question by Question Analysis</Text>
                {testQuestions.map((question, index) => (
                  <View key={question.question_id} style={styles.questionItem}>
                    <Text style={styles.questionNumber}>Question {index + 1}</Text>
                    <Text style={styles.questionType}>Testing: {question.filter_type}</Text>
                    
                    <View style={styles.imageContainer}>
                      <View style={styles.imageGroup}>
                        <Text style={styles.imageLabel}>Original Image</Text>
                        <Image 
                          source={{ uri: question.image_original }} 
                          style={styles.testImage}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.imageGroup}>
                        <Text style={styles.imageLabel}>Filtered Image</Text>
                        <Image 
                          source={{ uri: question.image_filtered }} 
                          style={styles.testImage}
                          resizeMode="contain"
                        />
                      </View>
                    </View>
                    
                    <View style={styles.answerAnalysis}>
                      <Text style={styles.answerLabel}>Your Answer: {question.user_response ? 'Same' : 'Different'}</Text>
                      <Text style={styles.correctLabel}>Correct Answer: {question.correct_answer ? 'Same' : 'Different'}</Text>
                      <Text style={styles.explanation}>
                        {getAnswerExplanation(question, question.user_response || false, question.correct_answer)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Color Vision Tests Yet</Text>
      <Text style={styles.emptyStateText}>
        Take your first color vision test to see your results and history here.
      </Text>
      <TouchableOpacity
        style={styles.startTestButton}
        onPress={() => navigation.navigate('ColorTest')}>
        <Text style={styles.startTestButtonText}>Start Color Vision Test</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Test History</Text>
        {profile && (
          <Text style={styles.subtitle}>{profile.name}</Text>
        )}
      </View>

      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            console.log('Clear button pressed, testResults.length:', testResults.length);
            try {
              clearHistory();
            } catch (error) {
              console.error('Error calling clearHistory:', error);
            }
          }}>
          <Text style={styles.clearButtonText}>Clear History ({testResults.length})</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.clearButton, { backgroundColor: '#FF6B6B', marginLeft: 10 }]}
          onPress={() => {
            Alert.alert(
              'Reset App',
              'This will clear ALL data including your profile and return you to the welcome screen. Are you sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset Everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await AsyncStorage.clear();
                      Alert.alert('Reset Complete', 'Please restart the app to see the welcome screen.');
                    } catch (error) {
                      console.error('Error resetting app:', error);
                    }
                  }
                }
              ]
            );
          }}>
          <Text style={styles.clearButtonText}>Reset App</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={testResults}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.test_id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      
      {renderDetailModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerActions: {
    padding: 20,
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  clearButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    minHeight: 40,
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
  },
  historyItem: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  itemDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemTime: {
    fontSize: 14,
    color: '#666',
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  severityContainer: {
    alignItems: 'center',
  },
  severityLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  severity: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dominantTypeContainer: {
    alignItems: 'center',
  },
  dominantTypeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dominantType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  dominantScore: {
    fontSize: 12,
    color: '#666',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoresText: {
    fontSize: 12,
    color: '#666',
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  startTestButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  startTestButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  resultsSummary: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  resultsDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  scoresGrid: {
    marginBottom: 20,
  },
  scoreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  overallResult: {
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#f0f0f0',
  },
  overallLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  overallValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  questionsSection: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  questionItem: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  questionType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  imageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  imageGroup: {
    flex: 1,
    marginHorizontal: 5,
  },
  imageLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  testImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  answerAnalysis: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  correctLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  explanation: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
});

export default HistoryScreen;