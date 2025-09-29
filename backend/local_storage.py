import os
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any

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
    
    def save_user_profile(self, user_data: Dict) -> str:
        """Save user profile to JSON file"""
        user_file = self.base_path / "users" / f"{user_data['user_id']}.json"
        
        # Add timestamp
        user_data['updated_at'] = datetime.now().isoformat()
        
        with open(user_file, 'w') as f:
            json.dump(user_data, f, indent=2)
        
        return str(user_file)
    
    def load_user_profile(self, user_id: str) -> Optional[Dict]:
        """Load user profile from JSON file"""
        user_file = self.base_path / "users" / f"{user_id}.json"
        
        if user_file.exists():
            with open(user_file, 'r') as f:
                return json.load(f)
        return None
    
    def save_prediction(self, prediction_data: Dict) -> str:
        """Save prediction with structured naming"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        prediction_file = self.base_path / "predictions" / f"{prediction_data['user_id']}_{timestamp}.json"
        
        prediction_data['saved_at'] = datetime.now().isoformat()
        prediction_data['prediction_id'] = f"{prediction_data['user_id']}_{timestamp}"
        
        with open(prediction_file, 'w') as f:
            json.dump(prediction_data, f, indent=2)
        
        return str(prediction_file)
    
    def load_user_predictions(self, user_id: str) -> List[Dict]:
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
    
    def save_medical_file(self, user_id: str, file_data: bytes, file_type: str = "ecg") -> str:
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
    
    def export_to_csv(self, data_type: str = "predictions") -> Optional[str]:
        """Export data to CSV for analysis"""
        if data_type == "predictions":
            all_predictions = []
            predictions_dir = self.base_path / "predictions"
            
            for file_path in predictions_dir.glob("*.json"):
                with open(file_path, 'r') as f:
                    prediction = json.load(f)
                    all_predictions.append(prediction)
            
            if all_predictions:
                # Simple CSV export without pandas
                csv_path = self.base_path / "analytics" / f"predictions_{datetime.now().strftime('%Y%m%d')}.csv"
                
                # Get all unique keys for CSV headers
                all_keys = set()
                for pred in all_predictions:
                    all_keys.update(pred.keys())
                
                headers = sorted(list(all_keys))
                
                with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
                    import csv
                    writer = csv.DictWriter(csvfile, fieldnames=headers)
                    writer.writeheader()
                    
                    for prediction in all_predictions:
                        # Convert complex objects to strings
                        row = {}
                        for key in headers:
                            value = prediction.get(key, '')
                            if isinstance(value, (list, dict)):
                                value = json.dumps(value)
                            row[key] = value
                        writer.writerow(row)
                
                return str(csv_path)
        
        return None
    
    def backup_data(self) -> str:
        """Create backup of all data"""
        import shutil
        
        backup_dir = self.base_path / "backups" / f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy each directory except backups
        for item in self.base_path.iterdir():
            if item.is_dir() and item.name != "backups":
                shutil.copytree(item, backup_dir / item.name)
        
        return str(backup_dir)
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        stats = {
            "total_users": len(list((self.base_path / "users").glob("*.json"))),
            "total_predictions": len(list((self.base_path / "predictions").glob("*.json"))),
            "storage_size_mb": self._calculate_folder_size(self.base_path) / (1024 * 1024),
            "last_backup": self._get_last_backup_time()
        }
        return stats
    
    def _calculate_folder_size(self, folder_path: Path) -> int:
        """Calculate total size of a folder"""
        total_size = 0
        for item in folder_path.rglob("*"):
            if item.is_file():
                total_size += item.stat().st_size
        return total_size
    
    def _get_last_backup_time(self) -> Optional[str]:
        """Get the time of the last backup"""
        backups_dir = self.base_path / "backups"
        if not backups_dir.exists():
            return None
        
        backup_folders = list(backups_dir.glob("backup_*"))
        if backup_folders:
            latest_backup = max(backup_folders, key=lambda x: x.stat().st_mtime)
            return datetime.fromtimestamp(latest_backup.stat().st_mtime).isoformat()
        
        return None

# Global instance
data_manager = LocalDataManager()