import { API_ENDPOINTS, ENV_CONFIG } from '@/constants/apiEndpoints';

interface TelemetryPayload {
  source: 'frontend_window' | 'frontend_promise' | 'react_boundary';
  level: 'error' | 'warn';
  message: string;
  stack?: string;
  route?: string;
}

const recentFingerprints = new Map<string, number>();
const DEDUPE_WINDOW_MS = 10_000;
let initialized = false;

export function reportClientError(payload: TelemetryPayload): void {
  if (ENV_CONFIG.MOCK_MODE) return;
  try {
    const fingerprint = `${payload.source}:${payload.message.slice(0, 120)}`;
    const now = Date.now();
    const lastSent = recentFingerprints.get(fingerprint) ?? 0;
    if (now - lastSent < DEDUPE_WINDOW_MS) return;
    recentFingerprints.set(fingerprint, now);

    const url = `${ENV_CONFIG.API_BASE_URL}${API_ENDPOINTS.TELEMETRY.ERROR}`;
    const body = JSON.stringify({
      source: payload.source,
      level: payload.level,
      message: payload.message.slice(0, 400),
      stack: (payload.stack || '').slice(0, 1200),
      route: payload.route || (typeof window !== 'undefined' ? window.location.pathname : ''),
    });

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      void fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Telemetry không bao giờ được phép làm lỗi ứng dụng chính
  }
}

export function initGlobalErrorTelemetry(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('error', (event) => {
    const message = event.message || 'Unhandled window error';
    // Bỏ qua lỗi ResizeObserver vô hại của trình duyệt
    if (message.includes('ResizeObserver loop')) return;
    reportClientError({
      source: 'frontend_window',
      level: 'error',
      message,
      stack: event.error instanceof Error ? event.error.stack : `${event.filename}:${event.lineno}:${event.colno}`,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection';
    reportClientError({
      source: 'frontend_promise',
      level: 'error',
      message,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}
