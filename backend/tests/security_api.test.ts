/**
 * ============================================================================
 * NEUROSCAN AI — AUTOMATED SECURITY, RBAC, IDOR & DATA LIFECYCLE TEST SUITE
 * ============================================================================
 */
import assert from 'node:assert/strict';
import { app } from '../src/index';
import { createFallbackD1, createFallbackKV, createFallbackR2, createFallbackVectorize, memoryStore } from '../src/db/fallback';
import type { WorkerEnv } from '../src/db/init';

function createTestEnv(): WorkerEnv {
  return {
    DB: createFallbackD1(),
    BUCKET: createFallbackR2(),
    SESSION_KV: createFallbackKV(),
    VECTORIZE: createFallbackVectorize(),
    ENVIRONMENT: 'test',
    SESSION_SECRET: 'test-hmac-secret-key-2026',
  };
}

async function req(
  env: WorkerEnv,
  path: string,
  init: RequestInit = {}
): Promise<{ status: number; json: any; res: Response }> {
  const res = await app.fetch(new Request(`http://localhost${path}`, init), env);
  let json: any = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    json = await res.json();
  }
  return { status: res.status, json, res };
}

async function runTests() {
  const env = createTestEnv();
  let passed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      passed++;
      console.log(`✅ PASS: ${name}`);
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  await test('1. Chặn hoàn toàn token giả mạo (Bearer doctor / admin / user-1-doctor-fake)', async () => {
    for (const fake of ['doctor', 'admin', 'user-1-doctor-abc123', 'ns1.ZmFrZQ.badsignature']) {
      const me = await req(env, '/api/auth/me', { headers: { Authorization: `Bearer ${fake}` } });
      assert.equal(me.status, 401, `Expected 401 for fake token "${fake}", got ${me.status}`);

      const patients = await req(env, '/api/patients', { headers: { Authorization: `Bearer ${fake}` } });
      assert.equal(patients.status, 403, `Expected 403 on /api/patients for "${fake}", got ${patients.status}`);
    }
  });

  let doctorToken = '';
  let patientToken = '';

  await test('2. Đăng nhập hợp lệ cấp phát Signed HMAC Token (ns1.*) cho Doctor & Patient', async () => {
    const docLogin = await req(env, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo.doctor@neuroscan.vn', password: 'Doctor@123' }),
    });
    assert.equal(docLogin.status, 200);
    doctorToken = docLogin.json.data.token;
    assert.ok(doctorToken.startsWith('ns1.'), 'Doctor token must be HMAC signed ns1.*');

    const patLogin = await req(env, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo.user@neuroscan.vn', password: 'User@123' }),
    });
    assert.equal(patLogin.status, 200);
    patientToken = patLogin.json.data.token;
    assert.ok(patientToken.startsWith('ns1.'), 'Patient token must be HMAC signed ns1.*');

    const me = await req(env, '/api/auth/me', { headers: { Authorization: `Bearer ${doctorToken}` } });
    assert.equal(me.status, 200);
    assert.equal(me.json.data.user.role, 'doctor');
  });

  await test('3. Thu hồi phiên ngay lập tức sau Logout (Token cũ không còn hiệu lực)', async () => {
    const tempLogin = await req(env, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo.user@neuroscan.vn', password: 'User@123' }),
    });
    const tempToken = tempLogin.json.data.token;

    const logoutRes = await req(env, '/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tempToken}` },
    });
    assert.equal(logoutRes.status, 200);

    const afterLogout = await req(env, '/api/auth/me', {
      headers: { Authorization: `Bearer ${tempToken}` },
    });
    assert.equal(afterLogout.status, 401);
  });

  await test('4. Khóa chặt RBAC trên /api/faq (write), /api/rag/index, /api/stats', async () => {
    const guestFaq = await req(env, '/api/faq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hack', content: 'Injected' }),
    });
    assert.equal(guestFaq.status, 403);

    const patRag = await req(env, '/api/rag/index', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert.equal(patRag.status, 403);

    const guestStats = await req(env, '/api/stats');
    assert.equal(guestStats.status, 403);

    const docStats = await req(env, '/api/stats', {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert.equal(docStats.status, 200);
  });

  await test('5. Bảo vệ ảnh MRI riêng tư trên /api/files/* trong khi giữ sample_scans công khai', async () => {
    const sample = await req(env, '/api/files/sample_scans/sample_glioma_axial.jpg');
    assert.equal(sample.status, 200);

    const privateGuest = await req(env, '/api/files/scans/2/secret.jpg');
    assert.equal(privateGuest.status, 401);
  });

  await test('6. Cô lập Khách trên Chatbot & chặn IDOR lịch sử hội thoại', async () => {
    const guestSessions = await req(env, '/api/chat/sessions');
    assert.equal(guestSessions.status, 401);

    const guestLookup = await req(env, '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Kiểm tra kết quả chụp MRI ca NS-2026-0001' }),
    });
    assert.equal(guestLookup.status, 200);
    assert.equal(guestLookup.json.data.matchedScans, undefined, 'Guest must NOT receive private scans');
    assert.ok(
      String(guestLookup.json.data.reply).includes('ĐĂNG NHẬP'),
      'Guest scan lookup must prompt login'
    );

    // Doctor creates a private chat session; patient tries to read & delete it (IDOR)
    const docSess = await req(env, '/api/chat/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Phiên nội bộ Bác sĩ' }),
    });
    assert.equal(docSess.status, 201);
    const docSessId = docSess.json.data.session.id;

    const patReadIdor = await req(env, `/api/chat/history?sessionId=${docSessId}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert.equal(patReadIdor.status, 403);

    const patDelIdor = await req(env, `/api/chat/sessions/${docSessId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert.equal(patDelIdor.status, 403);
  });

  await test('7. Doctor Review UPSERT không nhân bản dòng khi sửa nhận xét', async () => {
    const beforeCount = memoryStore.doctor_reviews.filter((r) => r.prediction_id === 1).length;
    const rev1 = await req(env, '/api/reviews', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prediction_id: 1,
        confirmed_label: 'Glioma',
        note: 'Nhận xét lần 1',
      }),
    });
    assert.equal(rev1.status, 201);

    const rev2 = await req(env, '/api/reviews', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prediction_id: 1,
        confirmed_label: 'Glioma',
        note: 'Nhận xét lần 2 đã cập nhật',
      }),
    });
    assert.equal(rev2.status, 201);
    const afterRows = memoryStore.doctor_reviews.filter((r) => r.prediction_id === 1);
    assert.equal(afterRows.length, Math.max(1, beforeCount));
    assert.equal(afterRows[0].note, 'Nhận xét lần 2 đã cập nhật');
  });

  await test('8. Lưu Request Review, Cập nhật Hồ sơ & Đổi Mật khẩu xuống DB thật', async () => {
    const reqRev = await req(env, '/api/predictions/1/request-review', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        consentToShareWithDoctor: true,
        patientSymptomNote: 'Đau đầu vùng trán 5 ngày',
      }),
    });
    assert.equal(reqRev.status, 200);
    assert.equal(reqRev.json.data.symptomNote, 'Đau đầu vùng trán 5 ngày');

    const profRes = await req(env, '/api/auth/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fullName: 'Nguyễn Minh An (Đã cập nhật)', phone: '0988777666' }),
    });
    assert.equal(profRes.status, 200);
    assert.equal(profRes.json.data.user.full_name, 'Nguyễn Minh An (Đã cập nhật)');

    const wrongPass = await req(env, '/api/auth/change-password', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword: 'WrongPassword', newPassword: 'NewPass@456' }),
    });
    assert.equal(wrongPass.status, 401);

    const okPass = await req(env, '/api/auth/change-password', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword: 'User@123', newPassword: 'NewPass@456' }),
    });
    assert.equal(okPass.status, 200);

    const oldPassLogin = await req(env, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo.user@neuroscan.vn', password: 'User@123' }),
    });
    assert.equal(oldPassLogin.status, 401, 'Old password must stop working after change-password');

    const newPassLogin = await req(env, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo.user@neuroscan.vn', password: 'NewPass@456' }),
    });
    assert.equal(newPassLogin.status, 200);
  });

  await test('9. Xóa Prediction dọn sạch bản ghi mri_scans & đối tượng R2', async () => {
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' }), 'test_slice.png');

    const upload = await req(env, '/api/scans', {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: formData,
    });
    assert.equal(upload.status, 201);
    const scanId = upload.json.data.scan.id;
    const r2Key = upload.json.data.scan.r2_key;
    assert.ok(memoryStore.r2_objects.has(r2Key), 'R2 object should exist after upload');

    const pred = await req(env, '/api/predict', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scan_id: scanId,
        label: 'No Tumor',
        confidence: 0.98,
        probabilities: { Glioma: 0.01, Meningioma: 0.005, Pituitary: 0.005, 'No Tumor': 0.98 },
      }),
    });
    assert.equal(pred.status, 201);
    const predId = pred.json.data.prediction.id;

    const del = await req(env, `/api/predictions/${predId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert.equal(del.status, 200);
    assert.ok(!memoryStore.r2_objects.has(r2Key), 'R2 object must be deleted when prediction is deleted');
    assert.ok(!memoryStore.mri_scans.some((s) => s.id === scanId), 'Orphaned mri_scans row must be deleted');
  });

  await test('10. Nhật ký kiểm toán (audit_logs): chỉ Doctor/Admin được xem và ghi nhận đủ sự kiện nhạy cảm', async () => {
    const guestAudit = await req(env, '/api/audit-logs');
    assert.equal(guestAudit.status, 403);

    const docAudit = await req(env, '/api/audit-logs', {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert.equal(docAudit.status, 200);
    const logs = docAudit.json.data.logs as Array<{ action: string }>;
    assert.ok(logs.length >= 3, 'Audit logs must contain recorded sensitive actions');
    assert.ok(logs.some((l) => l.action === 'AUTH_LOGIN'), 'Must record AUTH_LOGIN');
    assert.ok(logs.some((l) => l.action === 'DOCTOR_REVIEW_UPSERT'), 'Must record DOCTOR_REVIEW_UPSERT');
    assert.ok(logs.some((l) => l.action === 'PREDICTION_DELETE'), 'Must record PREDICTION_DELETE');
  });

  await test('11. Chặn tự đăng ký vai trò Doctor/Admin qua /api/auth/register (luôn ép về patient)', async () => {
    const reg = await req(env, '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Người dùng thử leo quyền',
        email: 'escalate.test@example.com',
        password: 'StrongPassword123',
        role: 'doctor',
      }),
    });
    assert.equal(reg.status, 201);
    assert.equal(reg.json.data.user.role, 'patient', 'Public register must ALWAYS assign patient role');
  });

  await test('12. CORS Whitelist chặn domain lạ và cho phép neuroscan.pages.dev + localhost', async () => {
    const evilRes = await app.request('http://localhost/api/health', {
      headers: { Origin: 'https://evil-attacker.com' },
    }, env);
    assert.equal(evilRes.headers.get('access-control-allow-origin'), null, 'Evil origin must not be reflected');

    const prodRes = await app.request('http://localhost/api/health', {
      headers: { Origin: 'https://neuroscan.pages.dev' },
    }, env);
    assert.equal(prodRes.headers.get('access-control-allow-origin'), 'https://neuroscan.pages.dev');

    const previewRes = await app.request('http://localhost/api/health', {
      headers: { Origin: 'https://abc123.neuroscan.pages.dev' },
    }, env);
    assert.equal(previewRes.headers.get('access-control-allow-origin'), 'https://abc123.neuroscan.pages.dev');
  });

  await test('13. HTTP Security Headers bắt buộc (HSTS, nosniff, X-Frame-Options, Referrer, Permissions)', async () => {
    const res = await app.request('http://localhost/api/health', {}, env);
    assert.ok(res.headers.get('strict-transport-security')?.includes('max-age=31536000'));
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.ok(res.headers.get('permissions-policy')?.includes('camera=()'));
  });

  await test('14. Tài khoản admin@gmail.com & user@gmail.com (pass@123) đăng nhập và phân quyền RBAC chuẩn', async () => {
    const adminLogin = await req(env, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: 'pass@123' }),
    });
    assert.equal(adminLogin.status, 200);
    assert.equal(adminLogin.json.data.user.role, 'admin');
    const adminToken = adminLogin.json.data.token as string;

    const adminPatients = await req(env, '/api/patients', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminPatients.status, 200, 'admin@gmail.com must access /api/patients');

    const adminAudit = await req(env, '/api/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminAudit.status, 200, 'admin@gmail.com must access /api/audit-logs');

    const userLogin = await req(env, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@gmail.com', password: 'pass@123' }),
    });
    assert.equal(userLogin.status, 200);
    assert.equal(userLogin.json.data.user.role, 'patient');
    const userToken = userLogin.json.data.token as string;

    const userMe = await req(env, '/api/auth/me', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert.equal(userMe.status, 200);
    assert.equal(userMe.json.data.user.email, 'user@gmail.com');

    const userPatientsBlocked = await req(env, '/api/patients', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert.equal(userPatientsBlocked.status, 403, 'user@gmail.com must be blocked from /api/patients');

    const userAuditBlocked = await req(env, '/api/audit-logs', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert.equal(userAuditBlocked.status, 403, 'user@gmail.com must be blocked from /api/audit-logs');
  });

  await test('15. Cổng Quản trị ADMIN: cấp tài khoản Bác sĩ, khóa tài khoản & thu hồi phiên ngay lập tức', async () => {
    // Doctor thường không được truy cập /api/admin/doctors
    const docForbidden = await req(env, '/api/admin/doctors', {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert.equal(docForbidden.status, 403, 'Normal doctor must be blocked from admin APIs');

    const adminLogin = await req(env, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: 'pass@123' }),
    });
    const adminToken = adminLogin.json.data.token as string;

    const createDoc = await req(env, '/api/admin/doctors', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: 'BS.CKI Lê Quang Minh',
        email: 'bs.minh@hospital.vn',
        password: 'DoctorNew@123',
        licenseNo: 'CCHN-2026-NEURO-9999',
        specialty: 'Ngoại Thần kinh',
      }),
    });
    assert.equal(createDoc.status, 201);
    const createdDocId = createDoc.json.data.doctor.id as number;

    // Bác sĩ mới đăng nhập được ngay
    const newDocLogin = await req(env, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bs.minh@hospital.vn', password: 'DoctorNew@123' }),
    });
    assert.equal(newDocLogin.status, 200);
    const newDocToken = newDocLogin.json.data.token as string;

    // Admin khóa tài khoản bác sĩ mới
    const lockRes = await req(env, `/api/admin/doctors/${createdDocId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive: false }),
    });
    assert.equal(lockRes.status, 200);

    // Token cũ lập tức vô hiệu & không thể đăng nhập lại
    const lockedMe = await req(env, '/api/auth/me', {
      headers: { Authorization: `Bearer ${newDocToken}` },
    });
    assert.equal(lockedMe.status, 401, 'Locked account token must be immediately invalidated');

    const lockedLogin = await req(env, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bs.minh@hospital.vn', password: 'DoctorNew@123' }),
    });
    assert.equal(lockedLogin.status, 403, 'Locked account must receive 403 on login');
  });

  await test('16. Luồng Quên & Đặt lại Mật khẩu thực (15-min hashed token + chống tái sử dụng mã)', async () => {
    const reqReset = await req(env, '/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@gmail.com' }),
    });
    assert.equal(reqReset.status, 200);
    const resetCode = reqReset.json.data.devResetCode as string;
    assert.ok(resetCode && resetCode.length === 6, 'Dev/test env must issue 6-digit reset code');

    const confirmReset = await req(env, '/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@gmail.com',
        resetCode,
        newPassword: 'ResetPass@789',
      }),
    });
    assert.equal(confirmReset.status, 200);

    // Chặn tái sử dụng mã cũ
    const reuseAttempt = await req(env, '/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@gmail.com',
        resetCode,
        newPassword: 'AnotherPass@123',
      }),
    });
    assert.equal(reuseAttempt.status, 400, 'Used reset code must be rejected');

    // Đăng nhập mật khẩu mới thành công
    const loginNew = await req(env, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@gmail.com', password: 'ResetPass@789' }),
    });
    assert.equal(loginNew.status, 200);
  });

  await test('17. Giám sát Lỗi Vận hành (Error Telemetry): ghi nhận lỗi ẩn danh & chỉ ADMIN được xem', async () => {
    const report = await req(env, '/api/telemetry/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'frontend_window',
        level: 'error',
        message: 'Test runtime error telemetry payload',
        route: '/mri-analysis',
      }),
    });
    assert.equal(report.status, 201);

    const docBlocked = await req(env, '/api/admin/telemetry', {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert.equal(docBlocked.status, 403, 'Non-admin doctor must not view telemetry logs');

    const adminLogin = await req(env, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: 'pass@123' }),
    });
    const adminToken = adminLogin.json.data.token as string;

    const adminTelemetry = await req(env, '/api/admin/telemetry', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminTelemetry.status, 200);
    const errors = adminTelemetry.json.data.errors as Array<{ message: string }>;
    assert.ok(errors.some((e) => e.message.includes('Test runtime error telemetry payload')));
  });

  await test('18. Kiểm chứng Ma trận 3 Vai trò (admin@gmail.com | doctor@gmail.com | user@gmail.com)', async () => {
    const docLogin = await req(env, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor@gmail.com', password: 'pass@123' }),
    });
    assert.equal(docLogin.status, 200);
    assert.equal(docLogin.json.data.user.role, 'doctor');
    const docGmailToken = docLogin.json.data.token as string;

    // Doctor truy cập được hồ sơ bệnh nhân & thống kê lâm sàng
    const docPatients = await req(env, '/api/patients', {
      headers: { Authorization: `Bearer ${docGmailToken}` },
    });
    assert.equal(docPatients.status, 200, 'doctor@gmail.com must access /api/patients');

    const docStats = await req(env, '/api/stats', {
      headers: { Authorization: `Bearer ${docGmailToken}` },
    });
    assert.equal(docStats.status, 200, 'doctor@gmail.com must access /api/stats');

    // Doctor PHẢI bị chặn khỏi Cổng Quản trị ADMIN (/api/admin/doctors & /api/admin/telemetry)
    const docAdminDoctors = await req(env, '/api/admin/doctors', {
      headers: { Authorization: `Bearer ${docGmailToken}` },
    });
    assert.equal(docAdminDoctors.status, 403, 'doctor@gmail.com must be blocked from /api/admin/doctors');

    const docAdminTelemetry = await req(env, '/api/admin/telemetry', {
      headers: { Authorization: `Bearer ${docGmailToken}` },
    });
    assert.equal(docAdminTelemetry.status, 403, 'doctor@gmail.com must be blocked from /api/admin/telemetry');
  });

  await test('19. Lưu bền vững Email, Ảnh đại diện, Đơn vị & Cài đặt sau khi đăng xuất/đăng nhập lại', async () => {
    const reg = await req(env, '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Trần Văn Persist',
        email: 'persist.old@example.com',
        password: 'PersistPass@123',
      }),
    });
    assert.equal(reg.status, 201);
    const token1 = reg.json.data.token as string;

    const tinyAvatar = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/';
    const upd = await req(env, '/api/auth/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: 'Trần Văn Đã Lưu',
        email: 'persist.new@example.com',
        phone: '0911222333',
        organizationOrUnit: 'Bệnh viện Bạch Mai',
        avatarUrl: tinyAvatar,
        preferences: {
          emailNotifications: false,
          doctorReviewAlerts: true,
          saveHistoryConsent: true,
          anonymizeExports: false,
        },
      }),
    });
    assert.equal(upd.status, 200);
    assert.equal(upd.json.data.user.email, 'persist.new@example.com');
    assert.equal(upd.json.data.user.avatar_url, tinyAvatar);
    assert.equal(upd.json.data.user.organization, 'Bệnh viện Bạch Mai');

    // Chặn đổi email trùng với tài khoản khác
    const dupEmail = await req(env, '/api/auth/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: 'Trần Văn Đã Lưu',
        email: 'admin@gmail.com',
      }),
    });
    assert.equal(dupEmail.status, 409, 'Duplicate email must be rejected with 409');

    // Đăng xuất rồi đăng nhập lại bằng EMAIL MỚI -> phải còn nguyên avatar, organization, preferences
    await req(env, '/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
    });

    const relogin = await req(env, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'persist.new@example.com',
        password: 'PersistPass@123',
      }),
    });
    assert.equal(relogin.status, 200, 'Must login successfully with updated email');
    assert.equal(relogin.json.data.user.full_name, 'Trần Văn Đã Lưu');
    assert.equal(relogin.json.data.user.avatar_url, tinyAvatar);
    assert.equal(relogin.json.data.user.organization, 'Bệnh viện Bạch Mai');
    assert.ok(String(relogin.json.data.user.preferences_json).includes('"emailNotifications":false'));
  });

  console.log(`\n=== KẾT QUẢ SECURITY & DATA LIFECYCLE TESTS: ${passed}/19 PASS ===`);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
