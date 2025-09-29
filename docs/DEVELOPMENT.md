# CVD Detection and Correction - Development Guide

## Project Overview

This project consists of a React Native mobile application with a FastAPI backend for Cardiovascular Disease (CVD) detection and correction using AI models.

## Architecture

```
CVD-detection-and-correction/
├── backend/                 # FastAPI backend server
│   ├── main.py             # Main FastAPI application
│   ├── config.py           # Configuration settings
│   ├── requirements.txt    # Python dependencies
│   ├── .env                # Environment variables
│   └── cvd_backend_env/    # Python virtual environment
├── mobile-app/             # React Native mobile application
│   ├── src/
│   │   ├── screens/        # App screens
│   │   ├── components/     # Reusable components
│   │   ├── navigation/     # Navigation setup
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   ├── App.tsx             # Main app component
│   └── package.json        # Node.js dependencies
├── docs/                   # Documentation
├── start-backend.bat       # Windows batch script to start backend
├── start-backend.ps1       # PowerShell script to start backend
├── start-mobile.bat        # Windows batch script to start mobile app
└── README.md               # Main project documentation
```

## Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **Python** (3.8 or higher)
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)
- **Expo CLI** (for React Native development)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. The virtual environment should already be created. If not:
   ```bash
   python -m venv cvd_backend_env
   ```

3. Activate the virtual environment:
   - Windows: `cvd_backend_env\Scripts\activate`
   - macOS/Linux: `source cvd_backend_env/bin/activate`

4. Install dependencies:
   ```bash
   pip install fastapi uvicorn python-multipart python-dotenv httpx aiofiles
   ```

5. Start the server:
   ```bash
   python main.py
   ```

   Or use the startup script:
   - Windows: Double-click `start-backend.bat`
   - PowerShell: `.\start-backend.ps1`

The backend will be available at `http://localhost:8000`

### Mobile App Setup

1. Navigate to the mobile-app directory:
   ```bash
   cd mobile-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npx expo start
   ```

   Or use the startup script:
   - Windows: Double-click `start-mobile.bat`

4. Run on device/emulator:
   - **Android**: `npx expo run:android`
   - **iOS**: `npx expo run:ios`
   - **Web**: `npx expo start --web`

## API Endpoints

### Backend API (http://localhost:8000)

- `GET /` - Health check
- `GET /health` - Detailed health check
- `POST /api/v1/users/profile` - Create/update user profile
- `GET /api/v1/users/profile/{user_id}` - Get user profile
- `POST /api/v1/predict/cvd` - Predict CVD risk
- `GET /api/v1/predictions/{user_id}` - Get user predictions
- `POST /api/v1/feedback` - Submit feedback
- `POST /api/v1/upload/medical-data` - Upload medical data

API documentation is available at `http://localhost:8000/docs`

## Mobile App Features

### Screens

1. **Home Screen** - Main dashboard with navigation options
2. **Profile Screen** - User profile management
3. **Assessment Screen** - CVD risk assessment
4. **Results Screen** - Assessment results display
5. **History Screen** - Assessment history
6. **Feedback Screen** - User feedback submission

### Key Components

- **Navigation** - Tab and stack navigation setup
- **API Service** - HTTP client for backend communication
- **Types** - TypeScript interface definitions
- **Utils** - Helper functions and utilities

## Development Workflow

### Starting Development

1. Start the backend server:
   ```bash
   # From project root
   .\start-backend.ps1
   ```

2. Start the mobile app:
   ```bash
   # From project root
   .\start-mobile.bat
   ```

3. The mobile app will connect to the backend at `http://localhost:8000`

### Testing

- Backend: FastAPI automatically provides interactive API docs at `/docs`
- Mobile: Use Expo Go app or emulator to test the mobile application

### Making Changes

1. **Backend changes**: The server will auto-reload when files change
2. **Mobile changes**: Expo will hot-reload the app when files change

## Configuration

### Backend Configuration

Environment variables in `backend/.env`:
- `HOST` - Server host (default: 0.0.0.0)
- `PORT` - Server port (default: 8000)
- `SECRET_KEY` - Security key for authentication
- `MODEL_PATH` - Path to AI models
- `UPLOAD_DIR` - Directory for file uploads

### Mobile App Configuration

Update API base URL in `src/services/api.ts`:
- Development: `http://localhost:8000`
- Android Emulator: `http://10.0.2.2:8000`
- Production: Your deployed backend URL

## Future Enhancements

### Planned Features

1. **AI Model Integration**
   - PyTorch model integration for CVD prediction
   - Medical image analysis
   - ECG data processing

2. **Kafka Integration**
   - Real-time feedback processing
   - Event streaming
   - Analytics pipeline

3. **Database Integration**
   - PostgreSQL for production data storage
   - User authentication and authorization
   - Data analytics and reporting

4. **Advanced Features**
   - Push notifications
   - Offline mode support
   - Multi-language support
   - Advanced charts and visualizations

### Adding New Dependencies

#### Backend
```bash
# Activate virtual environment
cvd_backend_env\Scripts\activate
# Install new packages
pip install package_name
# Update requirements
pip freeze > requirements.txt
```

#### Mobile App
```bash
# From mobile-app directory
npm install package_name
# For React Native packages
npx expo install package_name
```

## Troubleshooting

### Common Issues

1. **Backend won't start**
   - Check if Python virtual environment is activated
   - Verify all dependencies are installed
   - Check for port conflicts (default: 8000)

2. **Mobile app can't connect to backend**
   - Ensure backend is running
   - Check API base URL in `src/services/api.ts`
   - For Android emulator, use `http://10.0.2.2:8000`

3. **Expo/React Native issues**
   - Clear Expo cache: `npx expo start --clear`
   - Restart development server
   - Check for package version conflicts

### Getting Help

- Check the [FastAPI documentation](https://fastapi.tiangolo.com/)
- Check the [Expo documentation](https://docs.expo.dev/)
- Check the [React Navigation documentation](https://reactnavigation.org/)

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

This project is for educational and research purposes.