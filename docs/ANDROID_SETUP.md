# Android Development Setup Guide

## Setting up Android Studio for React Native Development

### 1. Download and Install Android Studio
- Go to https://developer.android.com/studio
- Download Android Studio for Windows
- Run the installer and follow the setup wizard

### 2. Configure Android SDK
During installation, make sure to install:
- Android SDK
- Android SDK Platform-Tools
- Android Virtual Device (AVD)

### 3. Set Environment Variables
Add these to your system environment variables:

**ANDROID_HOME**
```
C:\Users\%USERNAME%\AppData\Local\Android\Sdk
```

**Path** (add these entries):
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
```

### 4. Create Virtual Device
1. Open Android Studio
2. Go to Tools → AVD Manager
3. Click "Create Virtual Device"
4. Choose a device (e.g., Pixel 7)
5. Download and select a system image (e.g., API 33)
6. Finish setup

### 5. Run Your App
Once set up, you can run:
```bash
cd mobile-app
npx expo run:android
```

## Quick Alternative: Use Browser Developer Tools

For now, you can simulate Android view in your browser:

1. Open http://localhost:8081 in Chrome/Edge
2. Press F12 to open Developer Tools
3. Click the device icon (📱) in the top-left
4. Select a device like "Galaxy S20 Ultra" or custom dimensions
5. Refresh the page

This will show you how the app looks on mobile devices!

## Using Expo Go App (Easiest Method)

1. Install "Expo Go" app from Google Play Store
2. Open the app
3. Scan the QR code from your terminal
4. The app will load directly on your Android device

This is the fastest way to see your app running on real Android!