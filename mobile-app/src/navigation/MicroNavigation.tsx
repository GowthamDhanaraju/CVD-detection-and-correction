import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import MicroHomeScreen from '../screens/MicroHomeScreen';
import MicroTestScreen from '../screens/MicroTestScreen';
import MicroCameraScreen from '../screens/MicroCameraScreen';

const Tab = createBottomTabNavigator();

export default function MicroNavigation() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Test') {
              iconName = focused ? 'eye' : 'eye-outline';
            } else if (route.name === 'Camera') {
              iconName = focused ? 'camera' : 'camera-outline';
            } else {
              iconName = 'help-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        })}
      >
        <Tab.Screen 
          name="Home" 
          component={MicroHomeScreen}
          options={{ title: 'CVD Detection' }}
        />
        <Tab.Screen 
          name="Test" 
          component={MicroTestScreen}
          options={{ title: 'Color Test' }}
        />
        <Tab.Screen 
          name="Camera" 
          component={MicroCameraScreen}
          options={{ title: 'Live Filter' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}