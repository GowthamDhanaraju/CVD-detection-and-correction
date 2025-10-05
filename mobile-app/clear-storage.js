// Simple script to clear AsyncStorage for testing new user flow
// Run this in the Expo CLI console or as a standalone script

const clearAllStorageData = async () => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    console.log('🧹 Clearing all local storage data...');
    
    // Get all keys
    const keys = await AsyncStorage.getAllKeys();
    console.log('Found keys:', keys);
    
    // Clear everything
    await AsyncStorage.clear();
    
    console.log('✅ All local storage data cleared!');
    console.log('🎯 Reload the app to experience the new user flow');
    
  } catch (error) {
    console.error('❌ Error clearing storage:', error);
  }
};

// For Expo CLI usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = clearAllStorageData;
}

// For direct execution
clearAllStorageData();