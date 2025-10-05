import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface FilterOption {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  {
    id: 'off',
    name: 'No Filter',
    description: 'Normal view',
    color: '#6c757d',
    icon: '👁️',
  },
  {
    id: 'protanopia',
    name: 'Protanopia',
    description: 'Red-blind correction',
    color: '#dc3545',
    icon: '🔴',
  },
  {
    id: 'deuteranopia',
    name: 'Deuteranopia',
    description: 'Green-blind correction',
    color: '#28a745',
    icon: '🟢',
  },
  {
    id: 'tritanopia',
    name: 'Tritanopia',
    description: 'Blue-blind correction',
    color: '#007bff',
    icon: '🔵',
  },
  {
    id: 'smart_ai',
    name: 'Smart AI',
    description: 'AI-powered filter',
    color: '#6f42c1',
    icon: '🤖',
  },
];

const MicroCameraScreen = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>(FILTER_OPTIONS[0]);
  const [aiFilterParams, setAiFilterParams] = useState<any>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    requestCameraPermission();
    loadAIFilterParams();
  }, []);

  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'This app needs camera access to provide real-time color correction.',
          [
            { text: 'Cancel' },
            { text: 'Grant Permission', onPress: requestCameraPermission },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      Alert.alert('Error', 'Failed to request camera permission');
    }
  };

  const loadAIFilterParams = async () => {
    setIsLoadingAI(true);
    try {
      // Get user's test results for AI filter
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

      // Request AI filter parameters from backend
      const response = await fetch('/api/gan/filter-params', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(severityScores),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiFilterParams(data.filter_params);
        console.log('AI filter parameters loaded:', data);
      }
    } catch (error) {
      console.error('Error loading AI filter parameters:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const onCameraReady = () => {
    setCameraReady(true);
  };

  // Generate CSS filter string for color correction
  const generateCSSFilter = (): string => {
    const filters = [];
    
    switch (selectedFilter.id) {
      case 'protanopia':
        // Red-green correction
        filters.push('hue-rotate(15deg)');
        filters.push('saturate(1.3)');
        break;
      case 'deuteranopia':
        // Green correction
        filters.push('saturate(1.4)');
        filters.push('contrast(1.1)');
        break;
      case 'tritanopia':
        // Blue-yellow correction
        filters.push('hue-rotate(-10deg)');
        filters.push('saturate(1.2)');
        break;
      case 'smart_ai':
        if (aiFilterParams) {
          // Use AI-generated parameters
          const protCorrection = aiFilterParams.protanopia_correction || 0;
          const deutCorrection = aiFilterParams.deuteranopia_correction || 0;
          const tritCorrection = aiFilterParams.tritanopia_correction || 0;
          
          if (protCorrection > 0.3) {
            filters.push(`hue-rotate(${protCorrection * 20}deg)`);
          }
          if (deutCorrection > 0.3) {
            filters.push(`saturate(${1 + deutCorrection * 0.5})`);
          }
          if (tritCorrection > 0.3) {
            filters.push(`hue-rotate(${-tritCorrection * 15}deg)`);
          }
          
          if (aiFilterParams.brightness_adjustment) {
            filters.push(`brightness(${aiFilterParams.brightness_adjustment})`);
          }
          if (aiFilterParams.contrast_adjustment) {
            filters.push(`contrast(${aiFilterParams.contrast_adjustment})`);
          }
        } else {
          // Fallback smart filter
          filters.push('saturate(1.3)');
          filters.push('contrast(1.1)');
        }
        break;
      default:
        // No filter
        break;
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

        {/* Active Filter Info */}
        <View style={styles.filterInfoOverlay}>
          <View style={[styles.activeFilterCard, { borderColor: selectedFilter.color }]}>
            <Text style={styles.activeFilterEmoji}>{selectedFilter.icon}</Text>
            <View style={styles.activeFilterInfo}>
              <Text style={styles.activeFilterName}>{selectedFilter.name}</Text>
              <Text style={styles.activeFilterDescription}>{selectedFilter.description}</Text>
              {selectedFilter.id === 'smart_ai' && (
                <Text style={styles.aiStatus}>
                  {isLoadingAI ? 'Loading AI...' : aiFilterParams ? 'AI Ready' : 'AI Fallback'}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Filter Controls */}
      <View style={styles.controlsContainer}>
        <Text style={styles.controlsTitle}>Live Color Filters</Text>
        
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
                if (filter.id === 'smart_ai' && !aiFilterParams) {
                  loadAIFilterParams();
                }
              }}
            >
              <Text style={styles.filterCardEmoji}>{filter.icon}</Text>
              <Text style={styles.filterCardName}>{filter.name}</Text>
              <Text style={styles.filterCardDescription}>{filter.description}</Text>
              
              {filter.id === 'smart_ai' && (
                <Text style={[styles.aiStatusBadge, { 
                  color: aiFilterParams ? '#28a745' : '#ffc107' 
                }]}>
                  {isLoadingAI ? '...' : aiFilterParams ? 'AI' : 'FB'}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.refreshButton} onPress={loadAIFilterParams}>
            <Text style={styles.refreshButtonText}>🔄 Refresh AI Filter</Text>
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
  },
  aiStatus: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
  },
  controlsContainer: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  controlsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    textAlign: 'center',
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  filterCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    width: (width - 60) / 3, // 3 cards per row with margins
    minHeight: 90,
  },
  filterCardActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    transform: [{ scale: 1.02 }],
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  filterCardEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  filterCardName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 2,
  },
  filterCardDescription: {
    fontSize: 10,
    color: '#ccc',
    textAlign: 'center',
  },
  aiStatusBadge: {
    fontSize: 8,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  actionButtons: {
    gap: 10,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MicroCameraScreen;