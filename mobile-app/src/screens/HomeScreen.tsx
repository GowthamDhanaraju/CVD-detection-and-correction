import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import ApiService from '../services/api';
import { RootStackParamList, HealthCheck } from '../types';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [healthStatus, setHealthStatus] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAPIHealth();
  }, []);

  const checkAPIHealth = async () => {
    try {
      const health = await ApiService.healthCheck();
      setHealthStatus(health);
    } catch (error) {
      console.error('Health check failed:', error);
      Alert.alert(
        'Connection Error',
        'Unable to connect to the server. Please check your internet connection.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = () => {
    navigation.navigate('Assessment');
  };

  const handleViewProfile = () => {
    navigation.navigate('Profile');
  };

  const handleViewHistory = () => {
    navigation.navigate('History');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Connecting to server...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>CVD Health Monitor</Text>
        <Text style={styles.subtitle}>
          Your cardiovascular health companion
        </Text>
        
        {healthStatus && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              Server Status: {healthStatus.status}
            </Text>
            <Text style={styles.versionText}>
              Version: {healthStatus.version}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={[styles.card, styles.primaryCard]}
          onPress={handleStartAssessment}>
          <Text style={styles.cardTitle}>Start Assessment</Text>
          <Text style={styles.cardDescription}>
            Begin a new cardiovascular risk assessment
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={handleViewProfile}>
          <Text style={styles.cardTitle}>Manage Profile</Text>
          <Text style={styles.cardDescription}>
            Update your personal and medical information
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={handleViewHistory}>
          <Text style={styles.cardTitle}>View History</Text>
          <Text style={styles.cardDescription}>
            Review your past assessments and results
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>About CVD Assessment</Text>
        <Text style={styles.infoText}>
          This application uses advanced AI models to assess your cardiovascular 
          disease risk based on your personal health data. The assessment considers 
          multiple factors including age, lifestyle, and medical history to provide 
          personalized recommendations.
        </Text>
      </View>
    </ScrollView>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  statusContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  cardContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  primaryCard: {
    backgroundColor: '#007AFF',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoSection: {
    padding: 20,
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});

// Override styles for primary card text
StyleSheet.flatten([
  styles.primaryCard,
  {
    cardTitle: { color: 'white' },
    cardDescription: { color: 'rgba(255, 255, 255, 0.8)' },
  },
]);

export default HomeScreen;