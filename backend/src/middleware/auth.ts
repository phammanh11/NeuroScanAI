import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { WorkerEnv } from '../db/init';
import type { User } from '../../shared/types';
import { sha256Hex } from '../utils/crypto';
import { fail } from '../utils/response';

export const SESSION_COOKIE_NAME = 'neuroscan_session';

export async function getAuthenticatedUser(
  c: Context<{ Bindings: WorkerEnv; Variables: any }>
): Promise<User | null> {
  const token =
    c.req.header('Authorization')?.replace(/^Bearer\s+/i, '') ||
    getCookie(c, SESSION_COOKIE_NAME);

  if (!token) return null;

  try {
    const tokenHash = await sha256Hex(token);
    const session = await c.env.DB.prepare(
      `SELECT s.*, u.* FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND u.is_active = 1`
    )
      .bind(tokenHash)
      .first<any>();

    if (!session) return null;

    return {
      id: session.user_id,
      email: session.email,
      full_name: session.full_name,
      role: session.role,
      specialty: session.specialty,
      organization: session.organization,
      license_code: session.license_code,
      phone: session.phone,
      is_active: session.is_active,
      created_at: session.created_at,
      updated_at: session.updated_at,
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
  if (!user || user.role !== 'DOCTOR') {
    return fail(c, 'FORBIDDEN', 'Bạn không có quyền Bác sĩ chuyên khoa để thực hiện thao tác này.', 403);
  }
  c.set('user', user);
  await next();
};

