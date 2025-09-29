export interface UserProfile {
  user_id: string;
  name: string;
  age: number;
  gender: string;
  height: number; // in cm
  weight: number; // in kg
  medical_history?: string[];
}

export interface CVDPrediction {
  prediction_id?: string;
  user_id: string;
  risk_score: number;
  risk_level: string;
  recommendations: string[];
  confidence: number;
  timestamp: string;
}

export interface FeedbackData {
  user_id: string;
  prediction_id: string;
  feedback_type: string;
  rating: number;
  comments?: string;
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
  Home: undefined;
  Profile: undefined;
  Assessment: undefined;
  Results: { prediction: CVDPrediction };
  History: undefined;
  Feedback: { prediction: CVDPrediction };
};