# CVD Detection Mobile Application

## 🚀 Quick Start

The application is now set up and ready to run! Here's what you have:

### ✅ Backend (FastAPI)
- **Status**: ✅ Running on http://localhost:8000
- **Features**: User profiles, CVD risk assessment, feedback system
- **API Docs**: http://localhost:8000/docs

### ✅ Mobile App (React Native + Expo)
- **Status**: ✅ Running and ready for testing
- **Platform**: iOS, Android, Web
- **Scanner**: Use Expo Go app to scan QR code

## 🔧 Current Setup

### Backend Features ✅
- FastAPI server with auto-reload
- Health check endpoints
- User profile management
- CVD risk prediction (placeholder algorithm)
- Feedback submission
- File upload capability
- CORS enabled for mobile app

### Mobile App Features ✅
- 5 main screens (Home, Profile, Assessment, Results, History, Feedback)
- Tab navigation with stack navigation
- API integration with backend
- Local data persistence
- User-friendly UI with Material Design-inspired styling
- Form validation and error handling

### Ready for AI Integration 🤖
- Backend structured for PyTorch model integration
- Placeholder for AI model inference
- File upload endpoints for medical data
- Provisions for Kafka feedback processing

## 📱 How to Use

### 1. Backend (Already Running)
The FastAPI backend is running on port 8000. You can:
- View API documentation at http://localhost:8000/docs
- Test endpoints directly from the docs interface

### 2. Mobile App (Already Running)
The mobile app is running with Expo. You can:
- **Scan QR code** with Expo Go app (Android) or Camera app (iOS)
- **Press 'w'** in terminal to open web version
- **Press 'a'** in terminal to open Android emulator
- **Press 'i'** in terminal to open iOS simulator (macOS only)

### 3. Test the Complete Flow
1. Open the mobile app
2. Create a user profile with your details
3. Start a CVD risk assessment
4. View results and recommendations
5. Provide feedback on the assessment

## 🎯 Next Steps for AI Integration

### 1. Add PyTorch Models
```python
# In backend/main.py
import torch
import numpy as np

async def process_medical_data(file_path: str, data_type: str):
    """Process medical data using AI models"""
    if data_type == "ecg":
        # Load ECG model
        model = torch.load("models/ecg_model.pth")
        # Process ECG data
        pass
    elif data_type == "image":
        # Load image classification model
        model = torch.load("models/image_model.pth")
        # Process medical images
        pass
```

### 2. Add Kafka Integration
```python
# Install kafka-python
pip install kafka-python

# In backend/main.py
from kafka import KafkaProducer

async def send_feedback_to_kafka(feedback_data):
    producer = KafkaProducer(
        bootstrap_servers=['localhost:9092'],
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
    producer.send('cvd_feedback', feedback_data)
```

### 3. Add Database
```python
# Install database dependencies
pip install sqlalchemy alembic psycopg2-binary

# Set up database models and migrations
```

## 🛠 Development Commands

### Backend
```bash
# Start backend
cd backend
.\cvd_backend_env\Scripts\python.exe main.py

# Install new dependencies
pip install package_name
pip freeze > requirements.txt
```

### Mobile App
```bash
# Start mobile app
cd mobile-app
npx expo start

# Install new dependencies
npm install package_name

# Clear cache if needed
npx expo start --clear
```

## 📁 Project Structure
```
CVD-detection-and-correction/
├── 📁 backend/              # FastAPI backend
│   ├── 🐍 main.py          # Main API application
│   ├── ⚙️ config.py        # Configuration
│   ├── 📄 requirements.txt  # Python dependencies
│   └── 🔐 .env             # Environment variables
├── 📁 mobile-app/          # React Native app
│   ├── 📁 src/
│   │   ├── 📱 screens/     # App screens
│   │   ├── 🔧 services/    # API services
│   │   ├── 🧭 navigation/  # Navigation setup
│   │   └── 📝 types/       # TypeScript types
│   └── 📄 App.tsx          # Main app component
├── 📁 docs/                # Documentation
├── 🚀 start-backend.ps1    # Backend startup script
└── 📖 README.md            # Project documentation
```

## 🎉 Success!

Your CVD Detection mobile application is fully functional with:
- ✅ Working backend API
- ✅ Complete mobile app with navigation
- ✅ API integration between frontend and backend
- ✅ User profile management
- ✅ CVD risk assessment flow
- ✅ Feedback system
- ✅ Ready for AI model integration
- ✅ Provisions for Kafka integration

Both services are running and ready for development and testing!