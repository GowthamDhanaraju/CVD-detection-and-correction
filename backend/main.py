from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict
import uvicorn
import os
import logging
from datetime import datetime
import json
import numpy as np
import cv2
import base64
from io import BytesIO
from PIL import Image
from local_storage import data_manager

# Initialize FastAPI app
app = FastAPI(
    title="Color Vision Deficiency Detection API",
    description="API for Color Vision Deficiency Detection and Correction using Dalton Lens",
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
    email: Optional[str] = None
    previous_tests: Optional[List[str]] = []

class TestQuestion(BaseModel):
    question_id: str
    image_original: str
    image_filtered: str
    filter_type: str  # protanopia, deuteranopia, tritanopia
    user_response: Optional[bool] = None
    correct_answer: bool
    timestamp: Optional[str] = None

class ColorVisionTest(BaseModel):
    test_id: Optional[str] = None
    user_id: str
    test_type: str = 'ishihara'
    questions: List[TestQuestion]
    completed: bool = False
    timestamp: str

class CVDResults(BaseModel):
    test_id: str
    user_id: str
    protanopia: float  # 0-1 severity score
    deuteranopia: float  # 0-1 severity score
    tritanopia: float  # 0-1 severity score
    no_blindness: float  # 0 or 1
    overall_severity: str  # none, mild, moderate, severe
    recommended_filter: Dict
    timestamp: str

class FilterParams(BaseModel):
    protanopia_correction: float
    deuteranopia_correction: float
    tritanopia_correction: float
    brightness_adjustment: float = 1.0
    contrast_adjustment: float = 1.0
    saturation_adjustment: float = 1.0

class CameraFilter(BaseModel):
    filter_id: str
    user_id: str
    filter_params: FilterParams
    is_active: bool = True
    created_at: str
    updated_at: str

class FeedbackData(BaseModel):
    user_id: str
    test_id: str
    filter_id: Optional[str] = None
    feedback_type: str
    rating: int
    comments: Optional[str] = None

class CorrectionRequest(BaseModel):
    image_data: str  # Base64 encoded image
    severity_scores: Dict  # CVD severity scores
    use_gan: bool = True  # Whether to use GAN-based correction
    correction_type: str = "hybrid"  # "gan", "traditional", or "hybrid"

# Color vision deficiency processing imports
from dalton_lens_utils import ColorVisionTestGenerator, CVDAnalyzer, ColorVisionProcessor
from realtime_filter_methods import patch_color_vision_processor

# Apply the real-time filter methods patch
patch_color_vision_processor()

# Initialize services
test_generator = ColorVisionTestGenerator()
cvd_analyzer = CVDAnalyzer()
color_processor = ColorVisionProcessor()

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

# Color Vision Test endpoints
@app.get("/api/v1/color-test/questions")
async def get_test_questions(test_type: str = 'ishihara', count: int = 20):
    """Generate test questions for color vision assessment"""
    try:
        questions = test_generator.generate_test_questions(count)
        test_id = f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{len(questions)}"
        
        test_data = {
            "test_id": test_id,
            "test_type": test_type,
            "questions": questions,
            "completed": False,
            "timestamp": datetime.now().isoformat()
        }
        
        # Save test to storage
        test_file = data_manager.base_path / "tests" / f"{test_id}.json"
        test_file.parent.mkdir(exist_ok=True)
        
        with open(test_file, 'w') as f:
            json.dump(test_data, f, indent=2)
        
        return test_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/gan/filter-parameters")
async def generate_gan_filter_parameters(request: dict):
    """Generate real-time filter parameters using GAN model"""
    try:
        severity_scores = request.get("severity_scores", {
            "protanopia": 0.5,
            "deuteranopia": 0.5, 
            "tritanopia": 0.5
        })
        
        # Generate filter parameters using GAN
        filter_params = color_processor.generate_realtime_filter_params(severity_scores)
        
        if filter_params:
            return {
                "status": "success",
                "filter_params": filter_params,
                "source": "gan"
            }
        else:
            # Fallback to traditional parameters if GAN fails
            fallback_params = color_processor.generate_traditional_filter_params(severity_scores)
            return {
                "status": "success", 
                "filter_params": fallback_params,
                "source": "traditional"
            }
            
    except Exception as e:
        logging.error(f"Error generating filter parameters: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/color-test/create")
async def create_color_test(test: ColorVisionTest):
    """Create a new color vision test"""
    try:
        test_id = f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{test.user_id}"
        test.test_id = test_id
        
        # Save test
        test_file = data_manager.base_path / "tests" / f"{test_id}.json"
        test_file.parent.mkdir(exist_ok=True)
        
        with open(test_file, 'w') as f:
            json.dump(test.dict(), f, indent=2)
        
        return {
            "message": "Test created successfully",
            "test_id": test_id,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/color-test/response")
async def submit_test_response(response_data: dict):
    """Submit response to a test question"""
    try:
        test_id = response_data.get("test_id")
        question_id = response_data.get("question_id")
        user_response = response_data.get("user_response")
        
        if not all([test_id, question_id, user_response is not None]):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Load test data
        test_file = data_manager.base_path / "tests" / f"{test_id}.json"
        if not test_file.exists():
            raise HTTPException(status_code=404, detail="Test not found")
        
        with open(test_file, 'r') as f:
            test_data = json.load(f)
        
        # Update question response
        for question in test_data["questions"]:
            if question["question_id"] == question_id:
                question["user_response"] = user_response
                question["timestamp"] = datetime.now().isoformat()
                break
        else:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Save updated test
        with open(test_file, 'w') as f:
            json.dump(test_data, f, indent=2)
        
        return {
            "message": "Response recorded successfully",
            "test_id": test_id,
            "question_id": question_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/color-test/complete/{test_id}")
async def complete_test(test_id: str):
    """Complete a test and generate results"""
    try:
        # Load test data
        test_file = data_manager.base_path / "tests" / f"{test_id}.json"
        if not test_file.exists():
            raise HTTPException(status_code=404, detail="Test not found")
        
        with open(test_file, 'r') as f:
            test_data = json.load(f)
        
        print(f"Loaded test data for {test_id}")
        print(f"Questions count: {len(test_data.get('questions', []))}")
        
        # Count answered questions
        answered_questions = [q for q in test_data["questions"] if q.get('user_response') is not None]
        print(f"Answered questions: {len(answered_questions)}")
        
        if not answered_questions:
            raise HTTPException(status_code=400, detail="No questions have been answered")
        
        # Analyze results
        print("Starting analysis...")
        analysis = cvd_analyzer.analyze_test_results(test_data["questions"])
        print(f"Analysis complete: {analysis}")
        
        # Generate correction filter
        print("Generating filter...")
        filter_params = cvd_analyzer.generate_correction_filter(analysis)
        print(f"Filter params: {filter_params}")
        
        # Get GAN recommendations if available
        gan_recommendations = color_processor.get_gan_filter_recommendations(analysis)
        if gan_recommendations:
            print(f"GAN recommendations: {gan_recommendations}")
            # Add GAN recommendations to filter params
            filter_params.update({
                "gan_recommendations": gan_recommendations,
                "filter_method": "GAN+Traditional",
                "ai_enhanced": True
            })
        else:
            filter_params.update({
                "filter_method": "Traditional",
                "ai_enhanced": False
            })
        
        # Create results object
        results = CVDResults(
            test_id=test_id,
            user_id=test_data.get("user_id", "unknown"),
            protanopia=analysis["protanopia"],
            deuteranopia=analysis["deuteranopia"],
            tritanopia=analysis["tritanopia"],
            no_blindness=analysis["no_blindness"],
            overall_severity=analysis["overall_severity"],
            recommended_filter=filter_params,
            timestamp=datetime.now().isoformat()
        )
        
        # Save results
        results_file = data_manager.base_path / "results" / f"{test_id}_results.json"
        results_file.parent.mkdir(exist_ok=True)
        
        with open(results_file, 'w') as f:
            json.dump(results.dict(), f, indent=2)
        
        # Mark test as completed
        test_data["completed"] = True
        with open(test_file, 'w') as f:
            json.dump(test_data, f, indent=2)
        
        print(f"Test {test_id} completed successfully")
        return results
        
    except Exception as e:
        print(f"Error completing test {test_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Filter generation and management
@app.post("/api/v1/filter/generate")
async def generate_filter(results: CVDResults):
    """Generate a camera filter based on test results"""
    try:
        filter_id = f"filter_{results.user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        filter_data = CameraFilter(
            filter_id=filter_id,
            user_id=results.user_id,
            filter_params=FilterParams(**results.recommended_filter),
            is_active=True,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )
        
        # Save filter
        filter_file = data_manager.base_path / "filters" / f"{filter_id}.json"
        filter_file.parent.mkdir(exist_ok=True)
        
        with open(filter_file, 'w') as f:
            json.dump(filter_data.dict(), f, indent=2)
        
        return filter_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/filter/user/{user_id}")
async def get_user_filters(user_id: str):
    """Get all filters for a user"""
    try:
        filters_dir = data_manager.base_path / "filters"
        if not filters_dir.exists():
            return []
        
        user_filters = []
        for filter_file in filters_dir.glob("*.json"):
            with open(filter_file, 'r') as f:
                filter_data = json.load(f)
                if filter_data.get("user_id") == user_id:
                    user_filters.append(filter_data)
        
        return user_filters
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/v1/filter/{filter_id}")
async def update_filter_params(filter_id: str, params: FilterParams):
    """Update filter parameters"""
    try:
        filter_file = data_manager.base_path / "filters" / f"{filter_id}.json"
        if not filter_file.exists():
            raise HTTPException(status_code=404, detail="Filter not found")
        
        with open(filter_file, 'r') as f:
            filter_data = json.load(f)
        
        filter_data["filter_params"] = params.dict()
        filter_data["updated_at"] = datetime.now().isoformat()
        
        with open(filter_file, 'w') as f:
            json.dump(filter_data, f, indent=2)
        
        return {
            "message": "Filter updated successfully",
            "filter_id": filter_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Results and history endpoints
@app.get("/api/v1/results/history/{user_id}")
async def get_user_test_history(user_id: str):
    """Get test history for a user"""
    try:
        results_dir = data_manager.base_path / "results"
        if not results_dir.exists():
            return []
        
        user_results = []
        for results_file in results_dir.glob("*_results.json"):
            with open(results_file, 'r') as f:
                results_data = json.load(f)
                if results_data.get("user_id") == user_id:
                    user_results.append(results_data)
        
        # Sort by timestamp (newest first)
        user_results.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return user_results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/results/{test_id}")
async def get_test_results(test_id: str):
    """Get results for a specific test"""
    try:
        results_file = data_manager.base_path / "results" / f"{test_id}_results.json"
        if not results_file.exists():
            raise HTTPException(status_code=404, detail="Results not found")
        
        with open(results_file, 'r') as f:
            return json.load(f)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Image processing endpoints
@app.post("/api/v1/image/apply-filter")
async def apply_dalton_filter(
    image: UploadFile = File(...),
    filter_type: str = "protanopia"
):
    """Apply Dalton lens filter to an uploaded image"""
    try:
        # Read image
        image_data = await image.read()
        
        # Convert to numpy array
        nparr = np.frombuffer(image_data, np.uint8)
        cv_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if cv_image is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB)
        
        # Apply filter
        filtered_image = color_processor.apply_cvd_filter(rgb_image, filter_type)
        
        # Convert back to base64
        filtered_b64 = color_processor._image_to_base64(filtered_image)
        
        return {
            "filtered_image": filtered_b64,
            "filter_type": filter_type,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/image/apply-correction")
async def apply_correction_filter(request: CorrectionRequest):
    """Apply GAN-based or traditional correction filter to an image"""
    try:
        corrected_image = None
        filter_method = "unknown"
        
        if request.correction_type == "gan" and color_processor.gan_generator:
            # Use GAN filter only
            corrected_image = color_processor.apply_gan_correction_filter(
                request.image_data, request.severity_scores
            )
            filter_method = "GAN"
        elif request.correction_type == "traditional":
            # Use traditional filter only
            corrected_image = color_processor.apply_traditional_correction_filter(
                request.image_data, request.severity_scores
            )
            filter_method = "Traditional"
        else:
            # Hybrid approach (default)
            corrected_image = color_processor.apply_hybrid_correction_filter(
                request.image_data, request.severity_scores, request.use_gan
            )
            filter_method = "Hybrid (GAN+Traditional)" if color_processor.gan_generator else "Traditional"
        
        if not corrected_image:
            raise HTTPException(status_code=500, detail="Failed to apply correction filter")
        
        # Get GAN recommendations if available
        gan_recommendations = color_processor.get_gan_filter_recommendations(request.severity_scores)
        
        return {
            "corrected_image": corrected_image,
            "filter_method": filter_method,
            "severity_scores": request.severity_scores,
            "gan_recommendations": gan_recommendations,
            "status": "success"
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
            "test_id": feedback.test_id,
            "filter_id": feedback.filter_id,
            "feedback_type": feedback.feedback_type,
            "rating": feedback.rating,
            "comments": feedback.comments,
            "timestamp": datetime.now().isoformat()
        }
        
        # Save feedback
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)