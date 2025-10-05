export interface UserProfile {
  user_id: string;
  name: string;
  age: number;
  gender: string;
  email?: string;
  previous_tests?: string[];
}

export interface ColorVisionTest {
  test_id?: string;
  user_id: string;
  test_type: 'ishihara' | 'color_match' | 'custom';
  questions: TestQuestion[];
  completed: boolean;
  timestamp: string;
}

export interface TestQuestion {
  question_id: string;
  image_original: string;
  image_filtered: string;
  filter_type: 'protanopia' | 'deuteranopia' | 'tritanopia';
  user_response?: boolean; // true if same, false if different
  correct_answer: boolean;
  timestamp?: string;
}

export interface CVDResults {
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

export interface FilterParams {
  protanopia_correction: number;
  deuteranopia_correction: number;
  tritanopia_correction: number;
  brightness_adjustment: number;
  contrast_adjustment: number;
  saturation_adjustment: number;
  hue_rotation?: number;
  sepia_amount?: number;
}

export interface FeedbackData {
  feedback_id?: string;
  user_id: string;
  page_name: string; // 'home', 'profile', 'color_test', 'camera_filter', 'history'
  feedback_type: 'rating' | 'comment' | 'bug_report' | 'feature_request';
  rating?: number; // 1-5 scale
  comment?: string;
  user_experience?: {
    ease_of_use: number; // 1-5
    accuracy: number; // 1-5
    usefulness: number; // 1-5
  };
  context?: {
    test_id?: string;
    filter_id?: string;
    screen_context?: any;
  };
  timestamp: string;
  device_info?: {
    platform: string;
    os_version: string;
    app_version: string;
  };
}

export interface KafkaFeedbackEvent {
  event_type: 'feedback_submitted';
  data: FeedbackData;
  metadata: {
    timestamp: string;
    session_id: string;
    user_id: string;
  };
}

export interface CameraFilter {
  filter_id: string;
  user_id: string;
  filter_params: FilterParams;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  status?: string;
  error?: string;
}

export interface HealthCheck {
  status: string;
  timestamp: string;
  version: string;
}

export type RootStackParamList = {
  Main: undefined;
  ProfileSetup: undefined;
  Profile: undefined;
  ColorTest: undefined;
  CameraView: { filter?: FilterParams };
  Results: { results: CVDResults };
  History: undefined;
};