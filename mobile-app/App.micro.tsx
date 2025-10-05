import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MicroNavigation from './src/navigation/MicroNavigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <MicroNavigation />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}