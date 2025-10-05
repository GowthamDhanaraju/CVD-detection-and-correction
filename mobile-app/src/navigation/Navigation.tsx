import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ColorTestScreen from '../screens/ColorTestScreen';
import CameraViewScreen from '../screens/CameraViewScreen';
import ResultsScreen from '../screens/ResultsScreen';
import HistoryScreen from '../screens/HistoryScreen';

import { RootStackParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          paddingBottom: 5,
          height: 60,
        },
      }}>
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'home' : 'home-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="ColorTest" 
        component={ColorTestScreen}
        options={{
          title: 'Color Test',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'eye' : 'eye-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="CameraView" 
        component={CameraViewScreen}
        options={{
          title: 'Color Filter',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'camera' : 'camera-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          title: 'History',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'time' : 'time-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    checkProfileExists();
  }, []);

  const checkProfileExists = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem('userProfile');
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        // Check if profile has required fields
        if (profile.name && profile.age && profile.gender) {
          setHasProfile(true);
        }
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen while checking profile
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!hasProfile ? (
          // Profile setup flow - mandatory first screen
          <Stack.Screen 
            name="ProfileSetup" 
            component={ProfileScreen}
            options={{ 
              headerShown: false,
              gestureEnabled: false, // Prevent going back
            }}
          />
        ) : (
          // Main app flow - only accessible after profile setup
          <>
            <Stack.Screen 
              name="Main" 
              component={TabNavigator} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Results" 
              component={ResultsScreen}
              options={{ title: 'Test Results' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}