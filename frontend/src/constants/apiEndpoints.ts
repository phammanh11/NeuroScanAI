const rawMockMode = String(import.meta.env.VITE_MOCK_MODE ?? 'true').trim().toLowerCase();
const rawLatency = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 550);

export const ENV_CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  MOCK_MODE: !['false', '0', 'no', 'off'].includes(rawMockMode),
  MOCK_LATENCY_MS: Number.isFinite(rawLatency) && rawLatency >= 0 ? rawLatency : 550,
} as const;

/**
 * Danh sách các endpoint dự kiến kết nối với Backend FastAPI.
 * Đặt tập trung tại đây để dễ dàng điều chỉnh khi thống nhất hợp đồng API với nhóm Backend.
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    ME: '/auth/me',
  },
  MRI: {
    ANALYSES: '/mri/analyses',
    ANALYSIS_DETAIL: (id: string) => `/mri/analyses/${id}`,
    REQUEST_DOCTOR_REVIEW: (id: string) => `/mri/analyses/${id}/request-review`,
  },
  DOCTOR: {
    CASES: '/doctor/cases',
    CASE_DETAIL: (id: string) => `/doctor/cases/${id}`,
    SUBMIT_REVIEW: (id: string) => `/doctor/cases/${id}/review`,
  },
  CHAT: {
    SESSIONS: '/chat/sessions',
    SESSION_DETAIL: (id: string) => `/chat/sessions/${id}`,
    MESSAGES: '/chat/messages',
  },
  KNOWLEDGE: {
    ARTICLES: '/knowledge/articles',
    ARTICLE_DETAIL: (slug: string) => `/knowledge/articles/${slug}`,
  },
  PROFILE: {
    UPDATE: '/users/me',
  },
} as const;
