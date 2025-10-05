// Simple API service for micro version
class MicroApiService {
  private baseUrl = '';

  async getTestQuestions(testType: string, numQuestions: number) {
    try {
      const response = await fetch('/api/test/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_type: testType,
          num_questions: numQuestions,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get test questions: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting test questions:', error);
      throw error;
    }
  }

  async submitTestResponse(testId: string, questionId: string, response: boolean) {
    try {
      const res = await fetch('/api/test/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_id: testId,
          question_id: questionId,
          response: response,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to submit response: ${res.status}`);
      }

      return await res.json();
    } catch (error) {
      console.error('Error submitting test response:', error);
      throw error;
    }
  }

  async completeTest(testId: string) {
    try {
      const response = await fetch('/api/test/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_id: testId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to complete test: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error completing test:', error);
      throw error;
    }
  }

  async generateGANFilterParameters(severityScores: any) {
    try {
      const response = await fetch('/api/gan/filter-params', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(severityScores),
      });

      if (!response.ok) {
        throw new Error(`Failed to get GAN filter params: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting GAN filter parameters:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }
}

const apiService = new MicroApiService();
export default apiService;