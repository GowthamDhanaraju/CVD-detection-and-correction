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
import { RootStackParamList, CVDPrediction } from '../types';

type ResultsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Results'>;
type ResultsScreenRouteProp = RouteProp<RootStackParamList, 'Results'>;

const ResultsScreen: React.FC = () => {
  const navigation = useNavigation<ResultsScreenNavigationProp>();
  const route = useRoute<ResultsScreenRouteProp>();
  const { prediction } = route.params;

  const getRiskColor = (riskLevel: string): string => {
    switch (riskLevel.toLowerCase()) {
      case 'low':
        return '#4CAF50';
      case 'moderate':
        return '#FF9800';
      case 'high':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const getRiskIcon = (riskLevel: string): string => {
    switch (riskLevel.toLowerCase()) {
      case 'low':
        return '✓';
      case 'moderate':
        return '⚠';
      case 'high':
        return '⚠';
      default:
        return '?';
    }
  };

  const handleProvideFeedback = () => {
    navigation.navigate('Feedback', { prediction });
  };

  const handleNewAssessment = () => {
    navigation.navigate('Assessment');
  };

  const handleViewHistory = () => {
    navigation.navigate('History');
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Assessment Results</Text>
        <Text style={styles.subtitle}>
          {formatDate(prediction.timestamp)}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Risk Score Card */}
        <View style={styles.riskCard}>
          <View style={styles.riskHeader}>
            <Text style={styles.riskTitle}>CVD Risk Assessment</Text>
            <Text style={[styles.riskIcon, { color: getRiskColor(prediction.risk_level) }]}>
              {getRiskIcon(prediction.risk_level)}
            </Text>
          </View>
          
          <View style={styles.riskScoreContainer}>
            <Text style={styles.riskScoreLabel}>Risk Score</Text>
            <Text style={[styles.riskScore, { color: getRiskColor(prediction.risk_level) }]}>
              {prediction.risk_score}%
            </Text>
          </View>
          
          <View style={styles.riskLevelContainer}>
            <Text style={styles.riskLevelLabel}>Risk Level:</Text>
            <Text style={[styles.riskLevel, { color: getRiskColor(prediction.risk_level) }]}>
              {prediction.risk_level.toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceLabel}>
              Confidence: {(prediction.confidence * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Risk Level Explanation */}
        <View style={styles.explanationCard}>
          <Text style={styles.explanationTitle}>What This Means</Text>
          {prediction.risk_level.toLowerCase() === 'low' && (
            <Text style={styles.explanationText}>
              Your cardiovascular disease risk is currently low. This is great news! 
              Continue maintaining a healthy lifestyle to keep your risk low.
            </Text>
          )}
          {prediction.risk_level.toLowerCase() === 'moderate' && (
            <Text style={styles.explanationText}>
              Your cardiovascular disease risk is moderate. While not immediately concerning, 
              there are steps you can take to reduce your risk and improve your heart health.
            </Text>
          )}
          {prediction.risk_level.toLowerCase() === 'high' && (
            <Text style={styles.explanationText}>
              Your cardiovascular disease risk is high. It's important to take action now 
              and consult with healthcare professionals to develop a comprehensive plan.
            </Text>
          )}
        </View>

        {/* Recommendations */}
        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>Recommendations</Text>
          {prediction.recommendations.map((recommendation, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Text style={styles.recommendationBullet}>•</Text>
              <Text style={styles.recommendationText}>{recommendation}</Text>
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>Important Notice</Text>
          <Text style={styles.disclaimerText}>
            This assessment is based on the information you provided and uses AI algorithms 
            for analysis. It is not a substitute for professional medical advice, diagnosis, 
            or treatment. Always consult with qualified healthcare providers regarding any 
            health concerns or before making medical decisions.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={handleProvideFeedback}>
            <Text style={styles.feedbackButtonText}>Provide Feedback</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.newAssessmentButton}
            onPress={handleNewAssessment}>
            <Text style={styles.newAssessmentButtonText}>New Assessment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.historyButton}
            onPress={handleViewHistory}>
            <Text style={styles.historyButtonText}>View History</Text>
          </TouchableOpacity>
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
  riskCard: {
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
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  riskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  riskIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  riskScoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  riskScoreLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  riskScore: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  riskLevelContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  riskLevelLabel: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  riskLevel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  confidenceContainer: {
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#999',
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
  recommendationsCard: {
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
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  recommendationBullet: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 10,
    marginTop: 2,
  },
  recommendationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    flex: 1,
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
  },
  feedbackButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  feedbackButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  newAssessmentButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  newAssessmentButtonText: {
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
});

export default ResultsScreen;