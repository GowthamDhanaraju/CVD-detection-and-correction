import axios, { AxiosResponse } from 'axios';
import { UserProfile, CVDPrediction, FeedbackData, ApiResponse, HealthCheck } from '../types';

// API Base URL - Update this to your backend URL
const API_BASE_URL = 'http://localhost:8000'; // For development
// const API_BASE_URL = 'http://10.0.2.2:8000'; // For Android emulator
// const API_BASE_URL = 'https://your-backend-url.com'; // For production

class ApiService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log('API Request:', config.method?.toUpperCase(), config.url);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        console.log('API Response:', response.status, response.config.url);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  // Health check
  async healthCheck(): Promise<HealthCheck> {
    try {
      const response: AxiosResponse<HealthCheck> = await this.api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // User profile management
  async createUserProfile(profile: UserProfile): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/api/v1/users/profile', profile);
      return response.data;
    } catch (error) {
      console.error('Create profile failed:', error);
      throw error;
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const response: AxiosResponse<UserProfile> = await this.api.get(`/api/v1/users/profile/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get profile failed:', error);
      throw error;
    }
  }

  // CVD Prediction
  async predictCVDRisk(profile: UserProfile): Promise<CVDPrediction> {
    try {
      const response: AxiosResponse<CVDPrediction> = await this.api.post('/api/v1/predict/cvd', profile);
      return response.data;
    } catch (error) {
      console.error('CVD prediction failed:', error);
      throw error;
    }
  }

  // Get user predictions
  async getUserPredictions(userId: string): Promise<CVDPrediction[]> {
    try {
      const response: AxiosResponse<CVDPrediction[]> = await this.api.get(`/api/v1/predictions/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get predictions failed:', error);
      throw error;
    }
  }

  // Submit feedback
  async submitFeedback(feedback: FeedbackData): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/api/v1/feedback', feedback);
      return response.data;
    } catch (error) {
      console.error('Submit feedback failed:', error);
      throw error;
    }
  }

  // Upload medical data
  async uploadMedicalData(
    userId: string,
    file: any,
    dataType: string = 'ecg'
  ): Promise<ApiResponse<any>> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', userId);
      formData.append('data_type', dataType);

      const response = await this.api.post('/api/v1/upload/medical-data', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Upload medical data failed:', error);
      throw error;
    }
  }
}

export default new ApiService();