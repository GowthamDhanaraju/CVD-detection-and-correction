import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList, UserProfile, CVDResults } from '../types';

type TabParamList = {
  Home: undefined;
  Profile: undefined;
  ColorTest: undefined;
  CameraView: { filter?: any };
  History: undefined;
};

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  StackNavigationProp<RootStackParamList>
>;

// Theme colors used in the UI — new palette (colorblind-friendly, high contrast)
const Colors = {
  primary: '#0B6EFF',     // vivid blue
  accent: '#FF8C42',      // warm orange for accents
  secondary: '#28C3C9',   // teal for complementary actions
  background: '#F4F7FA',  // very light neutral
  card: '#FFFFFF',
  text: '#1F2937',        // dark slate
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [lastTestResult, setLastTestResult] = useState<CVDResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load user profile
      const profileData = await AsyncStorage.getItem('userProfile');
      if (profileData) {
        const parsedProfile = JSON.parse(profileData);
        setProfile(parsedProfile);
        
        // Load latest test result
        const resultsData = await AsyncStorage.getItem(`cvd_results_${parsedProfile.user_id}`);
        if (resultsData) {
          const results = JSON.parse(resultsData);
          if (results.length > 0) {
            // Get the most recent test
            const sortedResults = results.sort((a: CVDResults, b: CVDResults) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            setLastTestResult(sortedResults[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startNewTest = () => {
    if (!profile) {
      Alert.alert(
        'Profile Required', 
        'Please set up your profile first to take a color vision test.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Profile', onPress: () => navigation.navigate('Profile') }
        ]
      );
      return;
    }
    navigation.navigate('ColorTest');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'none': return '#4CAF50';
      case 'mild': return '#FFC107';
      case 'moderate': return '#FF9800';
      case 'severe': return '#F44336';
      default: return '#757575';
    }
  };

  const getSeverityDescription = (severity: string) => {
    switch (severity) {
      case 'none': return 'No color vision deficiency detected';
      case 'mild': return 'Mild color vision deficiency';
      case 'moderate': return 'Moderate color vision deficiency';
      case 'severe': return 'Severe color vision deficiency';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          {/* Decorative circles for a modern look */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          <View style={styles.headerContent}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Color Vision</Text>
              <Text style={styles.subtitle}>Advanced detection & correction</Text>
            </View>

            {/* Avatar / profile initials */}
            <View style={styles.avatarWrap}>
              {profile ? (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(profile.name || 'U').split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</Text>
                </View>
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>?</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>
          {profile ? `Welcome back, ${profile.name}!` : 'Welcome to Color Vision Assessment'}
        </Text>
        {!profile && (
          <Text style={styles.setupText}>
            Set up your profile to get started with personalized color vision testing.
          </Text>
        )}
      </View>

      {/* Last Test Result */}
      {lastTestResult && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Latest Test Result</Text>
          <View style={styles.resultContainer}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Date:</Text>
              <Text style={styles.resultValue}>
                {new Date(lastTestResult.timestamp).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Status:</Text>
              <Text style={[
                styles.resultValue, 
                { color: getSeverityColor(lastTestResult.overall_severity) }
              ]}>
                {getSeverityDescription(lastTestResult.overall_severity)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Recommended Filter:</Text>
              <Text style={styles.resultValue}>
                {lastTestResult.recommended_filter ? 'Available' : 'None'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={startNewTest}
        >
          <Text style={styles.primaryButtonText}>
            {lastTestResult ? 'Take New Test' : 'Start Color Vision Test'}
          </Text>
        </TouchableOpacity>

        <View style={styles.secondaryActions}>
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.secondaryButtonText}>View Test History</Text>
          </TouchableOpacity>

          {lastTestResult && lastTestResult.overall_severity !== 'none' && (
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('CameraView', { 
                filter: lastTestResult.recommended_filter 
              })}
            >
              <Text style={styles.secondaryButtonText}>Apply Color Filter</Text>
            </TouchableOpacity>
          )}

          {!profile && (
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.secondaryButtonText}>Set Up Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Information Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>About Color Vision Testing</Text>
        <Text style={styles.infoText}>
          Our advanced Ishihara color vision test uses scientifically validated patterns 
          to detect various types of color vision deficiencies. The test consists of 20 
          carefully designed questions that assess your ability to distinguish colors.
        </Text>
        <Text style={styles.infoText}>
          If a color vision deficiency is detected, our smart filter system can help 
          correct your vision by automatically adjusting colors based on your specific 
          test results.
        </Text>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginTop: 8,
  },
  welcomeSection: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  setupText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  card: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  resultContainer: {
    gap: 8,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 16,
    color: '#666',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  actionsSection: {
    padding: 16,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryActions: {
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  infoSection: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  /* New styles for enhanced header and avatar */
  headerContainer: {
    backgroundColor: Colors.primary,
  },
  header: {
    padding: 20,
    paddingTop: 36,
    alignItems: 'center',
    position: 'relative',
  },
  headerContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  decorCircle1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(40,195,201,0.10)',
    top: -40,
    left: -40,
  },
  decorCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,140,66,0.08)',
    top: -20,
    right: -20,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  avatar: {
    backgroundColor: Colors.secondary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
});

export default HomeScreen;