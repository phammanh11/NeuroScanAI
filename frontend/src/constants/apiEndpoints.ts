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
    PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  ADMIN: {
    DOCTORS: '/admin/doctors',
    DOCTOR_STATUS: (id: string | number) => `/admin/doctors/${id}/status`,
    AUDIT_LOGS: '/audit-logs',
    TELEMETRY: '/admin/telemetry',
  },
  TELEMETRY: {
    ERROR: '/telemetry/error',
  },
  RAG: {
    INDEX: '/rag/index',
  },
  MRI: {
    UPLOAD: '/scans',
    PREDICT: '/predict',
    PREDICTIONS: '/predictions',
    PREDICTION_DETAIL: (id: string | number) => `/predictions/${id}`,
    REQUEST_REVIEW: (id: string | number) => `/predictions/${id}/request-review`,
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
