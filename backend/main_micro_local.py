from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import os
import logging
from datetime import datetime
import json
import base64
from io import BytesIO
from PIL import Image

# Check if we're in micro mode
MICRO_MODE = os.getenv('MICRO_MODE', 'false').lower() == 'true'

# Import components based on mode
if not MICRO_MODE:
    from local_storage import data_manager
    try:
        from kafka_producer import get_kafka_producer
    except ImportError:
        get_kafka_producer = None
else:
    # Minimal data manager for micro mode
    class MinimalDataManager:
        def save_user_profile(self, profile): pass
        def get_user_profile(self, user_id): return None
        def save_test_result(self, result): pass
        def get_test_results(self, user_id): return []
        def save_feedback(self, feedback): pass
        def get_analytics(self): return {"total_users": 0, "total_tests": 0}
    
    data_manager = MinimalDataManager()
    get_kafka_producer = None

# Configure logging
logging.basicConfig(
    level=logging.WARNING if MICRO_MODE else logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="CVD Detection API (Micro)",
    description="Lightweight Color Vision Deficiency Detection API",
    version="1.0.0-micro"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class HealthCheck(BaseModel):
    status: str
    timestamp: str
    version: str
    mode: str

class UserProfile(BaseModel):
    user_id: str
    name: str
    age: int
    gender: str
    email: Optional[str] = None

class TestResult(BaseModel):
    user_id: str
    test_type: str
    result: str
    score: Optional[float] = None
    timestamp: str

class FilterRequest(BaseModel):
    image_data: str
    filter_type: str
    intensity: float = 1.0

# Lazy loading for heavy components
_gan_filter_generator = None
_dalton_lens_utils = None

def get_gan_filter_generator():
    global _gan_filter_generator
    if _gan_filter_generator is None and not MICRO_MODE:
        try:
            from gan_filter_generator import GANFilterGenerator
            _gan_filter_generator = GANFilterGenerator()
        except Exception as e:
            logger.warning(f"Could not load GAN filter: {e}")
            _gan_filter_generator = None
    return _gan_filter_generator

def get_dalton_lens_utils():
    global _dalton_lens_utils
    if _dalton_lens_utils is None:
        try:
            from dalton_lens_utils import DaltonLensUtils
            _dalton_lens_utils = DaltonLensUtils()
        except Exception as e:
            logger.warning(f"Could not load Dalton Lens: {e}")
            _dalton_lens_utils = None
    return _dalton_lens_utils

# Health check endpoint
@app.get("/health", response_model=HealthCheck)
async def health_check():
    return HealthCheck(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0-micro",
        mode="micro" if MICRO_MODE else "full"
    )

# User profile endpoints
@app.post("/users/profile")
async def create_user_profile(profile: UserProfile):
    try:
        data_manager.save_user_profile(profile.dict())
        return {"message": "Profile created successfully", "user_id": profile.user_id}
    except Exception as e:
        logger.error(f"Error creating profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to create profile")

@app.get("/users/profile/{user_id}")
async def get_user_profile(user_id: str):
    try:
        profile = data_manager.get_user_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        return profile
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve profile")

# CVD Test endpoint
@app.post("/test/cvd")
async def cvd_test(test_data: dict):
    try:
        # Simplified CVD test for micro mode
        user_id = test_data.get("user_id")
        responses = test_data.get("responses", [])
        
        # Basic scoring logic
        correct_answers = [2, 8, 5, 29, 74, 7, 45, 12, 16, 73]  # Example correct answers
        score = 0
        total = len(correct_answers)
        
        for i, response in enumerate(responses):
            if i < len(correct_answers) and response == correct_answers[i]:
                score += 1
        
        percentage = (score / total) * 100 if total > 0 else 0
        
        # Determine result
        if percentage >= 70:
            result = "Normal color vision"
        elif percentage >= 40:
            result = "Mild color vision deficiency"
        else:
            result = "Significant color vision deficiency"
        
        # Save result
        test_result = TestResult(
            user_id=user_id,
            test_type="ishihara",
            result=result,
            score=percentage,
            timestamp=datetime.now().isoformat()
        )
        
        data_manager.save_test_result(test_result.dict())
        
        return {
            "result": result,
            "score": percentage,
            "total_questions": total,
            "correct_answers": score,
            "recommendation": "Consult an eye care professional for comprehensive testing" if percentage < 70 else "Regular monitoring recommended"
        }
        
    except Exception as e:
        logger.error(f"Error in CVD test: {e}")
        raise HTTPException(status_code=500, detail="Failed to process test")

# Image upload and processing
@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    try:
        # Read and validate image
        contents = await file.read()
        image = Image.open(BytesIO(contents))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize if too large (memory optimization for micro)
        max_size = 800 if MICRO_MODE else 1200
        if max(image.size) > max_size:
            image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # Convert to base64
        buffer = BytesIO()
        image.save(buffer, format='JPEG', quality=85)
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return {
            "message": "Image uploaded successfully",
            "image_data": img_str,
            "size": image.size
        }
        
    except Exception as e:
        logger.error(f"Error uploading image: {e}")
        raise HTTPException(status_code=500, detail="Failed to process image")

# Filter application endpoint
@app.post("/filter/apply")
async def apply_filter(request: FilterRequest):
    try:
        # Decode image
        image_data = base64.b64decode(request.image_data)
        image = Image.open(BytesIO(image_data))
        
        if request.filter_type == "dalton_lens":
            # Use Dalton Lens if available
            dalton_utils = get_dalton_lens_utils()
            if dalton_utils:
                filtered_image = dalton_utils.apply_dalton_filter(image, intensity=request.intensity)
            else:
                # Fallback: simple brightness and contrast adjustment using PIL
                from PIL import ImageEnhance
                enhancer = ImageEnhance.Brightness(image)
                filtered_image = enhancer.enhance(1 + request.intensity * 0.3)
                enhancer = ImageEnhance.Contrast(filtered_image)
                filtered_image = enhancer.enhance(1 + request.intensity * 0.2)
        
        elif request.filter_type == "gan" and not MICRO_MODE:
            # Use GAN filter if available and not in micro mode
            gan_generator = get_gan_filter_generator()
            if gan_generator:
                filtered_image = gan_generator.apply_filter(image, intensity=request.intensity)
            else:
                # Fallback: enhanced color adjustment using PIL
                from PIL import ImageEnhance
                enhancer = ImageEnhance.Color(image)
                filtered_image = enhancer.enhance(1.2 + request.intensity * 0.3)
                enhancer = ImageEnhance.Contrast(filtered_image)
                filtered_image = enhancer.enhance(1.1 + request.intensity * 0.2)
        
        else:
            # Basic color enhancement fallback using PIL
            from PIL import ImageEnhance
            enhancer = ImageEnhance.Brightness(image)
            filtered_image = enhancer.enhance(1.1 + request.intensity * 0.2)
            enhancer = ImageEnhance.Contrast(filtered_image)
            filtered_image = enhancer.enhance(1.05 + request.intensity * 0.1)
        
        # Convert result to base64
        buffer = BytesIO()
        filtered_image.save(buffer, format='JPEG', quality=85)
        result_img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return {
            "filtered_image": result_img_str,
            "filter_type": request.filter_type,
            "intensity": request.intensity
        }
        
    except Exception as e:
        logger.error(f"Error applying filter: {e}")
        raise HTTPException(status_code=500, detail="Failed to apply filter")

# Analytics endpoint (simplified for micro)
@app.get("/analytics")
async def get_analytics():
    try:
        return data_manager.get_analytics()
    except Exception as e:
        logger.error(f"Error getting analytics: {e}")
        return {"total_users": 0, "total_tests": 0, "error": "Analytics unavailable"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        workers=1,
        log_level="warning" if MICRO_MODE else "info"
    )