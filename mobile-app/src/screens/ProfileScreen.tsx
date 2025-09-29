import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/api';
import { UserProfile } from '../types';

const ProfileScreen: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>({
    user_id: '',
    name: '',
    age: 0,
    gender: '',
    height: 0,
    weight: 0,
    medical_history: [],
  });
  const [loading, setLoading] = useState(false);
  const [medicalHistory, setMedicalHistory] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem('userProfile');
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        setProfile(parsedProfile);
        setMedicalHistory(parsedProfile.medical_history?.join(', ') || '');
      } else {
        // Generate a unique user ID if none exists
        const userId = `user_${Date.now()}`;
        setProfile(prev => ({ ...prev, user_id: userId }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const saveProfile = async () => {
    if (!profile.name || !profile.age || !profile.gender || !profile.height || !profile.weight) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      // Parse medical history
      const historyArray = medicalHistory
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);

      const updatedProfile = {
        ...profile,
        medical_history: historyArray,
      };

      // Save to backend
      await ApiService.createUserProfile(updatedProfile);

      // Save locally
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      
      setProfile(updatedProfile);

      Alert.alert('Success', 'Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof UserProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>User Profile</Text>
        <Text style={styles.subtitle}>
          Please provide accurate information for better assessment
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={profile.name}
            onChangeText={(text) => updateField('name', text)}
            placeholder="Enter your full name"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age *</Text>
          <TextInput
            style={styles.input}
            value={profile.age.toString()}
            onChangeText={(text) => updateField('age', parseInt(text) || 0)}
            placeholder="Enter your age"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender *</Text>
          <View style={styles.genderContainer}>
            {['Male', 'Female', 'Other'].map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.genderOption,
                  profile.gender === gender && styles.selectedGender,
                ]}
                onPress={() => updateField('gender', gender)}>
                <Text
                  style={[
                    styles.genderText,
                    profile.gender === gender && styles.selectedGenderText,
                  ]}>
                  {gender}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Height (cm) *</Text>
          <TextInput
            style={styles.input}
            value={profile.height.toString()}
            onChangeText={(text) => updateField('height', parseFloat(text) || 0)}
            placeholder="Enter your height in cm"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Weight (kg) *</Text>
          <TextInput
            style={styles.input}
            value={profile.weight.toString()}
            onChangeText={(text) => updateField('weight', parseFloat(text) || 0)}
            placeholder="Enter your weight in kg"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Medical History</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={medicalHistory}
            onChangeText={setMedicalHistory}
            placeholder="Enter conditions separated by commas (e.g., diabetes, hypertension)"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
          <Text style={styles.helpText}>
            Separate multiple conditions with commas
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={saveProfile}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Save Profile</Text>
          )}
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
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderOption: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  selectedGender: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  genderText: {
    fontSize: 16,
    color: '#333',
  },
  selectedGenderText: {
    color: 'white',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ProfileScreen;