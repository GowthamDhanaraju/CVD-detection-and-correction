import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AssessmentScreen from '../screens/AssessmentScreen';
import ResultsScreen from '../screens/ResultsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import FeedbackScreen from '../screens/FeedbackScreen';

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
      }}>
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            // You can add icons here when react-native-vector-icons is properly configured
            null
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            // You can add icons here
            null
          ),
        }}
      />
      <Tab.Screen 
        name="Assessment" 
        component={AssessmentScreen}
        options={{
          title: 'Assessment',
          tabBarIcon: ({ focused, color }) => (
            // You can add icons here
            null
          ),
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          title: 'History',
          tabBarIcon: ({ focused, color }) => (
            // You can add icons here
            null
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Home" 
          component={TabNavigator} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Results" 
          component={ResultsScreen}
          options={{ title: 'Assessment Results' }}
        />
        <Stack.Screen 
          name="Feedback" 
          component={FeedbackScreen}
          options={{ title: 'Feedback' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}