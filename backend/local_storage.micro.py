"""
Minimal local storage implementation for micro deployment
"""
import json
import os
from datetime import datetime
from typing import Dict, List, Optional

class MinimalDataManager:
    def __init__(self):
        self.data_dir = "/tmp/cvd_data"
        os.makedirs(self.data_dir, exist_ok=True)
    
    def save_user_profile(self, profile: Dict) -> bool:
        """Save user profile to local storage"""
        try:
            profile_file = os.path.join(self.data_dir, f"profile_{profile['user_id']}.json")
            with open(profile_file, 'w') as f:
                json.dump(profile, f)
            return True
        except Exception:
            return False
    
    def get_user_profile(self, user_id: str) -> Optional[Dict]:
        """Get user profile from local storage"""
        try:
            profile_file = os.path.join(self.data_dir, f"profile_{user_id}.json")
            if os.path.exists(profile_file):
                with open(profile_file, 'r') as f:
                    return json.load(f)
        except Exception:
            pass
        return None
    
    def save_test_result(self, result: Dict) -> bool:
        """Save test result to local storage"""
        try:
            result['saved_at'] = datetime.now().isoformat()
            result_file = os.path.join(self.data_dir, f"test_{result['user_id']}_{int(datetime.now().timestamp())}.json")
            with open(result_file, 'w') as f:
                json.dump(result, f)
            return True
        except Exception:
            return False
    
    def get_test_results(self, user_id: str) -> List[Dict]:
        """Get test results for a user"""
        results = []
        try:
            for filename in os.listdir(self.data_dir):
                if filename.startswith(f"test_{user_id}_") and filename.endswith('.json'):
                    with open(os.path.join(self.data_dir, filename), 'r') as f:
                        results.append(json.load(f))
        except Exception:
            pass
        return results
    
    def save_feedback(self, feedback: Dict) -> bool:
        """Save feedback to local storage"""
        try:
            feedback['saved_at'] = datetime.now().isoformat()
            feedback_file = os.path.join(self.data_dir, f"feedback_{int(datetime.now().timestamp())}.json")
            with open(feedback_file, 'w') as f:
                json.dump(feedback, f)
            return True
        except Exception:
            return False
    
    def get_analytics(self) -> Dict:
        """Get basic analytics"""
        try:
            profile_count = len([f for f in os.listdir(self.data_dir) if f.startswith('profile_')])
            test_count = len([f for f in os.listdir(self.data_dir) if f.startswith('test_')])
            return {
                "total_users": profile_count,
                "total_tests": test_count,
                "last_updated": datetime.now().isoformat()
            }
        except Exception:
            return {"total_users": 0, "total_tests": 0, "error": "Analytics unavailable"}

# Create global instance
data_manager = MinimalDataManager()