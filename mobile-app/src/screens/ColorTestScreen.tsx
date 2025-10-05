import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ColorVisionTest, TestQuestion, CVDResults } from '../types';
import apiService from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ColorTestScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [test, setTest] = useState<ColorVisionTest | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<{ [key: string]: boolean }>({});
  const [testCompleted, setTestCompleted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isCompletingTest, setIsCompletingTest] = useState(false);

  useEffect(() => {
    initializeTest();
  }, []);

  // Reset test when screen comes into focus (user navigates back to this screen)
  // But NOT when we're in the middle of completing a test or when test is completed
  useFocusEffect(
    React.useCallback(() => {
      // Don't reset if we're currently completing the test or if test is already completed
      if (testCompleted || isCompletingTest) {
        return;
      }
      
      // Always start a fresh test when this screen comes into focus
      setCurrentQuestionIndex(0);
      setResponses({});
      setTestCompleted(false);
      setTest(null);
      setShowInstructions(true);
      initializeTest();
    }, [testCompleted, isCompletingTest])
  );

  const initializeTest = async () => {
    try {
      setLoading(true);
      
      // Get current user or create a default one
      let currentUserData = await AsyncStorage.getItem('userProfile');
      let currentUser = currentUserData ? JSON.parse(currentUserData) : null;
      
      if (!currentUser) {
        // Create a default user for testing
        currentUser = {
          user_id: `user_${Date.now()}`,
          name: 'Test User',
          age: 25,
          gender: 'other',
          email: 'test@example.com',
          previous_tests: []
        };
        
        // Save the default user
        await AsyncStorage.setItem('userProfile', JSON.stringify(currentUser));
        console.log('Created default user:', currentUser);
      }

      // Generate test questions
      const testData = await apiService.getTestQuestions('ishihara', 20);
      console.log('Test data received:', testData);
      
      // Create test object with user_id
      const test: ColorVisionTest = {
        test_id: testData.test_id,
        user_id: currentUser.user_id,
        test_type: testData.test_type || 'ishihara',
        questions: testData.questions || [],
        completed: testData.completed || false,
        timestamp: testData.timestamp || new Date().toISOString()
      };
      
      setTest(test);
    } catch (error) {
      console.error('Error initializing test:', error);
      Alert.alert('Error', 'Failed to load test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (response: boolean) => {
    if (!test || !test.questions[currentQuestionIndex] || isCompletingTest) return;

    const currentQuestion = test.questions[currentQuestionIndex];
    const questionId = currentQuestion.question_id;

    try {
      // Submit response to API
      await apiService.submitTestResponse(test.test_id!, questionId, response);
      
      // Update local responses
      setResponses(prev => ({
        ...prev,
        [questionId]: response
      }));

      // Move to next question or complete test
      if (currentQuestionIndex < test.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        // This was the last question, complete the test
        await completeTest();
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      Alert.alert('Error', 'Failed to submit response. Please try again.');
    }
  };

  const completeTest = async () => {
    if (!test || isCompletingTest) {
      return;
    }

    try {
      setIsCompletingTest(true);
      setLoading(true);
      
      // Complete test and get results
      const results = await apiService.completeTest(test.test_id!);
      
      // Save results locally for history
      const existingResults = await AsyncStorage.getItem('cvdTestResults');
      const testHistory = existingResults ? JSON.parse(existingResults) : [];
      testHistory.push(results);
      await AsyncStorage.setItem('cvdTestResults', JSON.stringify(testHistory));
      
      // Save test questions with responses for detailed history
      const questionsWithResponses = test.questions.map(question => ({
        ...question,
        user_response: responses[question.question_id]
      }));
      await AsyncStorage.setItem(`testQuestions_${test.test_id}`, JSON.stringify(questionsWithResponses));
      
      // Save latest results for immediate navigation
      await AsyncStorage.setItem('latestTestResults', JSON.stringify(results));
      
      // Mark test as completed before navigation
      setTestCompleted(true);
      
      // Small delay to ensure state is set before navigation
      setTimeout(() => {
        // Navigate to results
        (navigation as any).navigate('Results', { results });
      }, 100);
      
    } catch (error) {
      console.error('Error completing test:', error);
      Alert.alert('Error', 'Failed to complete test. Please try again.');
      // Reset completion flags on error
      setIsCompletingTest(false);
      setTestCompleted(false);
    } finally {
      setLoading(false);
    }
  };

  const restartTest = () => {
    setCurrentQuestionIndex(0);
    setResponses({});
    setTestCompleted(false);
    initializeTest();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {isCompletingTest ? 'Analyzing results...' : testCompleted ? 'Analyzing results...' : 'Loading test...'}
        </Text>
      </View>
    );
  }

  if (!test) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load test</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeTest}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show instructions before starting the test
  if (showInstructions) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.instructionsContainer}>
        <View style={styles.instructionsHeader}>
          <Text style={styles.instructionsTitle}>Color Vision Test Instructions</Text>
          <Text style={styles.instructionsSubtitle}>Advanced CVD Detection Test</Text>
        </View>

        <View style={styles.instructionsContent}>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>
              You will see 10 pairs of images with real-world color patterns
            </Text>
          </View>

          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>
              Compare the original image (left) with the filtered image (right)
            </Text>
          </View>

          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>
              Tap "Same" if both images look identical to you
            </Text>
          </View>

          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepText}>
              Tap "Different" if you can see any differences between the images
            </Text>
          </View>

          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>5</Text>
            <Text style={styles.stepText}>
              The test uses AI-powered filters to detect specific color vision deficiencies
            </Text>
          </View>

          <View style={styles.importantNote}>
            <Text style={styles.noteTitle}>Important:</Text>
            <Text style={styles.noteText}>
              • Ensure good lighting and screen brightness{'\n'}
              • Hold your device at arm's length{'\n'}
              • Answer based on your first impression{'\n'}
              • The test takes approximately 2-3 minutes{'\n'}
              • Results will show personalized filter recommendations
            </Text>
          </View>
        </View>

        <View style={styles.instructionsFooter}>
          <TouchableOpacity 
            style={styles.startTestButton}
            onPress={() => setShowInstructions(false)}
          >
            <Text style={styles.startTestButtonText}>Start Test</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const currentQuestion = test.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / test.questions.length) * 100;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Advanced CVD Detection Test</Text>
        <Text style={styles.subtitle}>
          Question {currentQuestionIndex + 1} of {test.questions.length}
        </Text>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>Instructions:</Text>
        <Text style={styles.instructionsText}>
          Compare the original image (left) with the filtered image (right). 
          Do they look exactly the same to you, or can you see any differences?
        </Text>
      </View>

      {/* Images */}
      <View style={styles.imagesContainer}>
        <View style={styles.imageWrapper}>
          <Text style={styles.imageLabel}>Original</Text>
          <Image
            source={{ uri: currentQuestion.image_original }}
            style={styles.testImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.imageWrapper}>
          <Text style={styles.imageLabel}>Filtered</Text>
          <Image
            source={{ uri: currentQuestion.image_filtered }}
            style={styles.testImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Question */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>
          Do the original and filtered images look exactly the same to you?
        </Text>
      </View>

      {/* Response Buttons */}
      <View style={styles.responseContainer}>
        <TouchableOpacity
          style={[styles.responseButton, styles.sameButton]}
          onPress={() => handleResponse(true)}
        >
          <Text style={styles.responseButtonText}>Yes, they look the same</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.responseButton, styles.differentButton]}
          onPress={() => handleResponse(false)}
        >
          <Text style={styles.responseButtonText}>No, they look different</Text>
        </TouchableOpacity>
      </View>

      {/* Help Section */}
      <View style={styles.helpContainer}>
        <Text style={styles.helpTitle}>Need Help?</Text>
        <Text style={styles.helpText}>
          • Take your time to examine both images
          • Answer based on your first impression
          • There are no "right" or "wrong" answers
          • The test adapts to your responses
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  progressContainer: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 3,
  },
  instructionsContainer: {
    padding: 20,
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
  },
  instructionsHeader: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionsSubtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  instructionsContent: {
    flex: 1,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#007AFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    textAlign: 'center',
    textAlignVertical: 'center',
    marginRight: 16,
    lineHeight: 32,
  },
  stepText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    lineHeight: 22,
  },
  importantNote: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  instructionsFooter: {
    paddingTop: 30,
    paddingBottom: 20,
  },
  startTestButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  startTestButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  instructionsText: {
    fontSize: 14,
    color: '#1565c0',
    lineHeight: 20,
  },
  imagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  imageWrapper: {
    flex: 0.48,
    alignItems: 'center',
  },
  imageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  testImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  questionContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  responseContainer: {
    gap: 12,
    marginBottom: 30,
  },
  responseButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sameButton: {
    backgroundColor: '#28a745',
  },
  differentButton: {
    backgroundColor: '#dc3545',
  },
  responseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  helpContainer: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
});

export default ColorTestScreen;