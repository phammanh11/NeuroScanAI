const rawMockMode = String(import.meta.env.VITE_MOCK_MODE ?? 'false').trim().toLowerCase();
const rawLatency = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 300);

export const ENV_CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  MOCK_MODE: ['true', '1', 'yes'].includes(rawMockMode),
  MOCK_LATENCY_MS: Number.isFinite(rawLatency) && rawLatency >= 0 ? rawLatency : 300,
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  MRI: {
    UPLOAD: '/mri/upload',
    SCANS: '/mri/scans',
    SCAN_DETAIL: (id: string | number) => `/mri/scans/${id}`,
    REVIEW: (id: string | number) => `/mri/scans/${id}/review`,
  },
  PATIENTS: {
    LIST: '/patients',
    DETAIL: (id: string | number) => `/patients/${id}`,
  },
  CHAT: {
    SEND: '/chat',
    HISTORY: '/chat/history',
    RAG_STATUS: '/chat/rag-status',
  },
} as const;
