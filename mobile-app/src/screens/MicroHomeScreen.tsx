import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HealthStatus {
  status: string;
  version: string;
  timestamp: string;
}

const MicroHomeScreen = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    checkBackendHealth();
    loadLatestResults();
  }, []);

  const checkBackendHealth = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        setHealthStatus(data);
      } else {
        throw new Error(`Backend responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Health check failed:', error);
      Alert.alert('Connection Error', 'Unable to connect to backend service');
    } finally {
      setLoading(false);
    }
  };

  const loadLatestResults = async () => {
    try {
      const results = await AsyncStorage.getItem('latestTestResults');
      if (results) {
        setTestResults(JSON.parse(results));
      }
    } catch (error) {
      console.error('Error loading test results:', error);
    }
  };

  const clearData = async () => {
    try {
      await AsyncStorage.multiRemove(['latestTestResults', 'cvdTestResults', 'userProfile']);
      setTestResults(null);
      Alert.alert('Success', 'All test data cleared');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear data');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>CVD Detection Micro</Text>
        <Text style={styles.subtitle}>Lightweight Color Vision Testing</Text>
      </View>

      {/* Backend Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔗 Backend Status</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Checking connection...</Text>
          </View>
        ) : healthStatus ? (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>✅ Connected</Text>
            <Text style={styles.statusDetail}>Version: {healthStatus.version}</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={checkBackendHealth}>
              <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statusContainer}>
            <Text style={styles.statusTextError}>❌ Disconnected</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={checkBackendHealth}>
              <Text style={styles.refreshButtonText}>🔄 Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Latest Test Results */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Latest Test Results</Text>
        {testResults ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultText}>
              Overall Severity: <Text style={[styles.severityBadge, getSeverityStyle(testResults.overall_severity)]}>
                {testResults.overall_severity?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </Text>
            <Text style={styles.resultDetail}>
              Protanopia: {Math.round((testResults.protanopia_severity || 0) * 100)}%
            </Text>
            <Text style={styles.resultDetail}>
              Deuteranopia: {Math.round((testResults.deuteranopia_severity || 0) * 100)}%
            </Text>
            <Text style={styles.resultDetail}>
              Tritanopia: {Math.round((testResults.tritanopia_severity || 0) * 100)}%
            </Text>
            <Text style={styles.resultTimestamp}>
              Tested: {new Date(testResults.timestamp).toLocaleDateString()}
            </Text>
          </View>
        ) : (
          <Text style={styles.noResultsText}>No test results available. Take a test to get started!</Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚡ Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🧪 Start New Test</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📱 Open Live Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.clearButton]} 
            onPress={clearData}
          >
            <Text style={styles.clearButtonText}>🗑️ Clear Data</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Features */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>✨ Micro Features</Text>
        <View style={styles.featuresList}>
          <Text style={styles.featureItem}>• Advanced CVD Testing with AI</Text>
          <Text style={styles.featureItem}>• Real-time Camera Filters</Text>
          <Text style={styles.featureItem}>• Personalized Recommendations</Text>
          <Text style={styles.featureItem}>• Lightweight & Fast</Text>
          <Text style={styles.featureItem}>• Optimized for AWS Free Tier</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const getSeverityStyle = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'none': return styles.severityNone;
    case 'mild': return styles.severityMild;
    case 'moderate': return styles.severityModerate;
    case 'severe': return styles.severitySevere;
    default: return styles.severityUnknown;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#28a745',
    marginBottom: 5,
  },
  statusTextError: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc3545',
    marginBottom: 5,
  },
  statusDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    alignItems: 'center',
  },
  resultText: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  severityBadge: {
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityNone: { backgroundColor: '#d4edda', color: '#155724' },
  severityMild: { backgroundColor: '#fff3cd', color: '#856404' },
  severityModerate: { backgroundColor: '#f8d7da', color: '#721c24' },
  severitySevere: { backgroundColor: '#f5c6cb', color: '#721c24' },
  severityUnknown: { backgroundColor: '#e2e3e5', color: '#495057' },
  resultDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  resultTimestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
    fontStyle: 'italic',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionsContainer: {
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#dc3545',
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
});

export default MicroHomeScreen;