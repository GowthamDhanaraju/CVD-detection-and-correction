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
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/api';
import { RootStackParamList, CVDPrediction, UserProfile } from '../types';

type HistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'History'>;

interface HistoryItem extends CVDPrediction {
  prediction_id: string;
}

const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<HistoryScreenNavigationProp>();
  const [predictions, setPredictions] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    try {
      // Load user profile
      const savedProfile = await AsyncStorage.getItem('userProfile');
      if (savedProfile) {
        const userProfile = JSON.parse(savedProfile);
        setProfile(userProfile);

        try {
          // Try to load from API first
          const apiPredictions = await ApiService.getUserPredictions(userProfile.user_id);
          const historyItems: HistoryItem[] = apiPredictions.map(pred => ({
            ...pred,
            prediction_id: pred.prediction_id || `pred_${Date.now()}_${Math.random()}`
          }));
          setPredictions(historyItems);
        } catch (apiError) {
          console.log('API load failed, loading from local storage');
          // Fallback to local storage
          await loadLocalHistory();
        }
      } else {
        // No profile, load local history only
        await loadLocalHistory();
      }
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert('Error', 'Failed to load assessment history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadLocalHistory = async () => {
    try {
      const localHistory = await AsyncStorage.getItem('assessmentHistory');
      if (localHistory) {
        setPredictions(JSON.parse(localHistory));
      }
    } catch (error) {
      console.error('Error loading local history:', error);
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

  const viewPredictionDetails = (prediction: HistoryItem) => {
    navigation.navigate('Results', { prediction });
  };

  const clearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all assessment history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('assessmentHistory');
              setPredictions([]);
              Alert.alert('Success', 'Assessment history cleared.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear history.');
            }
          },
        },
      ]
    );
  };

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => viewPredictionDetails(item)}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemDate}>{formatDate(item.timestamp)}</Text>
        <Text style={styles.itemTime}>{formatTime(item.timestamp)}</Text>
      </View>
      
      <View style={styles.itemContent}>
        <View style={styles.riskScoreContainer}>
          <Text style={styles.riskScoreLabel}>Risk Score</Text>
          <Text style={[styles.riskScore, { color: getRiskColor(item.risk_level) }]}>
            {item.risk_score}%
          </Text>
        </View>
        
        <View style={styles.riskLevelContainer}>
          <Text style={[styles.riskLevel, { color: getRiskColor(item.risk_level) }]}>
            {item.risk_level.toUpperCase()} RISK
          </Text>
        </View>
      </View>
      
      <View style={styles.itemFooter}>
        <Text style={styles.confidenceText}>
          Confidence: {(item.confidence * 100).toFixed(0)}%
        </Text>
        <Text style={styles.viewDetailsText}>Tap to view details →</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Assessments Yet</Text>
      <Text style={styles.emptyStateText}>
        Start your first cardiovascular risk assessment to see your history here.
      </Text>
      <TouchableOpacity
        style={styles.startAssessmentButton}
        onPress={() => navigation.navigate('Assessment')}>
        <Text style={styles.startAssessmentButtonText}>Start Assessment</Text>
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
        <Text style={styles.title}>Assessment History</Text>
        {profile && (
          <Text style={styles.subtitle}>{profile.name}</Text>
        )}
      </View>

      {predictions.length > 0 && (
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearHistory}>
            <Text style={styles.clearButtonText}>Clear History</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={predictions}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.prediction_id || item.timestamp}
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
  },
  clearButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
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
  riskScoreContainer: {
    alignItems: 'center',
  },
  riskScoreLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  riskScore: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  riskLevelContainer: {
    alignItems: 'center',
  },
  riskLevel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceText: {
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
  startAssessmentButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  startAssessmentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HistoryScreen;