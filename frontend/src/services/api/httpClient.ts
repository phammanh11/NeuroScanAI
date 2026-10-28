import axios from 'axios';
import { ENV_CONFIG } from '@/constants/apiEndpoints';

export const httpClient = axios.create({
  baseURL: ENV_CONFIG.API_BASE_URL,
  timeout: 25000,
  headers: {
    Accept: 'application/json',
  },
});

let inMemoryAccessToken: string | null = null;

export function setHttpAuthToken(token: string | null) {
  inMemoryAccessToken = token;
}

httpClient.interceptors.request.use((config) => {
  if (inMemoryAccessToken && config.headers) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  return config;
});
