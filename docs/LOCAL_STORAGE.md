# Local Storage Options for CVD Detection App

## HDFS vs Local Storage Considerations

### HDFS (Hadoop Distributed File System)
**When to use HDFS:**
- ✅ Big data processing (TB/PB scale)
- ✅ Large medical datasets for ML training
- ✅ Data analytics across clusters
- ✅ Storing large volumes of medical images/ECGs

**Not ideal for:**
- ❌ Mobile app local storage
- ❌ Real-time app data
- ❌ Small-scale applications
- ❌ Development environments

### Recommended Local Storage Strategy

## Option 1: Enhanced Local File Storage (Recommended for now)

### Backend: Structured File Storage
```python
# backend/local_storage.py
import os
import json
import pandas as pd
from pathlib import Path
from datetime import datetime
import sqlite3

class LocalDataManager:
    def __init__(self, base_path="./data"):
        self.base_path = Path(base_path)
        self.setup_directories()
    
    def setup_directories(self):
        """Create organized directory structure"""
        directories = [
            "users",
            "predictions", 
            "medical_files",
            "models",
            "analytics",
            "backups"
        ]
        
        for directory in directories:
            (self.base_path / directory).mkdir(parents=True, exist_ok=True)
    
    def save_user_profile(self, user_data):
        """Save user profile to JSON file"""
        user_file = self.base_path / "users" / f"{user_data['user_id']}.json"
        
        # Add timestamp
        user_data['updated_at'] = datetime.now().isoformat()
        
        with open(user_file, 'w') as f:
            json.dump(user_data, f, indent=2)
        
        return str(user_file)
    
    def load_user_profile(self, user_id):
        """Load user profile from JSON file"""
        user_file = self.base_path / "users" / f"{user_id}.json"
        
        if user_file.exists():
            with open(user_file, 'r') as f:
                return json.load(f)
        return None
    
    def save_prediction(self, prediction_data):
        """Save prediction with structured naming"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        prediction_file = self.base_path / "predictions" / f"{prediction_data['user_id']}_{timestamp}.json"
        
        prediction_data['saved_at'] = datetime.now().isoformat()
        
        with open(prediction_file, 'w') as f:
            json.dump(prediction_data, f, indent=2)
        
        return str(prediction_file)
    
    def load_user_predictions(self, user_id):
        """Load all predictions for a user"""
        predictions = []
        predictions_dir = self.base_path / "predictions"
        
        for file_path in predictions_dir.glob(f"{user_id}_*.json"):
            with open(file_path, 'r') as f:
                prediction = json.load(f)
                prediction['prediction_id'] = file_path.stem
                predictions.append(prediction)
        
        # Sort by timestamp
        predictions.sort(key=lambda x: x.get('saved_at', ''), reverse=True)
        return predictions
    
    def save_medical_file(self, user_id, file_data, file_type="ecg"):
        """Save uploaded medical files"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{user_id}_{file_type}_{timestamp}"
        
        # Create user-specific directory
        user_dir = self.base_path / "medical_files" / user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = user_dir / filename
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(file_data)
        
        # Save metadata
        metadata = {
            "user_id": user_id,
            "file_type": file_type,
            "filename": filename,
            "upload_time": datetime.now().isoformat(),
            "file_size": len(file_data)
        }
        
        metadata_file = user_dir / f"{filename}_metadata.json"
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        return str(file_path)
    
    def export_to_csv(self, data_type="predictions"):
        """Export data to CSV for analysis"""
        if data_type == "predictions":
            all_predictions = []
            predictions_dir = self.base_path / "predictions"
            
            for file_path in predictions_dir.glob("*.json"):
                with open(file_path, 'r') as f:
                    prediction = json.load(f)
                    all_predictions.append(prediction)
            
            if all_predictions:
                df = pd.DataFrame(all_predictions)
                csv_path = self.base_path / "analytics" / f"predictions_{datetime.now().strftime('%Y%m%d')}.csv"
                df.to_csv(csv_path, index=False)
                return str(csv_path)
        
        return None
    
    def backup_data(self):
        """Create backup of all data"""
        import shutil
        
        backup_dir = self.base_path / "backups" / f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        shutil.copytree(self.base_path, backup_dir, ignore=shutil.ignore_patterns('backups'))
        
        return str(backup_dir)
```

### Mobile: Enhanced AsyncStorage
```typescript
// mobile-app/src/services/localStorage.ts
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

  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }
}

export default LocalStorageManager.getInstance();
```

## Option 2: HDFS Integration (For Big Data Processing)

### If you want HDFS for large-scale data processing:

```python
# backend/hdfs_storage.py
from hdfs3 import HDFileSystem
import pandas as pd
import json

class HDFSManager:
    def __init__(self, hdfs_host='localhost', hdfs_port=9000):
        self.hdfs = HDFileSystem(host=hdfs_host, port=hdfs_port)
        self.base_path = '/cvd_data'
        self.setup_directories()
    
    def setup_directories(self):
        """Create HDFS directory structure"""
        directories = [
            f'{self.base_path}/medical_images',
            f'{self.base_path}/ecg_data',
            f'{self.base_path}/user_data',
            f'{self.base_path}/predictions',
            f'{self.base_path}/ml_models'
        ]
        
        for directory in directories:
            if not self.hdfs.exists(directory):
                self.hdfs.mkdir(directory)
    
    def save_large_dataset(self, data, filename):
        """Save large datasets to HDFS"""
        path = f'{self.base_path}/datasets/{filename}'
        
        if isinstance(data, pd.DataFrame):
            # Convert to parquet for efficiency
            data.to_parquet(path)
        else:
            with self.hdfs.open(path, 'wb') as f:
                f.write(data)
        
        return path
    
    def load_dataset(self, filename):
        """Load dataset from HDFS"""
        path = f'{self.base_path}/datasets/{filename}'
        
        if filename.endswith('.parquet'):
            return pd.read_parquet(path)
        else:
            with self.hdfs.open(path, 'rb') as f:
                return f.read()
```

## Recommendation for Your CVD App

### For Current Development:
**Use Option 1: Enhanced Local File Storage**
- ✅ Easy to implement
- ✅ No additional infrastructure
- ✅ Perfect for development and small-medium scale
- ✅ Can handle medical files efficiently

### HDFS Usage Scenarios:
**Consider HDFS only if you have:**
- 📊 Massive datasets (100GB+ medical images)
- 🔬 ML training on large datasets
- 📈 Multi-node data processing requirements
- 🏥 Hospital-scale data processing

### Implementation:
Would you like me to implement the enhanced local storage system (Option 1) for your current setup? It's much more practical for your current needs and can easily scale up to cloud storage later.