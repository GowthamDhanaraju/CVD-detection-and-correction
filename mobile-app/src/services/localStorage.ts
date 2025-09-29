import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, CVDPrediction } from '../types';

class LocalStorageManager {
  private static instance: LocalStorageManager;
  
  public static getInstance(): LocalStorageManager {
    if (!LocalStorageManager.instance) {
      LocalStorageManager.instance = new LocalStorageManager();
    }
    return LocalStorageManager.instance;
  }

  // User Profile Management
  async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      const profileWithTimestamp = {
        ...profile,
        updated_at: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(
        `user_profile_${profile.user_id}`, 
        JSON.stringify(profileWithTimestamp)
      );
      
      // Also save to general profile key for easy access
      await AsyncStorage.setItem('current_user_profile', JSON.stringify(profileWithTimestamp));
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  }

  async getUserProfile(userId?: string): Promise<UserProfile | null> {
    try {
      let key = 'current_user_profile';
      if (userId) {
        key = `user_profile_${userId}`;
      }
      
      const profileData = await AsyncStorage.getItem(key);
      return profileData ? JSON.parse(profileData) : null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }

  // Predictions Management
  async savePrediction(prediction: CVDPrediction): Promise<void> {
    try {
      const predictionWithId = {
        ...prediction,
        prediction_id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        saved_at: new Date().toISOString(),
      };

      // Save individual prediction
      await AsyncStorage.setItem(
        `prediction_${predictionWithId.prediction_id}`,
        JSON.stringify(predictionWithId)
      );

      // Update predictions list
      const existingPredictions = await this.getUserPredictions(prediction.user_id);
      const updatedPredictions = [predictionWithId, ...existingPredictions];
      
      await AsyncStorage.setItem(
        `predictions_${prediction.user_id}`,
        JSON.stringify(updatedPredictions)
      );

      // Save latest prediction for quick access
      await AsyncStorage.setItem('latest_prediction', JSON.stringify(predictionWithId));
    } catch (error) {
      console.error('Error saving prediction:', error);
      throw error;
    }
  }

  async getUserPredictions(userId: string): Promise<CVDPrediction[]> {
    try {
      const predictionsData = await AsyncStorage.getItem(`predictions_${userId}`);
      return predictionsData ? JSON.parse(predictionsData) : [];
    } catch (error) {
      console.error('Error loading predictions:', error);
      return [];
    }
  }

  async getLatestPrediction(): Promise<CVDPrediction | null> {
    try {
      const predictionData = await AsyncStorage.getItem('latest_prediction');
      return predictionData ? JSON.parse(predictionData) : null;
    } catch (error) {
      console.error('Error loading latest prediction:', error);
      return null;
    }
  }

  // Cache Management
  async cacheApiData(key: string, data: any, expirationHours: number = 24): Promise<void> {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        expiration: Date.now() + (expirationHours * 60 * 60 * 1000),
      };
      
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  async getCachedData(key: string): Promise<any | null> {
    try {
      const cacheData = await AsyncStorage.getItem(`cache_${key}`);
      if (!cacheData) return null;

      const parsed = JSON.parse(cacheData);
      
      // Check if expired
      if (Date.now() > parsed.expiration) {
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('Error retrieving cached data:', error);
      return null;
    }
  }

  // Offline Support
  async saveOfflineAction(action: any): Promise<void> {
    try {
      const offlineActions = await this.getOfflineActions();
      const newAction = {
        ...action,
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };
      
      offlineActions.push(newAction);
      await AsyncStorage.setItem('offline_actions', JSON.stringify(offlineActions));
    } catch (error) {
      console.error('Error saving offline action:', error);
    }
  }

  async getOfflineActions(): Promise<any[]> {
    try {
      const actionsData = await AsyncStorage.getItem('offline_actions');
      return actionsData ? JSON.parse(actionsData) : [];
    } catch (error) {
      console.error('Error loading offline actions:', error);
      return [];
    }
  }

  async clearOfflineActions(): Promise<void> {
    try {
      await AsyncStorage.removeItem('offline_actions');
    } catch (error) {
      console.error('Error clearing offline actions:', error);
    }
  }

  // Data Export
  async exportAllData(): Promise<string> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const stores = await AsyncStorage.multiGet(keys);
      
      const exportData = {
        export_date: new Date().toISOString(),
        app_version: '1.0.0',
        data: stores.reduce((acc, [key, value]) => {
          acc[key] = value ? JSON.parse(value) : null;
          return acc;
        }, {} as Record<string, any>),
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  // Data Cleanup
  async clearExpiredCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      for (const key of cacheKeys) {
        const data = await this.getCachedData(key.replace('cache_', ''));
        // getCachedData automatically removes expired items
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  async getStorageStats(): Promise<{[key: string]: any}> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const stores = await AsyncStorage.multiGet(keys);
      
      let totalSize = 0;
      let profileCount = 0;
      let predictionCount = 0;
      let cacheCount = 0;
      
      stores.forEach(([key, value]) => {
        if (value) {
          totalSize += value.length;
          if (key.startsWith('user_profile_')) profileCount++;
          if (key.startsWith('prediction_')) predictionCount++;
          if (key.startsWith('cache_')) cacheCount++;
        }
      });

      return {
        total_keys: keys.length,
        total_size_bytes: totalSize,
        estimated_size_mb: (totalSize / (1024 * 1024)).toFixed(2),
        profile_count: profileCount,
        prediction_count: predictionCount,
        cache_count: cacheCount,
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {};
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  // Settings Management
  async saveSetting(key: string, value: any): Promise<void> {
    try {
      await AsyncStorage.setItem(`setting_${key}`, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  }

  async getSetting(key: string, defaultValue: any = null): Promise<any> {
    try {
      const value = await AsyncStorage.getItem(`setting_${key}`);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.error('Error loading setting:', error);
      return defaultValue;
    }
  }
}

export default LocalStorageManager.getInstance();