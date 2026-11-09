import { hashPassword } from '../utils/crypto';

export interface WorkerEnv {
  DB: D1Database;
  BUCKET: R2Bucket;
  SESSION_KV?: KVNamespace;
  RATE_LIMITER?: any;
  AI?: any;
  VECTORIZE?: any;
  ASSETS?: Fetcher;
  ENVIRONMENT?: string;
  CF_EMBEDDING_MODEL?: string;
  CF_LLM_MODEL?: string;
  AI_GATEWAY_ID?: string;
  GEMINI_API_KEY?: string;
}

let initialized = false;

export async function ensureDatabaseInitialized(env: WorkerEnv): Promise<void> {
  if (initialized || !env.DB) return;

  try {
    // 1. Kiểm tra và nạp tài khoản Doctor Test
    const doctorExists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind('demo.doctor@neuroscan.vn').first();
    if (!doctorExists) {
      const { hash, salt } = await hashPassword('Doctor@123');
      await env.DB.prepare(`
        INSERT OR IGNORE INTO users (id, email, password_hash, password_salt, role, full_name)
        VALUES (1, 'demo.doctor@neuroscan.vn', ?, ?, 'doctor', 'BS.CKII Trần Quốc Bảo')
      `).bind(hash, salt).run();

      await env.DB.prepare(`
        INSERT OR IGNORE INTO doctors (user_id, specialty, license_no, organization, phone)
        VALUES (1, 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)', 'CCHN-2026-NEURO-8841', 'Khoa Chẩn đoán Hình ảnh & Ngoại Thần kinh', '0909 000 222')
      `).run();
    }

    // 2. Kiểm tra và nạp tài khoản Patient Test
    const userExists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind('demo.user@neuroscan.vn').first();
    if (!userExists) {
      const { hash, salt } = await hashPassword('User@123');
      await env.DB.prepare(`
        INSERT OR IGNORE INTO users (id, email, password_hash, password_salt, role, full_name)
        VALUES (2, 'demo.user@neuroscan.vn', ?, ?, 'patient', 'Nguyễn Minh An')
      `).bind(hash, salt).run();

      await env.DB.prepare(`
        INSERT OR IGNORE INTO patients (user_id, date_of_birth, phone)
        VALUES (2, '1981-05-12', '0912 345 678')
      `).run();
    }

    // 3. Kiểm tra và nạp tài khoản Admin Test
    const adminExists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind('admin@neuroscan.vn').first();
    if (!adminExists) {
      const { hash, salt } = await hashPassword('Admin@123');
      await env.DB.prepare(`
        INSERT OR IGNORE INTO users (id, email, password_hash, password_salt, role, full_name)
        VALUES (3, 'admin@neuroscan.vn', ?, ?, 'admin', 'Quản trị viên Hệ thống')
      `).bind(hash, salt).run();
    }

    initialized = true;
  } catch (err) {
    console.warn('[DB Init Warning]:', (err as Error)?.message);
  }
}
