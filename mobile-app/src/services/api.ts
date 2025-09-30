import axios, { AxiosResponse } from 'axios';
import { 
  UserProfile, 
  ColorVisionTest, 
  CVDResults, 
  FilterParams, 
  CameraFilter,
  ApiResponse, 
  HealthCheck,
  CorrectionRequest,
  CorrectionResponse
} from '../types';

// API Base URL - Set for web development (most reliable)
const API_BASE_URL = 'http://localhost:8001'; // For web development

// Alternative URLs for different environments:
// const API_BASE_URL = 'http://10.0.2.2:8001'; // For Android emulator
// const API_BASE_URL = 'http://10.12.85.67:8001'; // For physical device on same network

class ColorVisionApiService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    console.log('API Service initialized with base URL:', API_BASE_URL);
    
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log('API Request:', config.method?.toUpperCase(), config.url);
        console.log('Full URL:', (config.baseURL || '') + (config.url || ''));
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
        console.error('Error details:', {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method,
          code: error.code
        });
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

  // Color Vision Test Management
  async createColorTest(test: ColorVisionTest): Promise<ApiResponse<ColorVisionTest>> {
    try {
      const response = await this.api.post('/api/v1/color-test/create', test);
      return response.data;
    } catch (error) {
      console.error('Create color test failed:', error);
      throw error;
    }
  }

  async getTestQuestions(testType: string = 'ishihara', count: number = 20): Promise<any> {
    try {
      const response = await this.api.get(
        `/api/v1/color-test/questions?test_type=${testType}&count=${count}`
      );
      return response.data;
    } catch (error) {
      console.error('Get test questions failed:', error);
      throw error;
    }
  }

  async submitTestResponse(
    testId: string, 
    questionId: string, 
    response: boolean
  ): Promise<ApiResponse<any>> {
    try {
      const responseData = await this.api.post('/api/v1/color-test/response', {
        test_id: testId,
        question_id: questionId,
        user_response: response,
        timestamp: new Date().toISOString()
      });
      return responseData.data;
    } catch (error) {
      console.error('Submit test response failed:', error);
      throw error;
    }
  }

  async completeTest(testId: string): Promise<CVDResults> {
    try {
      const response: AxiosResponse<CVDResults> = await this.api.post(`/api/v1/color-test/complete/${testId}`);
      return response.data;
    } catch (error) {
      console.error('Complete test failed:', error);
      throw error;
    }
  }

  // Filter Generation and Management
  async generateFilter(results: CVDResults): Promise<CameraFilter> {
    try {
      const response: AxiosResponse<CameraFilter> = await this.api.post('/api/v1/filter/generate', results);
      return response.data;
    } catch (error) {
      console.error('Generate filter failed:', error);
      throw error;
    }
  }

  async getUserFilters(userId: string): Promise<CameraFilter[]> {
    try {
      const response: AxiosResponse<CameraFilter[]> = await this.api.get(`/api/v1/filter/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get user filters failed:', error);
      throw error;
    }
  }

  async updateFilterParams(filterId: string, params: FilterParams): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put(`/api/v1/filter/${filterId}`, params);
      return response.data;
    } catch (error) {
      console.error('Update filter params failed:', error);
      throw error;
    }
  }

  // Results and History
  async getUserTestHistory(userId: string): Promise<CVDResults[]> {
    try {
      const response: AxiosResponse<CVDResults[]> = await this.api.get(`/api/v1/results/history/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get test history failed:', error);
      throw error;
    }
  }

  async getTestResults(testId: string): Promise<CVDResults> {
    try {
      const response: AxiosResponse<CVDResults> = await this.api.get(`/api/v1/results/${testId}`);
      return response.data;
    } catch (error) {
      console.error('Get test results failed:', error);
      throw error;
    }
  }

  // Generate real-time GAN filter parameters
  async generateGANFilterParameters(severityScores: {
    protanopia: number;
    deuteranopia: number;
    tritanopia: number;
  }): Promise<{
    status: string;
    filter_params: FilterParams;
    source: 'gan' | 'traditional';
  }> {
    try {
      const response = await this.api.post('/api/v1/gan/filter-parameters', {
        severity_scores: severityScores
      });
      
      console.log('GAN filter parameters generated:', response.data);
      return response.data;
    } catch (error) {
      console.error('Generate GAN filter parameters failed:', error);
      throw error;
    }
  }
}

export default new ColorVisionApiService();