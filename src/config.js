const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const API_ENDPOINTS = {
  // Auth endpoints
  REGISTER: `${API_BASE_URL}/auth/register`,
  LOGIN: `${API_BASE_URL}/auth/login`,
  VERIFY_TOKEN: `${API_BASE_URL}/auth/verify-token`,
  GET_USER: `${API_BASE_URL}/auth/user`,
  
  // Cat endpoints
  GET_CATS: `${API_BASE_URL}/cats`,
  GET_CAT: (id) => `${API_BASE_URL}/cats/${id}`,
  CREATE_CAT: `${API_BASE_URL}/cats`,
  UPDATE_CAT: (id) => `${API_BASE_URL}/cats/${id}`,

  // Health record endpoints
  GET_CAT_RECORDS: (catId) => `${API_BASE_URL}/cats/${catId}/records`,
  CREATE_RECORD: (catId) => `${API_BASE_URL}/cats/${catId}/records`,
  UPDATE_RECORD: (recordId) => `${API_BASE_URL}/records/${recordId}`
};