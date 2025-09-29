import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/api';
import { RootStackParamList, UserProfile, CVDPrediction } from '../types';

type AssessmentScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Assessment'>;

const AssessmentScreen: React.FC = () => {
  const navigation = useNavigation<AssessmentScreenNavigationProp>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem('userProfile');
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const startAssessment = async () => {
    if (!profile) {
      Alert.alert(
        'Profile Required',
        'Please complete your profile before starting an assessment.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Profile', onPress: () => navigation.navigate('Profile') },
        ]
      );
      return;
    }

    if (!profile.name || !profile.age || !profile.gender || !profile.height || !profile.weight) {
      Alert.alert(
        'Incomplete Profile',
        'Please complete all required fields in your profile.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Update Profile', onPress: () => navigation.navigate('Profile') },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const prediction: CVDPrediction = await ApiService.predictCVDRisk(profile);
      
      // Save the latest assessment
      await AsyncStorage.setItem('latestAssessment', JSON.stringify(prediction));
      
      navigation.navigate('Results', { prediction });
    } catch (error) {
      console.error('Assessment failed:', error);
      Alert.alert(
        'Assessment Failed',
        'Unable to complete the assessment. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const calculateBMI = (height: number, weight: number): number => {
    if (height === 0) return 0;
    return weight / ((height / 100) ** 2);
  };

  const getBMICategory = (bmi: number): string => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>CVD Risk Assessment</Text>
        </View>
        <View style={styles.noProfileContainer}>
          <Text style={styles.noProfileTitle}>Profile Required</Text>
          <Text style={styles.noProfileText}>
            To perform a cardiovascular risk assessment, please create your profile first.
          </Text>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.profileButtonText}>Create Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const bmi = calculateBMI(profile.height, profile.weight);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>CVD Risk Assessment</Text>
        <Text style={styles.subtitle}>
          Ready to analyze your cardiovascular health
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileSummary}>
          <Text style={styles.sectionTitle}>Profile Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Name:</Text>
            <Text style={styles.summaryValue}>{profile.name}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Age:</Text>
            <Text style={styles.summaryValue}>{profile.age} years</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Gender:</Text>
            <Text style={styles.summaryValue}>{profile.gender}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Height:</Text>
            <Text style={styles.summaryValue}>{profile.height} cm</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Weight:</Text>
            <Text style={styles.summaryValue}>{profile.weight} kg</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>BMI:</Text>
            <Text style={styles.summaryValue}>
              {bmi.toFixed(1)} ({getBMICategory(bmi)})
            </Text>
          </View>
          
          {profile.medical_history && profile.medical_history.length > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Medical History:</Text>
              <Text style={styles.summaryValue}>
                {profile.medical_history.join(', ')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.assessmentInfo}>
          <Text style={styles.sectionTitle}>About This Assessment</Text>
          <Text style={styles.infoText}>
            This assessment will analyze your cardiovascular disease risk based on:
          </Text>
          <View style={styles.factorsList}>
            <Text style={styles.factorItem}>• Age and gender</Text>
            <Text style={styles.factorItem}>• Body Mass Index (BMI)</Text>
            <Text style={styles.factorItem}>• Medical history</Text>
            <Text style={styles.factorItem}>• Lifestyle factors</Text>
          </View>
          <Text style={styles.disclaimerText}>
            This assessment is for informational purposes only and does not replace professional medical advice.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.assessmentButton, loading && styles.disabledButton]}
          onPress={startAssessment}
          disabled={loading}>
          {loading ? (
            <View style={styles.loadingButton}>
              <ActivityIndicator color="white" />
              <Text style={styles.loadingButtonText}>Analyzing...</Text>
            </View>
          ) : (
            <Text style={styles.assessmentButtonText}>Start Assessment</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.editProfileButtonText}>Edit Profile</Text>
        </TouchableOpacity>
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
  noProfileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noProfileTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  noProfileText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  profileButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  profileButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  profileSummary: {
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  assessmentInfo: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  factorsList: {
    marginBottom: 15,
  },
  factorItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    lineHeight: 20,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  assessmentButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  assessmentButtonText: {
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
  editProfileButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  editProfileButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AssessmentScreen;