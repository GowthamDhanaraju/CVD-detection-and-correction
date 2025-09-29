# CVD Detection and Correction Mobile Application

A comprehensive mobile application for Cardiovascular Disease (CVD) detection and correction using AI models, built with React Native frontend and FastAPI backend.

## Project Structure

```
CVD-detection-and-correction/
├── mobile-app/          # React Native mobile application
├── backend/             # FastAPI backend server
├── docs/               # Documentation
└── README.md           # This file
```

## Features

- Mobile application for CVD detection
- AI model integration (planned)
- Real-time feedback system with Kafka (planned)
- User-friendly interface
- Secure API endpoints

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Python 3.8+
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- React Native CLI

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Mobile App Setup

```bash
cd mobile-app
npm install
# For Android
npx react-native run-android
# For iOS
npx react-native run-ios
```

## Development

- Backend API will be available at `http://localhost:8000`
- Mobile app will connect to the backend API
- API documentation available at `http://localhost:8000/docs`

## Future Enhancements

- AI model integration for CVD detection
- Kafka implementation for real-time feedback
- Advanced analytics and reporting
- Multi-language support