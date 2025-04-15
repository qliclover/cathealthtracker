// API Base URL配置
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://cathealthtracker-api.vercel.app/api'
  : 'http://localhost:3001/api';

// Auth endpoints
const AUTH_ENDPOINTS = {
  REGISTER: `${API_BASE_URL}/register`,
  LOGIN: `${API_BASE_URL}/login`
};

// Cat endpoints
const CAT_ENDPOINTS = {
  GET_CATS: `${API_BASE_URL}/cats`,
  GET_CAT: `${API_BASE_URL}/cats`,
  CREATE_CAT: `${API_BASE_URL}/cats`,
  UPDATE_CAT: `${API_BASE_URL}/cats`
};

// Health Record endpoints
const HEALTH_RECORD_ENDPOINTS = {
  GET_CAT_RECORDS: `${API_BASE_URL}/cats`,
  CREATE_RECORD: `${API_BASE_URL}/cats`,
  UPDATE_RECORD: `${API_BASE_URL}/records`
};

export const API_ENDPOINTS = {
  ...AUTH_ENDPOINTS,
  ...CAT_ENDPOINTS,
  ...HEALTH_RECORD_ENDPOINTS
};