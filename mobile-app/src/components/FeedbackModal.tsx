import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/api';
import { FeedbackData } from '../types';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  pageName: string;
  context?: any;
  filterDetails?: {
    selectedFilter?: any;
    filterParams?: any;
    needsMoreBlue?: boolean;
    needsMoreRed?: boolean;
    needsMoreGreen?: boolean;
  };
  recentTestResults?: any;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  onClose,
  pageName,
  context,
  filterDetails,
  recentTestResults,
}) => {
  const [feedbackType, setFeedbackType] = useState<'rating' | 'comment' | 'bug_report' | 'feature_request'>('rating');
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [easeOfUse, setEaseOfUse] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [usefulness, setUsefulness] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Filter-specific feedback states
  const [needsMoreBlue, setNeedsMoreBlue] = useState<boolean>(false);
  const [needsMoreRed, setNeedsMoreRed] = useState<boolean>(false);
  const [needsMoreGreen, setNeedsMoreGreen] = useState<boolean>(false);
  const [filterRating, setFilterRating] = useState<number>(0);
  const [filterComment, setFilterComment] = useState<string>('');

  const resetForm = () => {
    setFeedbackType('rating');
    setRating(0);
    setComment('');
    setEaseOfUse(0);
    setAccuracy(0);
    setUsefulness(0);
    setNeedsMoreBlue(false);
    setNeedsMoreRed(false);
    setNeedsMoreGreen(false);
    setFilterRating(0);
    setFilterComment('');
  };

  const handleSubmit = async () => {
    if (feedbackType === 'rating' && rating === 0) {
      Alert.alert('Rating Required', 'Please provide a rating before submitting.');
      return;
    }

    if ((feedbackType === 'comment' || feedbackType === 'bug_report' || feedbackType === 'feature_request') && !comment.trim()) {
      Alert.alert('Comment Required', 'Please provide a comment before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get user ID
      const userProfile = await AsyncStorage.getItem('userProfile');
      const userId = userProfile ? JSON.parse(userProfile).user_id : 'anonymous';

      // Create feedback data
      const feedbackData: FeedbackData = {
        user_id: userId,
        page_name: pageName,
        feedback_type: feedbackType,
        rating: feedbackType === 'rating' ? rating : undefined,
        comment: comment.trim() || undefined,
        user_experience: feedbackType === 'rating' ? {
          ease_of_use: easeOfUse,
          accuracy: accuracy,
          usefulness: usefulness,
        } : undefined,
        context: {
          ...context,
          // Include filter details if on camera filter page
          filter_feedback: pageName === 'camera_filter' ? {
            selected_filter: filterDetails?.selectedFilter,
            filter_params: filterDetails?.filterParams,
            needs_more_blue: needsMoreBlue,
            needs_more_red: needsMoreRed,
            needs_more_green: needsMoreGreen,
            filter_rating: filterRating,
            filter_comment: filterComment.trim() || undefined,
          } : undefined,
          // Include recent test results for analysis
          recent_test_results: recentTestResults,
        },
        timestamp: new Date().toISOString(),
        device_info: {
          platform: Platform.OS,
          os_version: Platform.Version.toString(),
          app_version: '1.0.0',
        },
      };

      // Submit feedback
      await ApiService.submitFeedback(feedbackData);

      Alert.alert(
        'Thank You!',
        'Your feedback has been submitted successfully. It helps us improve the app!',
        [{ text: 'OK', onPress: () => { resetForm(); onClose(); } }]
      );
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert(
        'Submission Failed',
        'Could not submit feedback. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarRating = (currentRating: number, onRatingChange: (rating: number) => void) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRatingChange(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= currentRating ? 'star' : 'star-outline'}
              size={30}
              color={star <= currentRating ? '#FFD700' : '#CCCCCC'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderFeedbackTypeButtons = () => {
    const types = [
      { key: 'rating', label: 'Rate Experience', icon: 'star' },
      { key: 'comment', label: 'General Comment', icon: 'chatbubble' },
      { key: 'bug_report', label: 'Report Bug', icon: 'bug' },
      { key: 'feature_request', label: 'Request Feature', icon: 'bulb' },
    ] as const;

    return (
      <View style={styles.typeButtonContainer}>
        {types.map((type) => (
          <TouchableOpacity
            key={type.key}
            style={[
              styles.typeButton,
              feedbackType === type.key && styles.typeButtonActive,
            ]}
            onPress={() => setFeedbackType(type.key)}
          >
            <Ionicons
              name={type.icon as any}
              size={20}
              color={feedbackType === type.key ? '#FFFFFF' : '#2196F3'}
            />
            <Text style={[
              styles.typeButtonText,
              feedbackType === type.key && styles.typeButtonTextActive,
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Feedback - {pageName}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            {/* Feedback Type Selection */}
            <Text style={styles.sectionTitle}>What type of feedback?</Text>
            {renderFeedbackTypeButtons()}

            {/* Rating Section */}
            {feedbackType === 'rating' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Overall Rating</Text>
                {renderStarRating(rating, setRating)}

                <Text style={styles.sectionTitle}>Detailed Experience</Text>
                
                <View style={styles.detailedRating}>
                  <Text style={styles.ratingLabel}>Ease of Use</Text>
                  {renderStarRating(easeOfUse, setEaseOfUse)}
                </View>

                <View style={styles.detailedRating}>
                  <Text style={styles.ratingLabel}>Accuracy</Text>
                  {renderStarRating(accuracy, setAccuracy)}
                </View>

                <View style={styles.detailedRating}>
                  <Text style={styles.ratingLabel}>Usefulness</Text>
                  {renderStarRating(usefulness, setUsefulness)}
                </View>
              </View>
            )}

            {/* Filter-specific feedback section */}
            {pageName === 'camera_filter' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Filter Performance</Text>
                
                <View style={styles.detailedRating}>
                  <Text style={styles.ratingLabel}>How well does this filter work for you?</Text>
                  {renderStarRating(filterRating, setFilterRating)}
                </View>

                <Text style={styles.sectionTitle}>Color Adjustments Needed</Text>
                <Text style={styles.subtitle}>Check if you need more of any color:</Text>
                
                <View style={styles.colorAdjustmentContainer}>
                  <TouchableOpacity
                    style={[styles.colorButton, needsMoreBlue && styles.colorButtonActive]}
                    onPress={() => setNeedsMoreBlue(!needsMoreBlue)}
                  >
                    <View style={[styles.colorIndicator, { backgroundColor: '#007AFF' }]} />
                    <Text style={[styles.colorButtonText, needsMoreBlue && styles.colorButtonTextActive]}>
                      Need More Blue
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.colorButton, needsMoreRed && styles.colorButtonActive]}
                    onPress={() => setNeedsMoreRed(!needsMoreRed)}
                  >
                    <View style={[styles.colorIndicator, { backgroundColor: '#FF3B30' }]} />
                    <Text style={[styles.colorButtonText, needsMoreRed && styles.colorButtonTextActive]}>
                      Need More Red
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.colorButton, needsMoreGreen && styles.colorButtonActive]}
                    onPress={() => setNeedsMoreGreen(!needsMoreGreen)}
                  >
                    <View style={[styles.colorIndicator, { backgroundColor: '#34C759' }]} />
                    <Text style={[styles.colorButtonText, needsMoreGreen && styles.colorButtonTextActive]}>
                      Need More Green
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Filter Comments</Text>
                <TextInput
                  style={styles.commentInput}
                  multiline
                  numberOfLines={3}
                  placeholder="How can we improve this filter for you?"
                  value={filterComment}
                  onChangeText={setFilterComment}
                  textAlignVertical="top"
                />
              </View>
            )}

            {/* Comment Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {feedbackType === 'bug_report' 
                  ? 'Describe the bug you encountered:'
                  : feedbackType === 'feature_request'
                  ? 'Describe the feature you would like:'
                  : 'Additional comments (optional):'
                }
              </Text>
              <TextInput
                style={styles.commentInput}
                multiline
                numberOfLines={4}
                placeholder={
                  feedbackType === 'bug_report'
                    ? 'What happened? What did you expect? Steps to reproduce...'
                    : feedbackType === 'feature_request'
                    ? 'What feature would improve your experience?'
                    : 'Tell us about your experience...'
                }
                value={comment}
                onChangeText={setComment}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Feedback Button Component
interface FeedbackButtonProps {
  pageName: string;
  context?: any;
  style?: any;
  filterDetails?: {
    selectedFilter?: any;
    filterParams?: any;
    needsMoreBlue?: boolean;
    needsMoreRed?: boolean;
    needsMoreGreen?: boolean;
  };
  recentTestResults?: any;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  pageName,
  context,
  style,
  filterDetails,
  recentTestResults,
}) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.feedbackButton, style]}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
        <Text style={styles.feedbackButtonText}>Feedback</Text>
      </TouchableOpacity>

      <FeedbackModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        pageName={pageName}
        context={context}
        filterDetails={filterDetails}
        recentTestResults={recentTestResults}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  closeButton: {
    padding: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 10,
    marginTop: 15,
  },
  typeButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
    backgroundColor: '#FFFFFF',
  },
  typeButtonActive: {
    backgroundColor: '#2196F3',
  },
  typeButtonText: {
    marginLeft: 5,
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 15,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  starButton: {
    padding: 5,
  },
  detailedRating: {
    marginVertical: 10,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 5,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  feedbackButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 10,
  },
  colorAdjustmentContainer: {
    gap: 10,
    marginBottom: 15,
  },
  colorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
  },
  colorButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  colorButtonText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  colorButtonTextActive: {
    color: '#2196F3',
  },
});

export default FeedbackModal;