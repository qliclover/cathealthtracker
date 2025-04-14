// API Base URL configuration
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://cathealthtracker-api.vercel.app'  // Production API URL
  : 'http://localhost:3001';            // Development API URL

// Auth endpoints
const AUTH_ENDPOINTS = {
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  VERIFY_TOKEN: `${API_BASE_URL}/api/auth/verify`,
  GET_USER: `${API_BASE_URL}/api/auth/user`
};

// Cat endpoints
const CAT_ENDPOINTS = {
  GET_CATS: `${API_BASE_URL}/api/cats`,
  GET_CAT: (id) => `${API_BASE_URL}/api/cats/${id}`,
  CREATE_CAT: `${API_BASE_URL}/api/cats`,
  UPDATE_CAT: (id) => `${API_BASE_URL}/api/cats/${id}`
};

// Health Record endpoints
const HEALTH_RECORD_ENDPOINTS = {
  GET_CAT_RECORDS: (catId) => `${API_BASE_URL}/api/cats/${catId}/records`,
  CREATE_RECORD: (catId) => `${API_BASE_URL}/api/cats/${catId}/records`,
  UPDATE_RECORD: (id) => `${API_BASE_URL}/api/records/${id}`
};

export const API_ENDPOINTS = {
  ...AUTH_ENDPOINTS,
  ...CAT_ENDPOINTS,
  ...HEALTH_RECORD_ENDPOINTS
};