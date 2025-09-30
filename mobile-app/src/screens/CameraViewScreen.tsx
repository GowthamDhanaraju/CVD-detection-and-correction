import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Camera, CameraView } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FilterParams, CVDResults } from '../types';
import apiService from '../services/api';

const { width } = Dimensions.get('window');

// Predefined filter options
interface FilterOption {
  id: string;
  name: string;
  description: string;
  params: FilterParams;
  color: string;
  icon: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  {
    id: 'off',
    name: 'No Filter',
    description: 'Normal view without any adjustments',
    params: {
      protanopia_correction: 0,
      deuteranopia_correction: 0,
      tritanopia_correction: 0,
      brightness_adjustment: 1,
      contrast_adjustment: 1,
      saturation_adjustment: 1,
    },
    color: '#6c757d',
    icon: '👁️',
  },
  {
    id: 'smart_ai_filter',
    name: 'Smart AI Filter',
    description: 'AI-powered real-time filter using GAN technology',
    params: {
      protanopia_correction: 0.7,
      deuteranopia_correction: 0.7,
      tritanopia_correction: 0.7,
      brightness_adjustment: 1.2,
      contrast_adjustment: 1.3,
      saturation_adjustment: 1.4,
    },
    color: '#007bff',
    icon: '🤖',
  },
  {
    id: 'system_filter',
    name: 'System Filter',
    description: 'Traditional filter based on your test results',
    params: {
      protanopia_correction: 0.6,
      deuteranopia_correction: 0.6,
      tritanopia_correction: 0.6,
      brightness_adjustment: 1.1,
      contrast_adjustment: 1.2,
      saturation_adjustment: 1.2,
    },
    color: '#28a745',
    icon: '⚙️',
  },
];

const CameraViewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>(FILTER_OPTIONS[0]);
  const [testResults, setTestResults] = useState<CVDResults | null>(null);
  const [ganFilterParams, setGanFilterParams] = useState<FilterParams | null>(null);
  const [isLoadingGANParams, setIsLoadingGANParams] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    requestCameraPermission();
    loadFilterSettings();
    loadGANFilterParams(); // Load GAN parameters on startup
  }, []);

  const loadGANFilterParams = async () => {
    if (isLoadingGANParams) return;
    
    setIsLoadingGANParams(true);
    try {
      // Get user's CVD severity scores from test results
      const latestResults = await AsyncStorage.getItem('latestTestResults');
      let severityScores = {
        protanopia: 0.5,
        deuteranopia: 0.5, 
        tritanopia: 0.5
      };

      if (latestResults) {
        const results = JSON.parse(latestResults);
        severityScores = {
          protanopia: results.protanopia_severity || 0.5,
          deuteranopia: results.deuteranopia_severity || 0.5,
          tritanopia: results.tritanopia_severity || 0.5
        };
      }

      console.log('Requesting GAN filter parameters with scores:', severityScores);
      
      const response = await apiService.generateGANFilterParameters(severityScores);
      
      if (response.status === 'success' && response.filter_params) {
        setGanFilterParams(response.filter_params);
        console.log('GAN filter parameters loaded:', response.filter_params);
        console.log('Filter source:', response.source);
      }
    } catch (error) {
      console.error('Error loading GAN filter parameters:', error);
    } finally {
      setIsLoadingGANParams(false);
    }
  };

  const loadFilterSettings = async () => {
    try {
      // Check if filter params are provided via route
      const routeParams = route.params as { filter?: FilterParams };
      if (routeParams?.filter) {
        // Find the closest matching predefined filter or use Smart AI Filter
        setSelectedFilter(FILTER_OPTIONS[1]); // Smart AI Filter as default
        console.log('Loaded filter params from route');
        return;
      }

      // Load from latest test results
      const latestResults = await AsyncStorage.getItem('latestTestResults');
      if (latestResults) {
        const results = JSON.parse(latestResults);
        setTestResults(results);
        
        // Auto-select system filter if user has test results
        if (results.overall_severity !== 'none') {
          const systemFilter = FILTER_OPTIONS.find(f => f.id === 'system_filter');
          if (systemFilter) {
            setSelectedFilter(systemFilter);
          }
        }
        console.log('Loaded filter based on test results');
      }
    } catch (error) {
      console.error('Error loading filter settings:', error);
    }
  };

  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'This app needs camera access to provide real-time color correction.',
          [
            { text: 'Cancel', onPress: () => navigation.goBack() },
            { text: 'Grant Permission', onPress: requestCameraPermission },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      Alert.alert('Error', 'Failed to request camera permission');
    }
  };

  const onCameraReady = () => {
    setCameraReady(true);
  };

  const saveCurrentFilter = async () => {
    try {
      await AsyncStorage.setItem('selectedFilter', JSON.stringify(selectedFilter));
      Alert.alert('Settings Saved', 'Your filter preference has been saved.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save filter settings.');
    }
  };

  // Generate CSS filter string for color correction
  const generateCSSFilter = (): string => {
    const filters = [];
    
    // Use GAN parameters for Smart AI Filter if available
    let params = selectedFilter.params;
    if (selectedFilter.id === 'smart_ai_filter' && ganFilterParams) {
      params = ganFilterParams;
      console.log('Using GAN-generated filter parameters:', params);
    }
    
    if (selectedFilter.id !== 'off') {
      // Enhanced color vision corrections
      if (params.protanopia_correction > 0) {
        filters.push(`hue-rotate(${params.protanopia_correction * 60}deg)`);
        if (params.sepia_amount) {
          filters.push(`sepia(${params.sepia_amount})`);
        } else {
          filters.push(`sepia(${params.protanopia_correction * 0.3})`);
        }
      }
      
      if (params.deuteranopia_correction > 0) {
        filters.push(`saturate(${1 + params.deuteranopia_correction * 1.5})`);
        filters.push(`contrast(${1 + params.deuteranopia_correction * 0.4})`);
      }
      
      if (params.tritanopia_correction > 0) {
        filters.push(`contrast(${1 + params.tritanopia_correction * 0.6})`);
        filters.push(`brightness(${1 + params.tritanopia_correction * 0.2})`);
        const hueAdjust = params.hue_rotation ? 
          -params.hue_rotation : 
          -params.tritanopia_correction * 15;
        filters.push(`hue-rotate(${hueAdjust}deg)`);
      }
      
      // Apply adjustment filters
      filters.push(`brightness(${params.brightness_adjustment})`);
      filters.push(`contrast(${params.contrast_adjustment})`);
      filters.push(`saturate(${params.saturation_adjustment})`);
      
      // Apply additional GAN-specific filters if available
      if (params.hue_rotation && params.hue_rotation !== 0) {
        filters.push(`hue-rotate(${params.hue_rotation}deg)`);
      }
    }
    
    return filters.join(' ');
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Camera Access Denied</Text>
        <Text style={styles.errorText}>
          Please grant camera permission in your device settings to use the color correction feature.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestCameraPermission}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={[
            styles.camera,
            selectedFilter.id !== 'off' && {
              filter: generateCSSFilter(),
            }
          ]}
          facing="back"
          onCameraReady={onCameraReady}
        />
        
        {!cameraReady && (
          <View style={styles.cameraLoadingOverlay}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.cameraLoadingText}>Loading camera...</Text>
          </View>
        )}

        {/* Filter Info Overlay */}
        <View style={styles.filterInfoOverlay}>
          <View style={styles.activeFilterCard}>
            <Text style={styles.activeFilterEmoji}>{selectedFilter.icon}</Text>
            <View style={styles.activeFilterInfo}>
              <Text style={styles.activeFilterName}>{selectedFilter.name}</Text>
              <Text style={styles.activeFilterDescription}>{selectedFilter.description}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Filter Selection Panel */}
      <View style={styles.controlsContainer}>
        <Text style={styles.controlsTitle}>Choose Your Filter</Text>
        
        <View style={styles.filterGrid}>
          {FILTER_OPTIONS.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterCard,
                selectedFilter.id === filter.id && styles.filterCardActive,
                { borderColor: filter.color }
              ]}
              onPress={() => {
                setSelectedFilter(filter);
                // Refresh GAN parameters when Smart AI Filter is selected
                if (filter.id === 'smart_ai_filter' && !ganFilterParams) {
                  loadGANFilterParams();
                }
              }}
            >
              <Text style={styles.filterCardEmoji}>{filter.icon}</Text>
              <Text style={styles.filterCardName}>{filter.name}</Text>
              <Text style={styles.filterCardDescription}>{filter.description}</Text>
              {/* Show GAN status for Smart AI Filter */}
              {filter.id === 'smart_ai_filter' && (
                <Text style={[styles.ganStatusText, { 
                  color: ganFilterParams ? '#28a745' : '#ffc107' 
                }]}>
                  {ganFilterParams ? '🤖 GAN Active' : isLoadingGANParams ? '⏳ Loading...' : '🔄 Tap to refresh'}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.secondaryButton} onPress={saveCurrentFilter}>
            <Text style={styles.secondaryButtonText}>💾 Save Filter</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  cameraLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: 'white',
  },
  filterInfoOverlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  activeFilterCard: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  activeFilterEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  activeFilterInfo: {
    flex: 1,
  },
  activeFilterName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  activeFilterDescription: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 18,
  },
  controlsContainer: {
    backgroundColor: 'rgba(0,0,0,0.95)',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  controlsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  filterGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  filterCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 6,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 120,
  },
  filterCardActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: '#007AFF',
    transform: [{ scale: 1.02 }],
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  filterCardEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  filterCardName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 6,
  },
  filterCardDescription: {
    fontSize: 11,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 14,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 15,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  ganStatusText: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default CameraViewScreen;