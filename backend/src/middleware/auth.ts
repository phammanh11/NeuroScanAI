import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { WorkerEnv } from '../db/init';
import type { User } from '../../shared/types';
import { sha256Hex, verifySessionToken } from '../utils/crypto';
import { fail } from '../utils/response';

export const SESSION_COOKIE_NAME = 'neuroscan_session';

export function getSessionSecret(env: WorkerEnv): string {
  return env.SESSION_SECRET || 'neuroscan-edge-hmac-v1-signing-secret-2026';
}

export function extractSessionToken(
  c: Context<{ Bindings: WorkerEnv; Variables: any }>
): string | null {
  return (
    c.req.header('Authorization')?.replace(/^Bearer\s+/i, '').trim() ||
    c.req.header('X-Session-Token')?.trim() ||
    getCookie(c, SESSION_COOKIE_NAME) ||
    null
  );
}

export async function getAuthenticatedUser(
  c: Context<{ Bindings: WorkerEnv; Variables: any }>
): Promise<User | null> {
  const token = extractSessionToken(c);
  if (!token) return null;

  try {
    const tokenHash = await sha256Hex(token);

    // 1. Kiểm tra nhanh qua Cloudflare KV nếu đã cấu hình
    // 1. Xác thực chữ ký số HMAC-SHA256 & hạn sử dụng của phiên (chặn hoàn toàn token giả mạo)
    const verified = await verifySessionToken(token, getSessionSecret(c.env));
    if (!verified) {
      return null;
    }

    // 2. Kiểm tra trạng thái thu hồi phiên trong bảng user_sessions trên D1 (logout / khóa tài khoản)
    try {
      const revokedRow: any = await c.env.DB.prepare(
        'SELECT revoked FROM user_sessions WHERE token_hash = ?'
      )
        .bind(tokenHash)
        .first();
      if (revokedRow && Number(revokedRow.revoked) === 1) {
        return null;
      }
    } catch {
      // Bảng user_sessions có thể chưa tồn tại ở lần khởi tạo đầu
    }

    // 3. Tra cứu nhanh thông tin user từ Cloudflare KV (chỉ khi token chưa bị thu hồi)
    if (c.env.SESSION_KV) {
      try {
        const kvData = await c.env.SESSION_KV.get(`session:${tokenHash}`);
        if (kvData) {
          const parsed = JSON.parse(kvData);
          if (parsed && parsed.id) {
            return parsed as User;
          }
        }
      } catch (kvErr) {
        console.warn('[KV Read Warning]:', (kvErr as Error)?.message);
      }
    }

    const user: any = await c.env.DB.prepare(`
      SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.created_at,
             d.specialty, d.license_no, d.organization, d.phone as doctor_phone,
             p.phone as patient_phone, p.date_of_birth
      FROM users u
      LEFT JOIN doctors d ON d.user_id = u.id
      LEFT JOIN patients p ON p.user_id = u.id
      WHERE u.id = ?
    `)
      .bind(verified.uid)
      .first()
      .catch(async () => {
        return await c.env.DB.prepare(
          'SELECT id, email, full_name, role, is_active, created_at FROM users WHERE id = ?'
        )
          .bind(verified.uid)
          .first();
      });

    if (!user || user.is_active === 0) return null;

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: (user.role as 'patient' | 'doctor' | 'admin') || 'patient',
      specialty: user.specialty,
      license_no: user.license_no,
      organization: user.organization,
      phone: user.doctor_phone || user.patient_phone || '',
      date_of_birth: user.date_of_birth,
      created_at: user.created_at,
    };
  } catch (err) {
    console.warn('[Auth Middleware Warning]:', (err as Error)?.message);
    return null;
  }
}

export const requireAuth: MiddlewareHandler<{ Bindings: WorkerEnv; Variables: any }> = async (c, next) => {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return fail(c, 'UNAUTHORIZED', 'Phiên làm việc đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.', 401);
  }
  c.set('user', user);
  await next();
};

export const requireDoctor: MiddlewareHandler<{ Bindings: WorkerEnv; Variables: any }> = async (c, next) => {
  const user = await getAuthenticatedUser(c);
  if (!user || (user.role !== 'doctor' && (user.role as any) !== 'DOCTOR')) {
    return fail(c, 'FORBIDDEN', 'Bạn không có quyền Bác sĩ chuyên khoa để thực hiện thao tác này.', 403);
  }
  c.set('user', user);
  await next();
};

export const requireAdmin: MiddlewareHandler<{ Bindings: WorkerEnv; Variables: any }> = async (c, next) => {
  const user = await getAuthenticatedUser(c);
  if (!user || (user.role !== 'admin' && (user.role as any) !== 'ADMIN')) {
    return fail(c, 'FORBIDDEN', 'Bạn không có quyền Quản trị viên hệ thống để thực hiện thao tác này.', 403);
  }
  c.set('user', user);
  await next();
};
