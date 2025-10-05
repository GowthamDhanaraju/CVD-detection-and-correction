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
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/api.micro';

interface TestQuestion {
  question_id: string;
  image_original: string;
  image_filtered: string;
  correct_answer: boolean;
}

interface TestData {
  test_id: string;
  test_type: string;
  questions: TestQuestion[];
}

const MicroTestScreen = () => {
  const [loading, setLoading] = useState(false);
  const [test, setTest] = useState<TestData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<{ [key: string]: boolean }>({});
  const [testCompleted, setTestCompleted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  useEffect(() => {
    // Auto-load test when screen loads
    initializeTest();
  }, []);

  const initializeTest = async () => {
    try {
      setLoading(true);
      setTestCompleted(false);
      setCurrentQuestionIndex(0);
      setResponses({});
      setShowInstructions(true);

      // Get or create user
      let currentUser = await AsyncStorage.getItem('userProfile');
      if (!currentUser) {
        const defaultUser = {
          user_id: `user_${Date.now()}`,
          name: 'Test User',
          age: 25,
          gender: 'other',
          email: 'test@example.com',
        };
        await AsyncStorage.setItem('userProfile', JSON.stringify(defaultUser));
      }

      // Get test questions from backend
      const response = await fetch('/api/test/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_type: 'ishihara',
          num_questions: 10, // Reduced for micro version
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get test questions: ${response.status}`);
      }

      const testData = await response.json();
      setTest(testData);
    } catch (error) {
      console.error('Error initializing test:', error);
      Alert.alert('Error', 'Failed to load test. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (response: boolean) => {
    if (!test || testCompleted) return;

    const currentQuestion = test.questions[currentQuestionIndex];
    const questionId = currentQuestion.question_id;

    try {
      // Submit response to backend
      await fetch('/api/test/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_id: test.test_id,
          question_id: questionId,
          response: response,
        }),
      });

      // Update local responses
      setResponses(prev => ({
        ...prev,
        [questionId]: response,
      }));

      // Move to next question or complete test
      if (currentQuestionIndex < test.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        await completeTest();
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      Alert.alert('Error', 'Failed to submit response. Please try again.');
    }
  };

  const completeTest = async () => {
    if (!test) return;

    try {
      setLoading(true);
      
      // Complete test and get results
      const response = await fetch('/api/test/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_id: test.test_id }),
      });

      if (!response.ok) {
        throw new Error(`Failed to complete test: ${response.status}`);
      }

      const results = await response.json();
      
      // Save results locally
      await AsyncStorage.setItem('latestTestResults', JSON.stringify(results));
      
      const existingResults = await AsyncStorage.getItem('cvdTestResults');
      const testHistory = existingResults ? JSON.parse(existingResults) : [];
      testHistory.push(results);
      await AsyncStorage.setItem('cvdTestResults', JSON.stringify(testHistory));

      setTestCompleted(true);
      
      // Show results
      Alert.alert(
        'Test Complete!',
        `Your CVD severity: ${results.overall_severity}\n\nProtanopia: ${Math.round((results.protanopia_severity || 0) * 100)}%\nDeuteranopia: ${Math.round((results.deuteranopia_severity || 0) * 100)}%\nTritanopia: ${Math.round((results.tritanopia_severity || 0) * 100)}%`,
        [
          { text: 'Take Another Test', onPress: initializeTest },
          { text: 'OK', style: 'default' },
        ]
      );
    } catch (error) {
      console.error('Error completing test:', error);
      Alert.alert('Error', 'Failed to complete test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {testCompleted ? 'Analyzing results...' : 'Loading test...'}
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

  if (showInstructions) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.instructionsHeader}>
          <Text style={styles.instructionsTitle}>CVD Detection Test</Text>
          <Text style={styles.instructionsSubtitle}>Micro Version - {test.questions.length} Questions</Text>
        </View>

        <View style={styles.instructionsContent}>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>
              You will see {test.questions.length} pairs of images with color patterns
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
              Tap "Different" if you can see any differences
            </Text>
          </View>

          <View style={styles.importantNote}>
            <Text style={styles.noteTitle}>Important:</Text>
            <Text style={styles.noteText}>
              • Ensure good lighting and screen brightness{'\n'}
              • Answer based on your first impression{'\n'}
              • The test takes approximately 2-3 minutes{'\n'}
              • Results will show personalized recommendations
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.startTestButton}
          onPress={() => setShowInstructions(false)}
        >
          <Text style={styles.startTestButtonText}>Start Test</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (testCompleted) {
    return (
      <View style={styles.completedContainer}>
        <Text style={styles.completedTitle}>🎉 Test Completed!</Text>
        <Text style={styles.completedText}>
          Your results have been saved and analyzed.
        </Text>
        <TouchableOpacity style={styles.newTestButton} onPress={initializeTest}>
          <Text style={styles.newTestButtonText}>Take Another Test</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQuestion = test.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / test.questions.length) * 100;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>CVD Detection Test</Text>
        <Text style={styles.subtitle}>
          Question {currentQuestionIndex + 1} of {test.questions.length}
        </Text>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>
          Do the original and filtered images look exactly the same to you?
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

      {/* Response Buttons */}
      <View style={styles.responseContainer}>
        <TouchableOpacity
          style={[styles.responseButton, styles.sameButton]}
          onPress={() => handleResponse(true)}
        >
          <Text style={styles.responseButtonText}>Yes, Same</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.responseButton, styles.differentButton]}
          onPress={() => handleResponse(false)}
        >
          <Text style={styles.responseButtonText}>No, Different</Text>
        </TouchableOpacity>
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
  instructionsHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionsSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  instructionsContent: {
    flex: 1,
    marginBottom: 30,
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
    lineHeight: 32,
    marginRight: 16,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
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
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  completedTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#28a745',
    textAlign: 'center',
    marginBottom: 20,
  },
  completedText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  newTestButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  newTestButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  imagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
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
    height: 180,
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
    flexDirection: 'row',
    gap: 15,
    justifyContent: 'center',
  },
  responseButton: {
    flex: 1,
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
});

export default MicroTestScreen;