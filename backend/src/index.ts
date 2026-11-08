import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { ensureDatabaseInitialized, type WorkerEnv } from './db/init';
import { createFallbackD1, createFallbackR2, createFallbackVectorize } from './db/fallback';
import { ok, fail } from './utils/response';
import { generateRandomHex, sha256Hex, verifyPassword } from './utils/crypto';
import { handleMedicalChat } from './utils/chatbot';
import {
  SESSION_COOKIE_NAME,
  requireAuth,
  requireDoctor,
  getAuthenticatedUser,
} from './middleware/auth';
import type { User, Patient, MriScan } from '../shared/types';

type AppVariables = {
  user: User;
};

export const app = new Hono<{ Bindings: WorkerEnv; Variables: AppVariables }>();

// 1. Global CORS & Security Headers
app.use(
  '/api/*',
  cors({
    origin: (origin) => origin || '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Session-Token',
    ],
    credentials: true,
  })
);

const fallbackD1 = createFallbackD1();
const fallbackR2 = createFallbackR2();
const fallbackVectorize = createFallbackVectorize();

// 2. Middleware gắn kết DB (D1) và BUCKET (R2) kèm fallback tự động
app.use('/api/*', async (c, next) => {
  if (!c.env.DB) {
    (c.env as any).DB = fallbackD1;
  } else {
    await ensureDatabaseInitialized(c.env);
  }

  if (!c.env.BUCKET) {
    (c.env as any).BUCKET = fallbackR2;
  }

  if (!c.env.VECTORIZE) {
    (c.env as any).VECTORIZE = fallbackVectorize;
  }

  await next();
});

// 3. Error Handling tập trung
app.onError((err, c) => {
  console.error('[API Error]:', err.message);
  return fail(
    c,
    'INTERNAL_SERVER_ERROR',
    'Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau.',
    500
  );
});

// ============================================================================
// PUBLIC & HEALTH APIs
// ============================================================================

app.get('/api/v1/health', async (c) => {
  let dbStatus = 'connected';
  let r2Status = 'connected';
  let d1ChunksCount = 0;

  try {
    const res = await c.env.DB.prepare('SELECT count(*) as count FROM rag_chunks').first<{ count: number }>();
    d1ChunksCount = res?.count || 0;
  } catch {
    dbStatus = 'degraded_or_fallback';
  }

  return ok(c, {
    status: 'healthy',
    project: 'NeuroScan AI — Brain Tumor MRI & Medical Assistant',
    service: 'Cloudflare Pages / Workers Edge Runtime',
    runtime: 'Cloudflare Workers (Hono)',
    storage: {
      database: 'Cloudflare D1 (SQLite)',
      databaseStatus: dbStatus,
      mediaStorage: 'Cloudflare R2 (Object Storage)',
      mediaStatus: r2Status,
      vectorDatabase: c.env.VECTORIZE ? 'Cloudflare Vectorize' : 'D1 Vector Store',
      ragChunksIndexed: d1ChunksCount,
    },
    ai: {
      llmModel: c.env.CF_LLM_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      embeddingModel: c.env.CF_EMBEDDING_MODEL || '@cf/baai/bge-m3',
      geminiFallback: !!c.env.GEMINI_API_KEY,
    },
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// AUTHENTICATION APIs
// ============================================================================

// Đăng nhập (Xác thực D1 PBKDF2)
app.post('/api/v1/auth/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!email || !password) {
    return fail(c, 'INVALID_INPUT', 'Vui lòng nhập đầy đủ Email và Mật khẩu.', 400);
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1')
    .bind(email)
    .first<any>();

  if (!user) {
    return fail(c, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác.', 401);
  }

  const isValid = await verifyPassword(password, user.password_hash, user.password_salt);
  if (!isValid) {
    return fail(c, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác.', 401);
  }

  // Tạo token phiên ngẫu nhiên (32 bytes Hex)
  const token = generateRandomHex(32);
  const tokenHash = await sha256Hex(token);
  const csrfToken = generateRandomHex(16);

  // Lưu phiên 7 ngày vào bảng sessions của D1
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  const ua = c.req.header('user-agent') || 'Unknown';

  await c.env.DB.prepare(
    'INSERT INTO sessions (token_hash, user_id, csrf_token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(tokenHash, user.id, csrfToken, ip, ua, expiresAt)
    .run();

  // Đặt cookie HttpOnly
  setCookie(c, SESSION_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60,
  });

  const userProfile: User = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    specialty: user.specialty,
    organization: user.organization,
    license_code: user.license_code,
    phone: user.phone,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };

  return ok(c, {
    token,
    user: userProfile,
  }, 'Đăng nhập thành công');
});

// Lấy thông tin tài khoản hiện tại
app.get('/api/v1/auth/me', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return fail(c, 'UNAUTHORIZED', 'Chưa đăng nhập', 401);
  }
  return ok(c, { user });
});

// Đăng xuất
app.post('/api/v1/auth/logout', async (c) => {
  const token =
    c.req.header('Authorization')?.replace(/^Bearer\s+/i, '') ||
    getCookie(c, SESSION_COOKIE_NAME);

  if (token) {
    try {
      const tokenHash = await sha256Hex(token);
      await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
    } catch {}
  }

  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
  return ok(c, { loggedOut: true }, 'Đã đăng xuất an toàn');
});

// ============================================================================
// PATIENTS APIs (Quản lý Hồ sơ Bệnh nhân - D1)
// ============================================================================

app.get('/api/v1/patients', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM patients ORDER BY updated_at DESC').all<Patient>();
  return ok(c, { patients: results || [] });
});

app.get('/api/v1/patients/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const patient = await c.env.DB.prepare('SELECT * FROM patients WHERE id = ?').bind(id).first<Patient>();
  if (!patient) {
    return fail(c, 'NOT_FOUND', 'Không tìm thấy hồ sơ bệnh nhân', 404);
  }
  const { results: scans } = await c.env.DB.prepare('SELECT * FROM mri_scans WHERE patient_id = ? ORDER BY created_at DESC')
    .bind(id)
    .all<MriScan>();

  return ok(c, { patient, scans: scans || [] });
});

app.post('/api/v1/patients', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (!body.full_name || !body.age) {
    return fail(c, 'INVALID_INPUT', 'Vui lòng điền họ tên và tuổi bệnh nhân', 400);
  }

  const mrn = body.mrn || `NS-BN-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
  await c.env.DB.prepare(`
    INSERT INTO patients (mrn, full_name, age, gender, phone, email, address, clinical_history, symptoms, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      mrn,
      body.full_name,
      Number(body.age),
      body.gender || 'Nam',
      body.phone || '',
      body.email || '',
      body.address || '',
      body.clinical_history || '',
      body.symptoms || '',
      body.status || 'Đang theo dõi'
    )
    .run();

  const created = await c.env.DB.prepare('SELECT * FROM patients WHERE mrn = ?').bind(mrn).first<Patient>();
  return ok(c, { patient: created }, 'Đã thêm bệnh nhân thành công', 201);
});

// ============================================================================
// MRI SCANS & CLOUDFLARE R2 STORAGE APIs
// ============================================================================

// Tải ảnh MRI lên Cloudflare R2 và lưu bản ghi vào D1
app.post('/api/v1/mri/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const patientId = formData.get('patientId') ? Number(formData.get('patientId')) : 1;
    const patientName = (formData.get('patientName') as string) || 'Bệnh nhân';
    const sliceType = (formData.get('sliceType') as string) || 'Axial (Trục ngang)';
    const sequenceType = (formData.get('sequenceType') as string) || 'T1-Gd (Contrast)';

    if (!file) {
      return fail(c, 'FILE_REQUIRED', 'Vui lòng chọn tệp ảnh chụp MRI (PNG, JPG hoặc DICOM).', 400);
    }

    const originalName = file.name || 'scan.png';
    const mimeType = file.type || 'image/png';
    const fileSize = file.size || 0;

    // Đặt khóa lưu trữ trên Cloudflare R2
    const cleanFileName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileKey = `scans/${Date.now()}_${cleanFileName}`;

    // Đọc Buffer và upload lên R2 Bucket
    const fileBuffer = await file.arrayBuffer();
    await c.env.BUCKET.put(fileKey, fileBuffer, {
      httpMetadata: {
        contentType: mimeType,
      },
      customMetadata: {
        originalName,
        uploadedAt: new Date().toISOString(),
      },
    });

    const scanCode = `SCAN-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const fileUrl = `/api/v1/files/${fileKey}`;
    const status = 'PENDING_MODEL';
    const findings =
      'Ảnh chụp MRI đã được tải lên và lưu trữ an toàn trên Cloudflare R2. Tình trạng phân loại AI đang tạm chờ nạp trọng số mô hình sau huấn luyện.';

    // Lưu bản ghi vào Cloudflare D1
    await c.env.DB.prepare(`
      INSERT INTO mri_scans (
        scan_code, patient_id, patient_name, file_name, file_key, file_url, file_size, mime_type, slice_type, sequence_type, status, findings_summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        scanCode,
        patientId,
        patientName,
        originalName,
        fileKey,
        fileUrl,
        fileSize,
        mimeType,
        sliceType,
        sequenceType,
        status,
        findings
      )
      .run();

    const scan = await c.env.DB.prepare('SELECT * FROM mri_scans WHERE scan_code = ?').bind(scanCode).first<MriScan>();

    return ok(
      c,
      {
        scan,
        message: 'Tải ảnh MRI lên Cloudflare R2 thành công. Tình trạng phân loại đang chờ nạp trọng số mô hình AI.',
      },
      'Tải lên Cloudflare R2 thành công',
      201
    );
  } catch (err) {
    console.error('[Upload Error]:', err);
    return fail(c, 'UPLOAD_FAILED', `Lỗi khi lưu trữ ảnh lên Cloudflare R2: ${(err as Error)?.message}`, 500);
  }
});

// Lấy danh sách phim chụp MRI
app.get('/api/v1/mri/scans', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM mri_scans ORDER BY created_at DESC').all<MriScan>();
  return ok(c, { scans: results || [] });
});

// Lấy chi tiết một ca chụp MRI
app.get('/api/v1/mri/scans/:id', async (c) => {
  const id = c.req.param('id');
  const scan = await c.env.DB.prepare('SELECT * FROM mri_scans WHERE id = ? OR scan_code = ?')
    .bind(isNaN(Number(id)) ? -1 : Number(id), id)
    .first<MriScan>();

  if (!scan) {
    return fail(c, 'NOT_FOUND', 'Không tìm thấy ca chụp MRI', 404);
  }
  return ok(c, { scan });
});

// Phê duyệt hoặc cập nhật ghi chú của bác sĩ cho ca chụp
app.patch('/api/v1/mri/scans/:id/review', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => ({}));
  const doctorNotes = body.doctorNotes || '';
  const doctorApproved = body.doctorApproved ? 1 : 0;
  const user = await getAuthenticatedUser(c);

  await c.env.DB.prepare(`
    UPDATE mri_scans
    SET doctor_notes = ?, doctor_approved = ?, approved_by = ?, approved_at = datetime('now'), status = 'REVIEWED', updated_at = datetime('now')
    WHERE id = ?
  `)
    .bind(doctorNotes, doctorApproved, user?.full_name || 'Bác sĩ chuyên khoa', id)
    .run();

  const updated = await c.env.DB.prepare('SELECT * FROM mri_scans WHERE id = ?').bind(id).first<MriScan>();
  return ok(c, { scan: updated }, 'Đã cập nhật đánh giá lâm sàng của Bác sĩ');
});

// ============================================================================
// SERVE MEDIA FILES FROM CLOUDFLARE R2
// ============================================================================

app.get('/api/v1/files/*', async (c) => {
  const path = c.req.path.replace(/^\/api\/v1\/files\//, '');
  if (!path) {
    return fail(c, 'FILE_KEY_REQUIRED', 'Thiếu khóa tệp R2', 400);
  }

  try {
    const object = await c.env.BUCKET.get(path);
    if (!object) {
      return fail(c, 'NOT_FOUND', 'Không tìm thấy tệp trên Cloudflare R2', 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png');
    headers.set('ETag', object.httpEtag || `"${Date.now()}"`);
    headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    return new Response(object.body, { headers });
  } catch (err) {
    console.error('[R2 Read Error]:', err);
    return fail(c, 'R2_ERROR', 'Lỗi truy xuất tệp từ Cloudflare R2', 500);
  }
});

// ============================================================================
// MEDICAL CHATBOT APIs (RAG + WORKERS AI + GEMINI FALLBACK)
// ============================================================================

app.post('/api/v1/chat', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const message = body.message || '';
  const history = body.history || [];
  const sessionId = body.sessionId || 'session-default';

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return fail(c, 'EMPTY_MESSAGE', 'Nội dung câu hỏi không được để trống', 400);
  }

  const responseData = await handleMedicalChat(c, message, history, sessionId);
  return ok(c, responseData);
});

app.get('/api/v1/chat/history', async (c) => {
  const sessionId = c.req.query('sessionId') || 'session-default';
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 50'
  )
    .bind(sessionId)
    .all<any>();

  return ok(c, { messages: results || [] });
});

app.get('/api/v1/chat/rag-status', async (c) => {
  const { results: chunks } = await c.env.DB.prepare(
    'SELECT chunk_id, title, category, source FROM rag_chunks'
  ).all<any>();

  return ok(c, {
    totalChunks: chunks?.length || 0,
    embeddingModel: c.env.CF_EMBEDDING_MODEL || '@cf/baai/bge-m3',
    llmModel: c.env.CF_LLM_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    vectorBackend: c.env.VECTORIZE ? 'Cloudflare Vectorize (Index: neuroscan-vector-index)' : 'Cloudflare D1 SQLite Vector Store',
    chunks: chunks || [],
  });
});

export default app;
