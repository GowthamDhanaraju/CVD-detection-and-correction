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
  // Filter Performance Metrics (for model improvement)
  const [filterAccuracy, setFilterAccuracy] = useState<number>(0);
  const [colorCorrectionEffectiveness, setColorCorrectionEffectiveness] = useState<number>(0);
  const [overCorrectionLevel, setOverCorrectionLevel] = useState<number>(0);
  const [underCorrectionLevel, setUnderCorrectionLevel] = useState<number>(0);
  
  // Color-Specific Performance
  const [redGreenCorrection, setRedGreenCorrection] = useState<number>(0);
  const [blueYellowCorrection, setBlueYellowCorrection] = useState<number>(0);
  const [contrastImprovement, setContrastImprovement] = useState<number>(0);
  
  // Model Performance Assessment
  const [testAccuracyMatch, setTestAccuracyMatch] = useState<number>(0);
  const [severityDetectionAccuracy, setSeverityDetectionAccuracy] = useState<number>(0);
  const [cvdTypeDetectionAccuracy, setCvdTypeDetectionAccuracy] = useState<number>(0);
  
  // Technical Issues for Model Training
  const [specificColorIssues, setSpecificColorIssues] = useState<string>('');
  const [filterIntensityFeedback, setFilterIntensityFeedback] = useState<string>('');
  const [falsePositiveNotes, setFalsePositiveNotes] = useState<string>('');
  const [modelImprovementSuggestions, setModelImprovementSuggestions] = useState<string>('');
  
  // Environmental/Context Data for ML
  const [lightingConditions, setLightingConditions] = useState<string>('');
  const [deviceType, setDeviceType] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const resetForm = () => {
    setFilterAccuracy(0);
    setColorCorrectionEffectiveness(0);
    setOverCorrectionLevel(0);
    setUnderCorrectionLevel(0);
    setRedGreenCorrection(0);
    setBlueYellowCorrection(0);
    setContrastImprovement(0);
    setTestAccuracyMatch(0);
    setSeverityDetectionAccuracy(0);
    setCvdTypeDetectionAccuracy(0);
    setSpecificColorIssues('');
    setFilterIntensityFeedback('');
    setFalsePositiveNotes('');
    setModelImprovementSuggestions('');
    setLightingConditions('');
    setDeviceType('');
  };

  const handleSubmit = async () => {
    if (filterAccuracy === 0) {
      Alert.alert('Rating Required', 'Please provide a filter accuracy rating before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get user ID
      const userProfile = await AsyncStorage.getItem('userProfile');
      const userId = userProfile ? JSON.parse(userProfile).user_id : 'anonymous';

      // Create ML/Filter improvement focused feedback data
      const feedbackData: FeedbackData = {
        user_id: userId,
        page_name: pageName,
        feedback_type: 'comment',
        rating: filterAccuracy,
        comment: modelImprovementSuggestions.trim() || undefined,
        context: {
          ...context,
          // ML Training Data for Filter/Model Improvement
          ml_training_data: {
            // Filter Performance Metrics
            filter_performance: {
              accuracy_rating: filterAccuracy,
              color_correction_effectiveness: colorCorrectionEffectiveness,
              over_correction_level: overCorrectionLevel,
              under_correction_level: underCorrectionLevel,
            },
            // Color-Specific Performance
            color_performance: {
              red_green_correction: redGreenCorrection,
              blue_yellow_correction: blueYellowCorrection,
              contrast_improvement: contrastImprovement,
            },
            // Model Accuracy Assessment
            model_performance: {
              test_accuracy_match: testAccuracyMatch,
              severity_detection_accuracy: severityDetectionAccuracy,
              cvd_type_detection_accuracy: cvdTypeDetectionAccuracy,
            },
            // Technical Feedback for Model Training
            technical_feedback: {
              specific_color_issues: specificColorIssues.trim(),
              filter_intensity_feedback: filterIntensityFeedback.trim(),
              false_positive_notes: falsePositiveNotes.trim(),
              model_improvement_suggestions: modelImprovementSuggestions.trim(),
            },
            // Environmental Context for ML
            environmental_context: {
              lighting_conditions: lightingConditions,
              device_type: deviceType,
              test_environment: 'real_world_usage',
            },
            // User CVD Profile for Training Context
            user_cvd_profile: recentTestResults ? {
              cvd_type: recentTestResults.cvd_type,
              severity_levels: {
                protanopia: recentTestResults.protanopia_severity,
                deuteranopia: recentTestResults.deuteranopia_severity,
                tritanopia: recentTestResults.tritanopia_severity,
              },
              overall_severity: recentTestResults.overall_severity,
              test_accuracy: recentTestResults.accuracy_percentage,
            } : null,
            // Filter Usage Context
            filter_context: {
              selected_filter: context?.selectedFilter || 'unknown',
              filter_applied: context?.filterApplied || false,
              gan_filter_used: context?.selectedFilter === 'smart_ai_filter',
              filter_effectiveness_score: filterAccuracy,
            }
          }
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
        'Your technical feedback will help improve our AI model and filter algorithms!',
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
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRatingChange(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= currentRating ? 'star' : 'star-outline'}
              size={24}
              color={star <= currentRating ? '#FFD700' : '#CCCCCC'}
            />
          </TouchableOpacity>
        ))}
        <Text style={styles.ratingText}>{currentRating}/10</Text>
      </View>
    );
  };

  const renderFeedbackTypeButtons = () => {
    return null; // Removed multiple feedback types - single section only
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Filter & Model Feedback</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            {/* Filter Performance Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Filter Performance</Text>
              
              <View style={styles.ratingQuestion}>
                <Text style={styles.ratingLabel}>Filter Accuracy (1-10)</Text>
                {renderStarRating(filterAccuracy, setFilterAccuracy)}
              </View>

              <View style={styles.ratingQuestion}>
                <Text style={styles.ratingLabel}>Color Correction Effectiveness</Text>
                {renderStarRating(colorCorrectionEffectiveness, setColorCorrectionEffectiveness)}
              </View>

              <View style={styles.ratingQuestion}>
                <Text style={styles.ratingLabel}>Over-Correction Level (1=none, 10=too much)</Text>
                {renderStarRating(overCorrectionLevel, setOverCorrectionLevel)}
              </View>

              <View style={styles.ratingQuestion}>
                <Text style={styles.ratingLabel}>Under-Correction Level (1=none, 10=too little)</Text>
                {renderStarRating(underCorrectionLevel, setUnderCorrectionLevel)}
              </View>
            </View>

            {/* Color-Specific Performance */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Color-Specific Performance</Text>
              
              <View style={styles.ratingQuestion}>
                <Text style={styles.ratingLabel}>Red-Green Correction Quality</Text>
                {renderStarRating(redGreenCorrection, setRedGreenCorrection)}
              </View>

              <View style={styles.ratingQuestion}>
                <Text style={styles.ratingLabel}>Blue-Yellow Correction Quality</Text>
                {renderStarRating(blueYellowCorrection, setBlueYellowCorrection)}
              </View>

              <View style={styles.ratingQuestion}>
                <Text style={styles.ratingLabel}>Contrast Improvement</Text>
                {renderStarRating(contrastImprovement, setContrastImprovement)}
              </View>
            </View>

            {/* Model Performance Assessment */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Model Accuracy Assessment</Text>
              
              <View style={styles.ratingQuestion}>
                <Text style={styles.ratingLabel}>Test Results Match Reality</Text>
                {renderStarRating(testAccuracyMatch, setTestAccuracyMatch)}
              </View>

              <View style={styles.ratingQuestion}>
                <Text style={styles.ratingLabel}>Severity Detection Accuracy</Text>
                {renderStarRating(severityDetectionAccuracy, setSeverityDetectionAccuracy)}
              </View>

              <View style={styles.ratingQuestion}>
                <Text style={styles.ratingLabel}>CVD Type Detection Accuracy</Text>
                {renderStarRating(cvdTypeDetectionAccuracy, setCvdTypeDetectionAccuracy)}
              </View>
            </View>

            {/* Environmental Context */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Environment & Context</Text>
              
              <Text style={styles.questionLabel}>Lighting Conditions</Text>
              <View style={styles.optionsContainer}>
                {['Bright sunlight', 'Indoor fluorescent', 'LED lights', 'Dim lighting', 'Mixed lighting'].map((condition) => (
                  <TouchableOpacity
                    key={condition}
                    style={[styles.optionButton, lightingConditions === condition && styles.optionButtonActive]}
                    onPress={() => setLightingConditions(condition)}
                  >
                    <Text style={[styles.optionText, lightingConditions === condition && styles.optionTextActive]}>
                      {condition}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.questionLabel}>Device Type</Text>
              <View style={styles.optionsContainer}>
                {['iPhone', 'Android phone', 'Tablet', 'Other'].map((device) => (
                  <TouchableOpacity
                    key={device}
                    style={[styles.optionButton, deviceType === device && styles.optionButtonActive]}
                    onPress={() => setDeviceType(device)}
                  >
                    <Text style={[styles.optionText, deviceType === device && styles.optionTextActive]}>
                      {device}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Technical Feedback */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Technical Issues</Text>
              
              <Text style={styles.questionLabel}>Specific Color Issues</Text>
              <TextInput
                style={styles.commentInput}
                multiline
                numberOfLines={2}
                placeholder="Which colors are still difficult to distinguish? Be specific..."
                value={specificColorIssues}
                onChangeText={setSpecificColorIssues}
                textAlignVertical="top"
              />

              <Text style={styles.questionLabel}>Filter Intensity Feedback</Text>
              <TextInput
                style={styles.commentInput}
                multiline
                numberOfLines={2}
                placeholder="Is the filter too strong, too weak, or just right?"
                value={filterIntensityFeedback}
                onChangeText={setFilterIntensityFeedback}
                textAlignVertical="top"
              />

              <Text style={styles.questionLabel}>False Positive Notes</Text>
              <TextInput
                style={styles.commentInput}
                multiline
                numberOfLines={2}
                placeholder="Did the test incorrectly identify your CVD type or severity?"
                value={falsePositiveNotes}
                onChangeText={setFalsePositiveNotes}
                textAlignVertical="top"
              />

              <Text style={styles.questionLabel}>Model Improvement Suggestions</Text>
              <TextInput
                style={styles.commentInput}
                multiline
                numberOfLines={3}
                placeholder="How can we improve the AI model and filter algorithms?"
                value={modelImprovementSuggestions}
                onChangeText={setModelImprovementSuggestions}
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
                {isSubmitting ? 'Submitting...' : 'Submit Technical Feedback'}
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
        <Ionicons name="chatbubble-outline" size={14} color="#FFFFFF" />
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
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  feedbackButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 3,
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
  ratingQuestion: {
    marginVertical: 8,
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    marginTop: 10,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
  },
  optionButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  optionText: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  ratingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666666',
    fontWeight: '600',
  },
});

export default FeedbackModal;