// API Base URL configuration
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://cathealthtracker-api.vercel.app/api'
  : 'http://localhost:3001/api';

// Base URL for the API server (without /api path)
export const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://cathealthtracker-api.vercel.app'
  : 'http://localhost:3001';

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
  UPDATE_CAT: `${API_BASE_URL}/cats`,
  DELETE_CAT: `${BASE_URL}/api/cats`
};

// Health Record endpoints
const HEALTH_RECORD_ENDPOINTS = {
  GET_CAT_RECORDS: `${API_BASE_URL}/cats`,
  CREATE_RECORD: `${API_BASE_URL}/cats`,
  UPDATE_RECORD: `${API_BASE_URL}/records`,
  DELETE_RECORD: `${API_BASE_URL}/records`
};

// Insurance endpoints
const INSURANCE_ENDPOINTS = {
  GET_CAT_INSURANCE: `${API_BASE_URL}/cats`,
  UPDATE_INSURANCE: `${API_BASE_URL}/insurance`
};

export const API_ENDPOINTS = {
  BASE_URL,
  ...AUTH_ENDPOINTS,
  ...CAT_ENDPOINTS,
  ...HEALTH_RECORD_ENDPOINTS,
  ...INSURANCE_ENDPOINTS
};