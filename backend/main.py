from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import os
from datetime import datetime
import json
from local_storage import data_manager

# Initialize FastAPI app
app = FastAPI(
    title="CVD Detection API",
    description="API for Cardiovascular Disease Detection and Correction",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Pydantic models
class HealthCheck(BaseModel):
    status: str
    timestamp: str
    version: str

class UserProfile(BaseModel):
    user_id: str
    name: str
    age: int
    gender: str
    height: float  # in cm
    weight: float  # in kg
    medical_history: Optional[List[str]] = []
    medications: Optional[List[str]] = []
    lifestyle: Optional[dict] = {}

class CVDPrediction(BaseModel):
    user_id: str
    risk_factors: dict
    prediction_score: float
    risk_level: str
    recommendations: List[str]
    confidence: float
    timestamp: str

class FeedbackData(BaseModel):
    user_id: str
    prediction_id: str
    feedback_type: str
    rating: int
    comments: Optional[str] = None

# Health check endpoints
@app.get("/", response_model=HealthCheck)
async def root():
    """Health check endpoint"""
    return HealthCheck(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0"
    )

@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Detailed health check"""
    return HealthCheck(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0"
    )

# User profile endpoints
@app.post("/api/v1/users/profile")
async def create_user_profile(profile: UserProfile):
    """Create or update user profile"""
    try:
        file_path = data_manager.save_user_profile(profile.dict())
        return {
            "message": "Profile created successfully",
            "user_id": profile.user_id,
            "status": "success",
            "file_path": file_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/users/profile/{user_id}")
async def get_user_profile(user_id: str):
    """Get user profile by ID"""
    profile = data_manager.load_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    return profile

@app.put("/api/v1/users/profile/{user_id}")
async def update_user_profile(user_id: str, profile: UserProfile):
    """Update existing user profile"""
    # Ensure user_id matches
    profile.user_id = user_id
    
    try:
        file_path = data_manager.save_user_profile(profile.dict())
        return {
            "message": "Profile updated successfully",
            "user_id": user_id,
            "status": "success",
            "file_path": file_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# CVD Prediction endpoints
@app.post("/api/v1/predict/cvd")
async def predict_cvd_risk(prediction_request: dict):
    """Predict CVD risk based on user data"""
    try:
        user_id = prediction_request.get("user_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        # Get user profile for additional context
        user_profile = data_manager.load_user_profile(user_id)
        
        # Simple CVD risk calculation (replace with actual ML model)
        risk_factors = prediction_request.get("risk_factors", {})
        age = risk_factors.get("age", user_profile.get("age", 30) if user_profile else 30)
        
        # Basic risk scoring
        risk_score = 0.0
        risk_score += min(age / 100, 0.3)  # Age factor
        risk_score += 0.2 if risk_factors.get("smoking", False) else 0
        risk_score += 0.15 if risk_factors.get("hypertension", False) else 0
        risk_score += 0.15 if risk_factors.get("diabetes", False) else 0
        risk_score += 0.1 if risk_factors.get("family_history", False) else 0
        
        # Determine risk level
        if risk_score < 0.3:
            risk_level = "Low"
        elif risk_score < 0.6:
            risk_level = "Moderate"
        else:
            risk_level = "High"
        
        # Generate recommendations
        recommendations = []
        if risk_factors.get("smoking"):
            recommendations.append("Quit smoking")
        if risk_factors.get("hypertension"):
            recommendations.append("Monitor blood pressure regularly")
        if risk_score > 0.5:
            recommendations.append("Consult with a cardiologist")
        recommendations.append("Regular exercise")
        recommendations.append("Healthy diet")
        
        prediction = {
            "user_id": user_id,
            "risk_factors": risk_factors,
            "prediction_score": round(risk_score, 3),
            "risk_level": risk_level,
            "recommendations": recommendations,
            "confidence": 0.85,
            "timestamp": datetime.now().isoformat()
        }
        
        # Save prediction to local storage
        file_path = data_manager.save_prediction(prediction)
        prediction["file_path"] = file_path
        
        return prediction
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/predictions/{user_id}")
async def get_user_predictions(user_id: str):
    """Get all predictions for a user"""
    try:
        predictions = data_manager.load_user_predictions(user_id)
        return {
            "user_id": user_id,
            "predictions": predictions,
            "total_predictions": len(predictions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Feedback endpoints
@app.post("/api/v1/feedback")
async def submit_feedback(feedback: FeedbackData):
    """Submit user feedback"""
    try:
        feedback_entry = {
            "feedback_id": f"fb_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "user_id": feedback.user_id,
            "prediction_id": feedback.prediction_id,
            "feedback_type": feedback.feedback_type,
            "rating": feedback.rating,
            "comments": feedback.comments,
            "timestamp": datetime.now().isoformat()
        }
        
        # Save feedback (you can create a separate feedback storage method)
        feedback_file = data_manager.base_path / "feedback" / f"{feedback_entry['feedback_id']}.json"
        feedback_file.parent.mkdir(exist_ok=True)
        
        with open(feedback_file, 'w') as f:
            json.dump(feedback_entry, f, indent=2)
        
        return {
            "message": "Feedback submitted successfully",
            "feedback_id": feedback_entry["feedback_id"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# File upload endpoints
@app.post("/api/v1/upload/medical-file")
async def upload_medical_file(
    user_id: str,
    file: UploadFile = File(...),
    file_type: str = "ecg"
):
    """Upload medical files (ECG, X-rays, etc.)"""
    try:
        # Read file content
        file_content = await file.read()
        
        # Save to local storage
        file_path = data_manager.save_medical_file(user_id, file_content, file_type)
        
        return {
            "message": "File uploaded successfully",
            "file_path": file_path,
            "file_size": len(file_content),
            "file_type": file_type
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Analytics endpoints
@app.get("/api/v1/analytics/storage-stats")
async def get_storage_stats():
    """Get storage statistics"""
    try:
        stats = data_manager.get_storage_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/analytics/export")
async def export_data(data_type: str = "predictions"):
    """Export data to CSV"""
    try:
        csv_path = data_manager.export_to_csv(data_type)
        if csv_path:
            return {
                "message": "Data exported successfully",
                "file_path": csv_path
            }
        else:
            return {"message": "No data to export"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/backup")
async def create_backup():
    """Create backup of all data"""
    try:
        backup_path = data_manager.backup_data()
        return {
            "message": "Backup created successfully",
            "backup_path": backup_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)