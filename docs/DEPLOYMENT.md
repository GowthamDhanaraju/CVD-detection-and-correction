# Production Deployment Guide

## Expo Go vs Production Apps

### Development Phase (Current)
- ✅ **Expo Go**: Perfect for development and testing
- ✅ **Web version**: Great for quick demos
- ✅ **QR code sharing**: Easy team testing

### Production Deployment Options

## Option 1: EAS Build (Recommended for Expo Projects)

### Setup EAS Build
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo account
eas login

# Configure your project
eas build:configure
```

### Build for Android
```bash
# Development build (for testing)
eas build --platform android --profile development

# Production build (for app store)
eas build --platform android --profile production
```

### Build for iOS
```bash
# Development build
eas build --platform ios --profile development

# Production build
eas build --platform ios --profile production
```

### Deploy to App Stores
```bash
# Submit to Google Play Store
eas submit --platform android

# Submit to Apple App Store
eas submit --platform ios
```

## Option 2: Expo Development Build

### Create Development Build
```bash
# Create a development build with custom native code
npx create-expo-app --template blank-typescript
npx expo install expo-dev-client

# Generate development build
eas build --profile development --platform android
```

## Option 3: Eject to React Native CLI (Full Control)

### If you need full native control:
```bash
# Eject from Expo (irreversible!)
npx expo eject

# Then use React Native CLI
npx react-native run-android
npx react-native run-ios
```

## Production Checklist

### 1. App Configuration
```json
// app.json
{
  "expo": {
    "name": "CVD Health Monitor",
    "slug": "cvd-health-monitor",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#007AFF"
    },
    "updates": {
      "fallbackToCacheTimeout": 0
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.cvdhealthmonitor"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.yourcompany.cvdhealthmonitor"
    }
  }
}
```

### 2. Environment Configuration
```bash
# Create production environment
# backend/.env.production
HOST=0.0.0.0
PORT=8000
SECRET_KEY=your-production-secret-key
DATABASE_URL=your-production-database-url

# mobile-app environment
# Update API_BASE_URL in src/services/api.ts
const API_BASE_URL = 'https://your-production-api.com';
```

### 3. Backend Deployment Options

#### Option A: Cloud Platforms
```bash
# Deploy to Railway
railway login
railway link
railway up

# Deploy to Render
# Connect GitHub repo to Render dashboard

# Deploy to Heroku
heroku create cvd-backend
git push heroku main

# Deploy to AWS/Azure/GCP
# Use their respective deployment tools
```

#### Option B: Docker Deployment
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 4. CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  build-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy Backend
        run: |
          # Deploy backend to cloud
          
  build-mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Expo
        uses: expo/expo-github-action@v7
      - name: Build and Submit
        run: |
          eas build --platform all --non-interactive
          eas submit --platform all --non-interactive
```

## Recommended Production Path

### Phase 1: Current (Development)
- ✅ Use Expo Go for development
- ✅ Use web version for demos
- ✅ Test with QR codes

### Phase 2: Testing
```bash
# Create development builds for beta testing
eas build --profile development --platform android
# Install on test devices
```

### Phase 3: Production
```bash
# Create production builds
eas build --profile production --platform all

# Submit to app stores
eas submit --platform all
```

## Cost Considerations

### Free Tier
- Expo Go: Free
- EAS Build: 30 builds/month free
- Basic deployments: Usually free tier available

### Paid Options
- EAS Build: $29/month for unlimited builds
- App Store fees: $99/year (iOS), $25 one-time (Android)
- Cloud hosting: $5-50/month depending on usage

## Summary

**For your CVD app deployment:**

1. **Development**: Keep using Expo Go ✅
2. **Beta Testing**: Use EAS development builds
3. **Production**: Use EAS production builds + app store submission
4. **Backend**: Deploy to Railway/Render/Heroku for the FastAPI backend

This gives you a professional, scalable deployment without losing the benefits of Expo!