import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import ApiService from '../services/api';
import { RootStackParamList, FeedbackData } from '../types';

type FeedbackScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Feedback'>;
type FeedbackScreenRouteProp = RouteProp<RootStackParamList, 'Feedback'>;

const FeedbackScreen: React.FC = () => {
  const navigation = useNavigation<FeedbackScreenNavigationProp>();
  const route = useRoute<FeedbackScreenRouteProp>();
  const { prediction } = route.params;

  const [feedbackType, setFeedbackType] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [comments, setComments] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const feedbackTypes = [
    { id: 'accuracy', label: 'Assessment Accuracy', description: 'How accurate was the assessment?' },
    { id: 'usefulness', label: 'Recommendations', description: 'How useful were the recommendations?' },
    { id: 'experience', label: 'User Experience', description: 'How was your overall experience?' },
    { id: 'other', label: 'Other', description: 'General feedback or suggestions' },
  ];

  const submitFeedback = async () => {
    if (!feedbackType) {
      Alert.alert('Error', 'Please select a feedback type.');
      return;
    }

    if (rating === 0) {
      Alert.alert('Error', 'Please provide a rating.');
      return;
    }

    setLoading(true);
    try {
      const feedback: FeedbackData = {
        user_id: prediction.user_id,
        prediction_id: prediction.prediction_id || 'unknown',
        feedback_type: feedbackType,
        rating,
        comments: comments.trim() || undefined,
      };

      await ApiService.submitFeedback(feedback);

      Alert.alert(
        'Thank You!',
        'Your feedback has been submitted successfully. It helps us improve our service.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Feedback submission failed:', error);
      Alert.alert(
        'Error',
        'Failed to submit feedback. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          style={styles.starButton}
          onPress={() => setRating(i)}>
          <Text style={[styles.star, rating >= i && styles.filledStar]}>
            ★
          </Text>
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const getRatingText = (rating: number): string => {
    switch (rating) {
      case 1: return 'Very Poor';
      case 2: return 'Poor';
      case 3: return 'Average';
      case 4: return 'Good';
      case 5: return 'Excellent';
      default: return '';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Provide Feedback</Text>
        <Text style={styles.subtitle}>
          Help us improve our CVD assessment service
        </Text>
      </View>

      <View style={styles.content}>
        {/* Assessment Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Assessment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Risk Score:</Text>
            <Text style={styles.summaryValue}>{prediction.risk_score}%</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Risk Level:</Text>
            <Text style={styles.summaryValue}>{prediction.risk_level}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date:</Text>
            <Text style={styles.summaryValue}>
              {new Date(prediction.timestamp).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Feedback Type Selection */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>What would you like to provide feedback on? *</Text>
          {feedbackTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.feedbackTypeOption,
                feedbackType === type.id && styles.selectedFeedbackType,
              ]}
              onPress={() => setFeedbackType(type.id)}>
              <Text
                style={[
                  styles.feedbackTypeLabel,
                  feedbackType === type.id && styles.selectedFeedbackTypeLabel,
                ]}>
                {type.label}
              </Text>
              <Text
                style={[
                  styles.feedbackTypeDescription,
                  feedbackType === type.id && styles.selectedFeedbackTypeDescription,
                ]}>
                {type.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Rating */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>How would you rate this? *</Text>
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {renderStars()}
            </View>
            {rating > 0 && (
              <Text style={styles.ratingText}>
                {rating}/5 - {getRatingText(rating)}
              </Text>
            )}
          </View>
        </View>

        {/* Comments */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Additional Comments (Optional)</Text>
          <TextInput
            style={styles.commentsInput}
            value={comments}
            onChangeText={setComments}
            placeholder="Share your thoughts, suggestions, or specific feedback..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.helpText}>
            Your detailed feedback helps us improve the accuracy and usefulness of our assessments.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={submitFeedback}
          disabled={loading}>
          {loading ? (
            <View style={styles.loadingButton}>
              <ActivityIndicator color="white" size="small" />
              <Text style={styles.loadingButtonText}>Submitting...</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Submit Feedback</Text>
          )}
        </TouchableOpacity>

        {/* Privacy Note */}
        <View style={styles.privacyNote}>
          <Text style={styles.privacyText}>
            Your feedback is anonymous and will be used only to improve our service. 
            We do not share personal feedback with third parties.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  sectionCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  feedbackTypeOption: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedFeedbackType: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  feedbackTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedFeedbackTypeLabel: {
    color: '#007AFF',
  },
  feedbackTypeDescription: {
    fontSize: 14,
    color: '#666',
  },
  selectedFeedbackTypeDescription: {
    color: '#1976D2',
  },
  ratingContainer: {
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  starButton: {
    padding: 5,
  },
  star: {
    fontSize: 32,
    color: '#ddd',
  },
  filledStar: {
    color: '#FFD700',
  },
  ratingText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  commentsInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#333',
    height: 100,
    marginBottom: 10,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  privacyNote: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  privacyText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});

export default FeedbackScreen;