const rawMockMode = String(import.meta.env.VITE_MOCK_MODE ?? 'false').trim().toLowerCase();
const rawLatency = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 300);

export const ENV_CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  MOCK_MODE: ['true', '1', 'yes'].includes(rawMockMode),
  MOCK_LATENCY_MS: Number.isFinite(rawLatency) && rawLatency >= 0 ? rawLatency : 300,
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  MRI: {
    UPLOAD: '/scans',
    PREDICT: '/predict',
    PREDICTIONS: '/predictions',
    PREDICTION_DETAIL: (id: string | number) => `/predictions/${id}`,
    REVIEW: '/reviews',
  },
  CHAT: {
    SEND: '/chat',
    HISTORY: '/chat/history',
    SESSIONS: '/chat/sessions',
  },
  FAQ: {
    LIST: '/faq',
    CREATE: '/faq',
    UPDATE: (id: string | number) => `/faq/${id}`,
    DELETE: (id: string | number) => `/faq/${id}`,
  },
  PATIENTS: {
    LIST: '/patients',
    DETAIL: (id: string | number) => `/patients/${id}`,
    CREATE: '/patients',
    UPDATE: (id: string | number) => `/patients/${id}`,
    DELETE: (id: string | number) => `/patients/${id}`,
  },
  STATS: '/stats',
} as const;
