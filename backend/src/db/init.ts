import { hashPassword } from '../utils/crypto';

export interface WorkerEnv {
  DB: D1Database;
  BUCKET: R2Bucket;
  AI?: any;
  VECTORIZE?: any;
  ASSETS?: Fetcher;
  ENVIRONMENT?: string;
  CF_EMBEDDING_MODEL?: string;
  CF_LLM_MODEL?: string;
  GEMINI_API_KEY?: string;
}

let initialized = false;

export async function ensureDatabaseInitialized(env: WorkerEnv): Promise<void> {
  if (initialized || !env.DB) return;

  try {
    // 2. Đảm bảo tài khoản Doctor Test và User Test luôn tồn tại
    const doctorExists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind('demo.doctor@neuroscan.vn').first();
    if (!doctorExists) {
      const { hash, salt } = await hashPassword('Doctor@123');
      await env.DB.prepare(`
        INSERT OR IGNORE INTO users (id, email, full_name, password_hash, password_salt, role, specialty, organization, license_code, phone)
        VALUES (1, 'demo.doctor@neuroscan.vn', 'BS.CKII Trần Quốc Bảo', ?, ?, 'DOCTOR', 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)', 'Khoa Chẩn đoán Hình ảnh & Ngoại Thần kinh', 'DEMO-CCHN-2026-8841', '0909 000 222')
      `).bind(hash, salt).run();
    }

    const userExists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind('demo.user@neuroscan.vn').first();
    if (!userExists) {
      const { hash, salt } = await hashPassword('User@123');
      await env.DB.prepare(`
        INSERT OR IGNORE INTO users (id, email, full_name, password_hash, password_salt, role, phone)
        VALUES (2, 'demo.user@neuroscan.vn', 'Nguyễn Minh An (Bệnh nhân)', ?, ?, 'USER', '0912 345 678')
      `).bind(hash, salt).run();
    }
    initialized = true;
  } catch (err) {
    console.warn('[DB Init Warning]:', (err as Error)?.message);
  }
}

