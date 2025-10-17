# Color Vision Deficiency (CVD) Detection and Correction

A comprehensive mobile application for **Color Vision Deficiency (CVD)** detection and correction using GAN-based AI models, built with React Native/Expo frontend and FastAPI backend.

## Project Overview

This project provides real-time color vision testing and personalized color correction filters for individuals with color blindness (protanopia, deuteranopia, tritanopia).

## Project Structure

```
CVD-detection-and-correction/
├── mobile-app/          # React Native/Expo mobile application
├── backend/             # FastAPI backend with GAN models
├── models/              # Pre-trained PyTorch GAN models
├── ec2-deployment/      # AWS EC2 deployment scripts  
├── micro-deployment/    # Lightweight deployment version
└── README.md           # This file
```

## Key Features

### 🎯 Core Functionality
- **Interactive Color Vision Testing**: Scientific Ishihara-based tests with image comparisons
- **AI-Powered Filter Generation**: PyTorch GAN models for personalized color correction
- **Real-time Camera Filters**: Live color correction through mobile camera
- **Comprehensive Results Analysis**: Detailed test history with question-by-question breakdowns
- **Cross-Platform Support**: React Native app works on web, iOS, and Android

### 🧠 AI/ML Capabilities  
- **GAN Filter Generator**: Neural network-based color correction algorithms
- **DaltonLens Integration**: Scientific color vision simulation
- **Adaptive Intensity**: Smart filter strength based on severity detection

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Python 3.8+
- React Native CLI or Expo CLI
- Git

### Backend Setup

```bash
cd backend

# Activate virtual environment (Windows)
.\cvd_backend_env\Scripts\activate

# Or create new environment
python -m venv cvd_backend_env
.\cvd_backend_env\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server (loads GAN models automatically)
python main.py
```

### Mobile App Setup

```bash
cd mobile-app

# Install dependencies
npm install

# Start Expo development server
npx expo start --web

# Or for specific platforms
npx expo start --android
npx expo start --ios
```

## Development

- **Backend API**: Available at `http://localhost:8001`
- **Frontend Web**: Available at `http://localhost:8081` 
- **API Documentation**: Available at `http://localhost:8001/docs`
- **Health Check**: Available at `http://localhost:8001/health`

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React Native + Expo | Cross-platform mobile app |
| Backend | FastAPI + Python | REST API and ML processing |
| AI Models | PyTorch GAN | Color correction generation |
| Database | Local JSON + File Storage | User data and test results |
| Computer Vision | OpenCV + DaltonLens | Image processing and CVD simulation |
| Deployment | Docker + AWS EC2 | Containerized cloud deployment |

## Live Demo

🌐 **Production Demo**: [https://13.232.255.114](https://13.232.255.114)  
📱 **Responsive Web App**: Works on mobile browsers and desktop  
🔗 **API Documentation**: [https://13.232.255.114/docs](https://13.232.255.114/docs)

## Deployment Options

### 1. **Main Branch** (Full Features)
- Complete ML pipeline with GAN models
- 5-container Docker architecture
- Advanced filter generation
- Comprehensive testing suite

### 2. **Micro Branch** (Lightweight)  
- Simplified color testing
- 3-container setup
- Traditional filter algorithms
- Optimized for low-resource deployment
