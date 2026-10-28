export function formatDateTimeVN(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoDate;
  }
}

export function formatDateVN(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoDate;
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'N/A';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatPercent(score: number | null | undefined): string {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return 'N/A';
  }
  const normalized = Math.min(Math.max(score, 0), 1);
  return `${(normalized * 100).toFixed(1)}%`;
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

const anonymousFileTokens = new Map<string, string>();

function createAnonymousToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = crypto.getRandomValues(new Uint32Array(2));
    return Array.from(values, (value) => value.toString(36)).join('').slice(0, 12);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Ẩn thông tin nhạy cảm có thể tồn tại trong tên file người dùng tải lên
 * trước khi hiển thị trên giao diện hoặc gửi đi trong mock mode.
 */
export function sanitizeMedicalFileName(
  originalName: string,
  anonymizationScope = 'session',
): string {
  const parts = originalName.split('.');
  const requestedExt = parts.length > 1 ? parts.pop()?.toLowerCase() ?? 'png' : 'png';
  const ext = ['png', 'jpg', 'jpeg', 'svg'].includes(requestedExt) ? requestedExt : 'png';

  // Không giữ lại bất kỳ phần nào của tên gốc. Token ngẫu nhiên theo phạm vi tài khoản
  // tránh việc suy đoán tên gốc và tránh tương quan cùng một filename giữa các tài khoản.
  const tokenKey = `${anonymizationScope}\u0000${originalName}`;
  let anonymousToken = anonymousFileTokens.get(tokenKey);
  if (!anonymousToken) {
    anonymousToken = createAnonymousToken();
    anonymousFileTokens.set(tokenKey, anonymousToken);
  }
  return `mri_anon_${anonymousToken}.${ext}`;
}
