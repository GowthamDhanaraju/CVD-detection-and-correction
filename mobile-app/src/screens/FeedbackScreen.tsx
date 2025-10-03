import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/api';
import { FeedbackData } from '../types';

interface FeedbackScreenProps {
  route: {
    params: {
      pageName: string;
      context?: any;
      nextScreen?: string;
    };
  };
}

const FeedbackScreen: React.FC<FeedbackScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const { pageName, context, nextScreen } = route.params;
  
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [quickFeedback, setQuickFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const quickFeedbackOptions = [
    { id: 'excellent', text: '😍 Excellent!', emoji: '😍' },
    { id: 'good', text: '😊 Good', emoji: '😊' },
    { id: 'okay', text: '😐 Okay', emoji: '😐' },
    { id: 'confusing', text: '😕 Confusing', emoji: '😕' },
    { id: 'broken', text: '😞 Something broken', emoji: '😞' },
  ];

  const handleQuickFeedback = async (feedbackType: string, rating: number) => {
    setIsSubmitting(true);

    try {
      // Get user ID
      const userProfile = await AsyncStorage.getItem('userProfile');
      const userId = userProfile ? JSON.parse(userProfile).user_id : 'anonymous';

      // Create feedback data
      const feedbackData: FeedbackData = {
        user_id: userId,
        page_name: pageName,
        feedback_type: 'rating',
        rating: rating,
        comment: feedbackType,
        user_experience: {
          ease_of_use: rating,
          accuracy: rating,
          usefulness: rating,
        },
        context: context,
        timestamp: new Date().toISOString(),
        device_info: {
          platform: 'mobile',
          os_version: '1.0',
          app_version: '1.0.0',
        },
      };

      // Submit feedback
      await ApiService.submitFeedback(feedbackData);

      // Navigate to next screen or back
      if (nextScreen) {
        navigation.navigate(nextScreen as never);
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert(
        'Submission Failed',
        'Could not submit feedback. You can still continue.',
        [
          { 
            text: 'Continue', 
            onPress: () => {
              if (nextScreen) {
                navigation.navigate(nextScreen as never);
              } else {
                navigation.goBack();
              }
            } 
          }
        ]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (nextScreen) {
      navigation.navigate(nextScreen as never);
    } else {
      navigation.goBack();
    }
  };

  const handleDetailedFeedback = () => {
    // Open the detailed feedback modal (you can implement this later)
    Alert.alert('Detailed Feedback', 'Detailed feedback form coming soon!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="chatbubble-ellipses" size={60} color="#2196F3" />
          </View>

          <Text style={styles.title}>How was your experience?</Text>
          <Text style={styles.subtitle}>
            Help us improve the {pageName.replace('_', ' ')} experience
          </Text>

          {/* Quick Feedback Options */}
          <View style={styles.feedbackOptions}>
            {quickFeedbackOptions.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.feedbackOption,
                  quickFeedback === option.id && styles.selectedOption,
                  isSubmitting && styles.disabledOption,
                ]}
                onPress={() => handleQuickFeedback(option.id, 5 - index)}
                disabled={isSubmitting}
              >
                <Text style={styles.feedbackEmoji}>{option.emoji}</Text>
                <Text style={[
                  styles.feedbackText,
                  quickFeedback === option.id && styles.selectedText,
                ]}>
                  {option.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Additional Options */}
          <View style={styles.additionalOptions}>
            <TouchableOpacity
              style={styles.detailedButton}
              onPress={handleDetailedFeedback}
              disabled={isSubmitting}
            >
              <Ionicons name="create-outline" size={20} color="#2196F3" />
              <Text style={styles.detailedButtonText}>Give detailed feedback</Text>
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {isSubmitting && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Submitting feedback...</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Your feedback is sent securely and helps improve the app for everyone
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  skipButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  skipText: {
    color: '#666666',
    fontSize: 16,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  feedbackOptions: {
    width: '100%',
    marginBottom: 30,
  },
  feedbackOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  disabledOption: {
    opacity: 0.6,
  },
  feedbackEmoji: {
    fontSize: 24,
    marginRight: 15,
  },
  feedbackText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  selectedText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  additionalOptions: {
    width: '100%',
    alignItems: 'center',
  },
  detailedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  detailedButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666666',
    fontSize: 14,
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
  },
});

export default FeedbackScreen;