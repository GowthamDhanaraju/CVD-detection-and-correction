# GitHub Copilot Instructions for CVD Detection Project

## CRITICAL TERMINAL RULES - READ FIRST

### ⚠️ TERMINAL NAVIGATION RULES (MANDATORY)
1. **NEVER use separate commands for cd and execution** - PowerShell does NOT persist directory changes across commands
2. **ALWAYS use single-line commands with semicolons**: `cd path; command`
3. **Example**: `cd d:\Work\Projects\S5\CVD-detection-and-correction\mobile-app; npm start`
4. **Example**: `cd d:\Work\Projects\S5\CVD-detection-and-correction\backend; python main.py`

### Terminal Command Patterns
```powershell
# ✅ CORRECT - Single line with semicolon
cd d:\Work\Projects\S5\CVD-detection-and-correction\mobile-app; npx expo start

# ❌ WRONG - Separate commands (directory resets)
cd d:\Work\Projects\S5\CVD-detection-and-correction\mobile-app
npx expo start
```

## PROJECT STRUCTURE

### Mobile App (React Native + Expo)
- **Path**: `d:\Work\Projects\S5\CVD-detection-and-correction\mobile-app`
- **Port**: 8081 (Metro bundler)
- **Start Command**: `cd d:\Work\Projects\S5\CVD-detection-and-correction\mobile-app; npx expo start`
- **Framework**: React Native with Expo, TypeScript

### Backend (FastAPI + Python)
- **Path**: `d:\Work\Projects\S5\CVD-detection-and-correction\backend`
- **Port**: 8001
- **Start Command**: `cd d:\Work\Projects\S5\CVD-detection-and-correction\backend; python main.py`
- **Virtual Environment**: `cvd_backend_env` (auto-activated by script)

## NEW FEATURES IMPLEMENTED

### Home Screen
- **Location**: `src/screens/HomeScreen.tsx`
- **Features**: 
  - Welcome message with user profile integration
  - Latest test result summary with severity color coding
  - Quick action buttons for new tests and filter application
  - Auto-navigation to filter with recommended settings
  - Information section about color vision testing

### Auto-Reset Color Tests
- **Behavior**: Tests automatically reset when screen comes into focus
- **Implementation**: `useFocusEffect` hook resets test state
- **Benefit**: Always starts fresh test, never resumes from 20th question

### Smart Filter Application  
- **Auto-Loading**: Filters automatically apply based on latest test results
- **Enhanced Intensity**: 2x stronger color corrections for more noticeable effects
- **Sophisticated Algorithms**: 
  - Protanopia: 60° hue rotation + sepia effect
  - Deuteranopia: 1.5x saturation boost + contrast enhancement
  - Tritanopia: Enhanced contrast + brightness + negative hue rotation

### Improved Backend Stability
- **Error Handling**: Added NaN/infinity checks in filter processing
- **Input Validation**: Proper image format and dimension validation
- **Glitch Prevention**: Enhanced clipping and data type conversion

### Navigation Structure (5 Tabs Now)
1. **Home Tab** - Welcome screen with test overview and quick actions
2. **Profile Tab** - User profile management (color vision focused)
3. **Color Test Tab** - Ishihara color vision testing (auto-resets)
4. **Color Filter Tab** - Color vision correction filters (auto-applied from test results)
5. **History Tab** - Detailed test results with question-by-question analysis

### Removed Features (DO NOT RE-ADD)
- ❌ Assessment Screen (cardiovascular risk)
- ❌ Feedback Screen
- ❌ Home Screen
- ❌ CVD prediction functionality
- ❌ Height/weight fields in profile
- ❌ Medical history in profile
- ❌ BMI calculations

## TYPE SYSTEM

### Current Types (src/types/index.ts)
```typescript
// ✅ ACTIVE TYPES
interface UserProfile {
  user_id: string;
  name: string;
  age: number;
  gender: string;
  email: string;
  previous_tests: string[];
}

interface CVDResults {
  test_id: string;
  user_id: string;
  protanopia: number; // 0-1 severity score
  deuteranopia: number; // 0-1 severity score  
  tritanopia: number; // 0-1 severity score
  no_blindness: number; // 0 or 1
  overall_severity: 'none' | 'mild' | 'moderate' | 'severe';
  recommended_filter: FilterParams;
  timestamp: string;
}

interface FilterParams {
  protanopia_correction: number;
  deuteranopia_correction: number;
  tritanopia_correction: number;
  brightness_adjustment: number;
  contrast_adjustment: number;
  saturation_adjustment: number;
}

interface TestQuestion {
  question_id: string;
  image_original: string;
  image_filtered: string;
  filter_type: 'protanopia' | 'deuteranopia' | 'tritanopia';
  user_response?: boolean;
  correct_answer: boolean;
  timestamp?: string;
}

// ❌ REMOVED TYPES (DO NOT USE)
// CVDPrediction - replaced with CVDResults
// FeedbackData - removed entirely
```

## API ENDPOINTS

### Backend API (ApiService)
```typescript
// ✅ ACTIVE ENDPOINTS
- generateColorTest(userId: string): Promise<CVDResults>
- saveCVDResult(result: CVDResults): Promise<void>
- getUserCVDResults(userId: string): Promise<CVDResults[]>
- createUserProfile(profile: UserProfile): Promise<UserProfile>

// ❌ REMOVED ENDPOINTS
// predictCVDRisk() - removed
// submitFeedback() - removed
```

## FEATURE IMPLEMENTATIONS

### History Screen - Detailed Analysis
- **Location**: `src/screens/HistoryScreen.tsx`
- **Features**:
  - Lists all color vision test results
  - Detailed modal showing question-by-question analysis
  - Image display for each test question
  - Explanations for correct/incorrect answers
  - Score and severity display
- **Key Components**: Modal with ScrollView, Image components, debugging logs

### Color Test Integration
- **Test Generation**: 20 questions with scientific color matrices
- **Improved Algorithms**: Enhanced CVD detection accuracy
- **Result Storage**: Local (AsyncStorage) + Backend persistence
- **Question Analysis**: Detailed explanation for each question

### Profile Management
- **Focus**: Color vision testing only
- **Fields**: Name, age, gender, email, previous tests
- **Storage**: AsyncStorage + Backend sync
- **Validation**: Required fields enforced

## DEBUGGING PATTERNS

### History Screen Debugging
```typescript
// ✅ Current debugging in HistoryScreen
console.log('[History] Loading history...');
console.log('[History] Found results:', results.length);
console.log('[History] Test questions loaded:', testQuestions.length);
```

### Storage Debugging
```typescript
// ✅ Check AsyncStorage contents
console.log('[Storage] Saving CVD result:', result);
console.log('[Storage] Retrieved results:', savedResults);
```

## COMMON FIXES

### Type Migration Issues
1. **CVDPrediction → CVDResults**: Update all imports and method calls
2. **localStorage.ts**: Use `saveCVDResult()` instead of `saveCVDPrediction()`
3. **UserProfile**: Remove height, weight, medical_history fields

### Navigation Issues
1. **RootStackParamList**: Only include active screens
2. **Remove**: Assessment, Feedback navigation references
3. **Keep**: Profile, ColorTest, ColorFilter, History

### Import Cleanup
1. **Remove duplicate imports** in all files
2. **Update type imports** to use only active types
3. **Check for phantom file references** (cached TypeScript errors)

## TESTING WORKFLOW

### Start Servers
```powershell
# Backend
cd d:\Work\Projects\S5\CVD-detection-and-correction\backend; python main.py

# Mobile App  
cd d:\Work\Projects\S5\CVD-detection-and-correction\mobile-app; npx expo start
```

### Test History Feature
1. Complete a color vision test
2. Navigate to History tab
3. Tap on a test result
4. Verify detailed modal shows:
   - Question-by-question analysis
   - Images for each question
   - Explanations and scores
   - Proper scrolling and layout

### Verify Clean State
1. No TypeScript compilation errors
2. No console errors in app
3. Proper navigation between 4 tabs only
4. Profile saves/loads correctly without cardiovascular fields

## FILE LOCATIONS

### Key Files
- **Types**: `mobile-app/src/types/index.ts`
- **API Service**: `mobile-app/src/services/api.ts`
- **Local Storage**: `mobile-app/src/services/localStorage.ts`
- **Navigation**: `mobile-app/src/navigation/Navigation.tsx`
- **History Screen**: `mobile-app/src/screens/HistoryScreen.tsx`
- **Profile Screen**: `mobile-app/src/screens/ProfileScreen.tsx`

### Backend Files
- **Main**: `backend/main.py`
- **Config**: `backend/config.py`
- **Utils**: `backend/dalton_lens_utils.py`
- **Storage**: `backend/local_storage.py`

## NEVER DO THESE THINGS
1. ❌ Use separate cd and command in terminal
2. ❌ Re-add cardiovascular features
3. ❌ Reference CVDPrediction type
4. ❌ Add Assessment or Feedback screens back
5. ❌ Add height/weight fields to profile
6. ❌ Use old navigation structure with 6+ tabs
7. ❌ Remove the detailed history modal functionality
8. ❌ Break the TypeScript type system

## ALWAYS DO THESE THINGS
1. ✅ Use single-line terminal commands with semicolons
2. ✅ Maintain 5-tab navigation structure (Home, Profile, ColorTest, CameraView, History)
3. ✅ Keep detailed history analysis feature
4. ✅ Use CVDResults type for all test data
5. ✅ Preserve color vision focus in profile
6. ✅ Maintain scientific color testing algorithms
7. ✅ Check for compilation errors after changes
8. ✅ Test the complete user flow after modifications
9. ✅ Ensure tests auto-reset when ColorTest screen comes into focus
10. ✅ Auto-apply recommended filters from test results
11. ✅ Use enhanced filter intensity for noticeable color corrections