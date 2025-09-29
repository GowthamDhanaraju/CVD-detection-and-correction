// Utility functions for the CVD Detection mobile app

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })}`;
};

export const calculateBMI = (height: number, weight: number): number => {
  if (height === 0) return 0;
  return weight / ((height / 100) ** 2);
};

export const getBMICategory = (bmi: number): string => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

export const getRiskColor = (riskLevel: string): string => {
  switch (riskLevel.toLowerCase()) {
    case 'low':
      return '#4CAF50';
    case 'moderate':
      return '#FF9800';
    case 'high':
      return '#F44336';
    default:
      return '#666';
  }
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

export const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const isValidAge = (age: number): boolean => {
  return age >= 1 && age <= 120;
};

export const isValidHeight = (height: number): boolean => {
  return height >= 30 && height <= 300; // cm
};

export const isValidWeight = (weight: number): boolean => {
  return weight >= 1 && weight <= 500; // kg
};