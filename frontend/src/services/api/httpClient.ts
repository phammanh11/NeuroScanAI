import axios from 'axios';
import { ENV_CONFIG } from '@/constants/apiEndpoints';

export const httpClient = axios.create({
  baseURL: ENV_CONFIG.API_BASE_URL,
  timeout: 25000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

let inMemoryAccessToken: string | null = null;
let isCookieAuthenticated = false;

export function setHttpAuthToken(token: string | null) {
  inMemoryAccessToken = token;
  if (token) {
    isCookieAuthenticated = true;
  }
}

export function setCookieAuthActive(active: boolean) {
  isCookieAuthenticated = active;
  if (!active) {
    inMemoryAccessToken = null;
  }
}

export function hasHttpAuthToken(): boolean {
  return Boolean(inMemoryAccessToken || isCookieAuthenticated);
}

httpClient.interceptors.request.use((config) => {
  if (inMemoryAccessToken && config.headers) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  return config;
});
