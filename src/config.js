const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const API_ENDPOINTS = {
  // Auth endpoints
  REGISTER: `${API_BASE_URL}/register`,
  LOGIN: `${API_BASE_URL}/login`,
  
  // Cat endpoints
  GET_CATS: `${API_BASE_URL}/cats`,
  GET_CAT: `${API_BASE_URL}/cats`,
  CREATE_CAT: `${API_BASE_URL}/cats`,
  UPDATE_CAT: `${API_BASE_URL}/cats`,

  // Health record endpoints
  GET_CAT_RECORDS: `${API_BASE_URL}/cats`,
  CREATE_RECORD: `${API_BASE_URL}/cats`,
  UPDATE_RECORD: `${API_BASE_URL}/records`
};