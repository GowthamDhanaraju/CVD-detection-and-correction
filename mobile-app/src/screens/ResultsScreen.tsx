import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, CVDResults } from '../types';

type ResultsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Results'>;
type ResultsScreenRouteProp = RouteProp<RootStackParamList, 'Results'>;

const ResultsScreen: React.FC = () => {
  const navigation = useNavigation<ResultsScreenNavigationProp>();
  const route = useRoute<ResultsScreenRouteProp>();
  const { results } = route.params;

  const getSeverityColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'none':
        return '#4CAF50';
      case 'mild':
        return '#FFC107';
      case 'moderate':
        return '#FF9800';
      case 'severe':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const getSeverityIcon = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'none':
        return '✓';
      case 'mild':
        return '○';
      case 'moderate':
        return '⚠';
      case 'severe':
        return '⚠';
      default:
        return '?';
    }
  };

  const handleProvideFeedback = () => {
    navigation.navigate('Feedback' as any, { testId: results.test_id });
  };

  const handleNewTest = () => {
    navigation.navigate('ColorTest' as any);
  };

  const handleViewHistory = () => {
    navigation.navigate('History' as any);
  };

  const handleUseCameraFilter = () => {
    navigation.navigate('CameraView', { filter: results.recommended_filter });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPercentage = (score: number): number => {
    return Math.round(score * 100);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Color Vision Test Results</Text>
        <Text style={styles.subtitle}>
          {formatDate(results.timestamp)}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Overall Severity Card */}
        <View style={styles.severityCard}>
          <View style={styles.severityHeader}>
            <Text style={styles.severityTitle}>Overall Assessment</Text>
            <Text style={[styles.severityIcon, { color: getSeverityColor(results.overall_severity) }]}>
              {getSeverityIcon(results.overall_severity)}
            </Text>
          </View>
          
          <View style={styles.severityLevelContainer}>
            <Text style={styles.severityLevelLabel}>Color Vision Status:</Text>
            <Text style={[styles.severityLevel, { color: getSeverityColor(results.overall_severity) }]}>
              {results.overall_severity.toUpperCase()}
            </Text>
          </View>
          
          {results.no_blindness === 1 && (
            <View style={styles.noBlindnessContainer}>
              <Text style={styles.noBlindnessText}>
                ✓ No significant color vision deficiency detected
              </Text>
            </View>
          )}
        </View>

        {/* Detailed Scores */}
        <View style={styles.scoresCard}>
          <Text style={styles.scoresTitle}>Detailed Analysis</Text>
          
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Protanopia (Red-Green):</Text>
            <Text style={styles.scoreValue}>{getPercentage(results.protanopia)}%</Text>
          </View>
          
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Deuteranopia (Red-Green):</Text>
            <Text style={styles.scoreValue}>{getPercentage(results.deuteranopia)}%</Text>
          </View>
          
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Tritanopia (Blue-Yellow):</Text>
            <Text style={styles.scoreValue}>{getPercentage(results.tritanopia)}%</Text>
          </View>
        </View>

        {/* Explanation */}
        <View style={styles.explanationCard}>
          <Text style={styles.explanationTitle}>What This Means</Text>
          {results.overall_severity === 'none' && (
            <Text style={styles.explanationText}>
              Great news! Your color vision appears to be normal. You can distinguish colors 
              accurately across the spectrum. The camera filter feature is still available 
              if you want to experience how others with color vision deficiency see the world.
            </Text>
          )}
          {results.overall_severity === 'mild' && (
            <Text style={styles.explanationText}>
              You have a mild color vision deficiency. While you can see most colors, 
              you might have slight difficulty distinguishing certain shades. 
              The recommended filter can help enhance your color perception.
            </Text>
          )}
          {results.overall_severity === 'moderate' && (
            <Text style={styles.explanationText}>
              You have a moderate color vision deficiency. You may have noticeable 
              difficulty distinguishing certain colors, particularly reds and greens. 
              The personalized filter can significantly improve your color perception.
            </Text>
          )}
          {results.overall_severity === 'severe' && (
            <Text style={styles.explanationText}>
              You have a significant color vision deficiency. Distinguishing certain 
              colors may be quite challenging. The customized correction filter can 
              help improve your color discrimination abilities.
            </Text>
          )}
        </View>

        {/* Filter Recommendations */}
        <View style={styles.filterCard}>
          <Text style={styles.filterTitle}>Personalized Correction Filter</Text>
          <Text style={styles.filterDescription}>
            Based on your test results, we've generated a personalized filter to enhance 
            your color perception. You can try it using the camera feature.
          </Text>
          
          <View style={styles.filterParams}>
            <Text style={styles.filterParamTitle}>Filter Settings:</Text>
            <Text style={styles.filterParam}>
              Red-Green Correction: {Math.round(results.recommended_filter.protanopia_correction * 100)}%
            </Text>
            <Text style={styles.filterParam}>
              Green-Red Correction: {Math.round(results.recommended_filter.deuteranopia_correction * 100)}%
            </Text>
            <Text style={styles.filterParam}>
              Blue-Yellow Correction: {Math.round(results.recommended_filter.tritanopia_correction * 100)}%
            </Text>
            <Text style={styles.filterParam}>
              Brightness: +{Math.round((results.recommended_filter.brightness_adjustment - 1) * 100)}%
            </Text>
            <Text style={styles.filterParam}>
              Contrast: +{Math.round((results.recommended_filter.contrast_adjustment - 1) * 100)}%
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={handleUseCameraFilter}>
            <Text style={styles.cameraButtonText}>Try Camera Filter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.newTestButton}
            onPress={handleNewTest}>
            <Text style={styles.newTestButtonText}>Take New Test</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.historyButton}
            onPress={handleViewHistory}>
            <Text style={styles.historyButtonText}>View Test History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={handleProvideFeedback}>
            <Text style={styles.feedbackButtonText}>Provide Feedback</Text>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>Important Notice</Text>
          <Text style={styles.disclaimerText}>
            This test is for educational and screening purposes only. It is not a substitute 
            for professional medical diagnosis. If you have concerns about your color vision, 
            please consult with an eye care professional.
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
  },
  content: {
    padding: 20,
  },
  severityCard: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 8,
  },
  severityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  severityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  severityIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  severityLevelContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  severityLevelLabel: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  severityLevel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  noBlindnessContainer: {
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 10,
    borderRadius: 8,
  },
  noBlindnessText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  scoresCard: {
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
  scoresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  scoreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  explanationCard: {
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
  explanationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  filterCard: {
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
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  filterDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  filterParams: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  filterParamTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  filterParam: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  disclaimerCard: {
    backgroundColor: '#FFF9E6',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 10,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#BF5F00',
    lineHeight: 18,
  },
  actionButtons: {
    gap: 15,
    marginBottom: 20,
  },
  cameraButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cameraButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  newTestButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  newTestButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  historyButton: {
    backgroundColor: '#6C757D',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  historyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  feedbackButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ResultsScreen;