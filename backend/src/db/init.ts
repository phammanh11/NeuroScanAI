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

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'patient',
    full_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS patients (
    user_id INTEGER PRIMARY KEY,
    date_of_birth TEXT DEFAULT '1980-01-01',
    phone TEXT DEFAULT '',
    gender TEXT DEFAULT 'Nam',
    address TEXT DEFAULT '',
    medical_history TEXT DEFAULT '',
    emergency_contact TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS doctors (
    user_id INTEGER PRIMARY KEY,
    specialty TEXT DEFAULT 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)',
    license_no TEXT DEFAULT 'CCHN-2026-NEURO-8841',
    organization TEXT DEFAULT 'Khoa Chẩn đoán Hình ảnh & Ngoại Thần kinh',
    phone TEXT DEFAULT '0909 000 222',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS mri_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    r2_key TEXT NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
    slice_type TEXT NOT NULL DEFAULT 'Axial (Trục ngang)',
    sequence_type TEXT NOT NULL DEFAULT 'T1-Gd (Contrast)',
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    confidence REAL NOT NULL,
    probabilities TEXT NOT NULL,
    model_version TEXT NOT NULL DEFAULT 'brain_mri_student_v1_onnx',
    inference_time_ms INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (scan_id) REFERENCES mri_scans(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS doctor_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    confirmed_label TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    ai_assessment TEXT DEFAULT 'CONCORDANT',
    recommended_step TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (prediction_id) REFERENCES predictions(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL DEFAULT 'Hội thoại Y tế',
    linked_prediction_id INTEGER DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (linked_prediction_id) REFERENCES predictions(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    is_emergency INTEGER NOT NULL DEFAULT 0,
    sources_json TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS faq_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'tumor_types',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS rag_chunks (
    id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'NeuroScan Knowledge Base',
    embedding_json TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
];

let initialized = false;

export async function ensureDatabaseInitialized(env: WorkerEnv): Promise<void> {
  if (initialized || !env.DB) return;

  try {
    // 0. Kiểm tra xem D1 có đang chứa các bảng từ schema thế hệ cũ (thiếu user_id / r2_key / sender / doc_id) không
    let needsSchemaRebuild = false;
    try {
      await env.DB.prepare('SELECT id, email, password_hash, password_salt, role, full_name FROM users LIMIT 1').first();
      await env.DB.prepare('SELECT user_id, date_of_birth, phone FROM patients LIMIT 1').first();
      await env.DB.prepare('SELECT user_id, specialty, license_no FROM doctors LIMIT 1').first();
      await env.DB.prepare('SELECT id, patient_id, r2_key, slice_type, sequence_type FROM mri_scans LIMIT 1').first();
      await env.DB.prepare('SELECT id, scan_id, label, confidence, probabilities FROM predictions LIMIT 1').first();
      await env.DB.prepare('SELECT id, prediction_id, doctor_id, confirmed_label FROM doctor_reviews LIMIT 1').first();
      await env.DB.prepare('SELECT id, user_id, title, linked_prediction_id FROM chat_sessions LIMIT 1').first();
      await env.DB.prepare('SELECT id, session_id, sender, content, sources_json FROM chat_messages LIMIT 1').first();
      await env.DB.prepare('SELECT id, doc_id, category, embedding_json FROM rag_chunks LIMIT 1').first();
    } catch {
      needsSchemaRebuild = true;
    }

    if (needsSchemaRebuild) {
      const legacyTables = [
        'doctor_reviews',
        'predictions',
        'mri_scans',
        'chat_messages',
        'chat_sessions',
        'patients',
        'doctors',
        'rag_chunks',
        'faq_documents',
        'sessions',
        'users',
      ];
      for (const tbl of legacyTables) {
        await env.DB.prepare(`DROP TABLE IF EXISTS ${tbl}`).run().catch(() => {});
      }
    }

    // Tạo tất cả các bảng theo chuẩn mới
    for (const stmt of SCHEMA_STATEMENTS) {
      await env.DB.prepare(stmt).run().catch(() => {});
    }

    for (const colStmt of [
      `ALTER TABLE patients ADD COLUMN gender TEXT DEFAULT 'Nam'`,
      `ALTER TABLE patients ADD COLUMN address TEXT DEFAULT ''`,
      `ALTER TABLE patients ADD COLUMN medical_history TEXT DEFAULT ''`,
      `ALTER TABLE patients ADD COLUMN emergency_contact TEXT DEFAULT ''`,
    ]) {
      await env.DB.prepare(colStmt).run().catch(() => {});
    }

    // 1. Nạp / Đồng bộ tài khoản Doctor mẫu (demo.doctor@neuroscan.vn / Doctor@123)
    const docUser: any = await env.DB.prepare(
      'SELECT id, password_salt, role FROM users WHERE email = ?'
    )
      .bind('demo.doctor@neuroscan.vn')
      .first()
      .catch(() => null);

    if (!docUser || docUser.password_salt === 'neuro_salt_2026' || docUser.role !== 'doctor') {
      const { hash, salt } = await hashPassword('Doctor@123');
      await env.DB.prepare(`
        INSERT INTO users (id, email, password_hash, password_salt, role, full_name)
        VALUES (1, 'demo.doctor@neuroscan.vn', ?, ?, 'doctor', 'BS.CKII Trần Quốc Bảo')
        ON CONFLICT(email) DO UPDATE SET
          password_hash = excluded.password_hash,
          password_salt = excluded.password_salt,
          role = 'doctor',
          full_name = excluded.full_name
      `)
        .bind(hash, salt)
        .run()
        .catch(() => {});
    }

    const docRow: any = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind('demo.doctor@neuroscan.vn')
      .first()
      .catch(() => ({ id: 1 }));
    const doctorId = docRow?.id || 1;

    await env.DB.prepare(`
      INSERT OR REPLACE INTO doctors (user_id, specialty, license_no, organization, phone)
      VALUES (?, 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)', 'CCHN-2026-NEURO-8841', 'Khoa Chẩn đoán Hình ảnh & Ngoại Thần kinh', '0909 000 222')
    `)
      .bind(doctorId)
      .run()
      .catch(() => {});

    // 2. Nạp / Đồng bộ tài khoản User mẫu (demo.user@neuroscan.vn / User@123)
    const patUser: any = await env.DB.prepare(
      'SELECT id, password_salt, role FROM users WHERE email = ?'
    )
      .bind('demo.user@neuroscan.vn')
      .first()
      .catch(() => null);

    if (!patUser || patUser.password_salt === 'neuro_salt_2026' || patUser.role !== 'patient') {
      const { hash, salt } = await hashPassword('User@123');
      await env.DB.prepare(`
        INSERT INTO users (id, email, password_hash, password_salt, role, full_name)
        VALUES (2, 'demo.user@neuroscan.vn', ?, ?, 'patient', 'Nguyễn Minh An')
        ON CONFLICT(email) DO UPDATE SET
          password_hash = excluded.password_hash,
          password_salt = excluded.password_salt,
          role = 'patient',
          full_name = excluded.full_name
      `)
        .bind(hash, salt)
        .run()
        .catch(() => {});
    }

    const patRow: any = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind('demo.user@neuroscan.vn')
      .first()
      .catch(() => ({ id: 2 }));
    const mainPatientId = patRow?.id || 2;

    await env.DB.prepare(`
      INSERT OR REPLACE INTO patients (user_id, date_of_birth, phone, gender, address, medical_history, emergency_contact)
      VALUES (?, '1981-05-12', '0912 345 678', 'Nam', 'Quận 3, TP. Hồ Chí Minh', 'Tăng huyết áp nhẹ kiểm soát tốt. Đau đầu âm ỉ vùng đỉnh - chẩm phải 3 tuần, nhìn mờ thoáng qua.', '0908 111 222')
    `)
      .bind(mainPatientId)
      .run()
      .catch(() => {});

    // 3. Nạp / Đồng bộ tài khoản Admin (admin@neuroscan.vn / Admin@123)
    const adminUser: any = await env.DB.prepare(
      'SELECT id, password_salt, role FROM users WHERE email = ?'
    )
      .bind('admin@neuroscan.vn')
      .first()
      .catch(() => null);

    if (!adminUser || adminUser.password_salt === 'neuro_salt_2026' || adminUser.role !== 'admin') {
      const { hash, salt } = await hashPassword('Admin@123');
      await env.DB.prepare(`
        INSERT INTO users (id, email, password_hash, password_salt, role, full_name)
        VALUES (3, 'admin@neuroscan.vn', ?, ?, 'admin', 'Quản trị viên Hệ thống')
        ON CONFLICT(email) DO UPDATE SET
          password_hash = excluded.password_hash,
          password_salt = excluded.password_salt,
          role = 'admin',
          full_name = excluded.full_name
      `)
        .bind(hash, salt)
        .run()
        .catch(() => {});
    }

    // 4. Đảm bảo có đủ 4 Hồ sơ Bệnh nhân lâm sàng trong hệ thống
    const patCountRes: any = await env.DB.prepare('SELECT count(*) as count FROM patients')
      .first()
      .catch(() => ({ count: 0 }));

    if ((patCountRes?.count || 0) < 4) {
      const { hash, salt } = await hashPassword('Patient@123');
      const extraPatients = [
        {
          id: 4,
          email: 'tranthimai75@gmail.com',
          name: 'Trần Thị Mai',
          dob: '1975-11-20',
          phone: '0987 654 321',
          gender: 'Nữ',
          address: 'Quận Hải Châu, Đà Nẵng',
          history: 'Tăng huyết áp 5 năm. Chóng mặt khi thay đổi tư thế, đau đầu vùng chẩm - nền sọ.',
          emergency: '0905 222 333',
        },
        {
          id: 5,
          email: 'hoangvanduc92@gmail.com',
          name: 'Hoàng Văn Đức',
          dob: '1992-03-08',
          phone: '0933 445 566',
          gender: 'Nam',
          address: 'Quận Cầu Giấy, Hà Nội',
          history: 'Giảm thị lực hai bên thái dương tiến triển 2 tháng, rối loạn giấc ngủ, mệt mỏi.',
          emergency: '0913 444 555',
        },
        {
          id: 6,
          email: 'lethuhang99@gmail.com',
          name: 'Lê Thu Hằng',
          dob: '1999-08-19',
          phone: '0977 889 900',
          gender: 'Nữ',
          address: 'Quận Ninh Kiều, Cần Thơ',
          history: 'Khám sức khỏe tổng quát định kỳ, đôi khi căng thẳng đau đầu nhẹ do làm việc máy tính.',
          emergency: '0989 666 777',
        },
      ];

      for (const pt of extraPatients) {
        await env.DB.prepare(`
          INSERT OR IGNORE INTO users (id, email, password_hash, password_salt, role, full_name)
          VALUES (?, ?, ?, ?, 'patient', ?)
        `)
          .bind(pt.id, pt.email, hash, salt, pt.name)
          .run()
          .catch(() => {});

        const uRow: any = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
          .bind(pt.email)
          .first()
          .catch(() => ({ id: pt.id }));
        const targetUid = uRow?.id || pt.id;

        await env.DB.prepare(`
          INSERT OR REPLACE INTO patients (user_id, date_of_birth, phone, gender, address, medical_history, emergency_contact)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
          .bind(targetUid, pt.dob, pt.phone, pt.gender, pt.address, pt.history, pt.emergency)
          .run()
          .catch(() => {});
      }
    }

    // 5. Đảm bảo có đủ 4 Ca chụp MRI thực tế & Kết quả AI (Predictions) + Thẩm định Bác sĩ
    const predCountRes: any = await env.DB.prepare('SELECT count(*) as count FROM predictions')
      .first()
      .catch(() => ({ count: 0 }));
    const oldScanKeyRes: any = await env.DB.prepare(
      "SELECT count(*) as count FROM mri_scans WHERE r2_key LIKE 'scans/demo_%'"
    )
      .first()
      .catch(() => ({ count: 0 }));

    if ((predCountRes?.count || 0) < 4 || (oldScanKeyRes?.count || 0) > 0) {
      await env.DB.prepare(`
        INSERT OR REPLACE INTO mri_scans (id, patient_id, r2_key, file_name, file_size, mime_type, slice_type, sequence_type, uploaded_at)
        VALUES
          (1, ?, 'sample_scans/sample_glioma_axial.jpg', 'sample_glioma_axial.jpg', 22122, 'image/jpeg', 'Axial (Trục ngang)', 'T1-Gd (Contrast)', '2026-10-28 09:15:00'),
          (2, 4, 'sample_scans/sample_meningioma_axial.jpg', 'sample_meningioma_axial.jpg', 41726, 'image/jpeg', 'Axial (Trục ngang)', 'T1-Gd (Contrast)', '2026-11-01 14:30:00'),
          (3, 5, 'sample_scans/sample_pituitary_coronal.jpg', 'sample_pituitary_coronal.jpg', 38936, 'image/jpeg', 'Coronal (Đứng ngang)', 'T1-Gd (Contrast)', '2026-11-04 11:20:00'),
          (4, ?, 'sample_scans/sample_notumor_axial.jpg', 'sample_notumor_axial.jpg', 8456, 'image/jpeg', 'Axial (Trục ngang)', 'T2-FLAIR', '2026-11-05 10:00:00')
      `)
        .bind(mainPatientId, mainPatientId)
        .run()
        .catch(() => {});

      await env.DB.prepare(`
        INSERT OR REPLACE INTO predictions (id, scan_id, label, confidence, probabilities, model_version, inference_time_ms, created_at)
        VALUES
          (1, 1, 'Glioma', 0.934, '{"Glioma":0.934,"Meningioma":0.041,"Pituitary":0.015,"No Tumor":0.010}', 'brain_mri_student_v1_onnx', 45, '2026-10-28 09:15:05'),
          (2, 2, 'Meningioma', 0.918, '{"Glioma":0.032,"Meningioma":0.918,"Pituitary":0.035,"No Tumor":0.015}', 'brain_mri_student_v1_onnx', 42, '2026-11-01 14:30:04'),
          (3, 3, 'Pituitary', 0.905, '{"Glioma":0.024,"Meningioma":0.048,"Pituitary":0.905,"No Tumor":0.023}', 'brain_mri_student_v1_onnx', 39, '2026-11-04 11:20:03'),
          (4, 4, 'No Tumor', 0.968, '{"Glioma":0.008,"Meningioma":0.012,"Pituitary":0.012,"No Tumor":0.968}', 'brain_mri_student_v1_onnx', 38, '2026-11-05 10:00:03')
      `).run().catch(() => {});

      await env.DB.prepare(`
        INSERT OR REPLACE INTO doctor_reviews (id, prediction_id, doctor_id, confirmed_label, note, ai_assessment, recommended_step, created_at)
        VALUES
          (1, 1, ?, 'Glioma', 'Vùng tổn thương nội trục ngấm thuốc dạng vòng vùng đỉnh - chẩm phải kèm hoại tử trung tâm và phù não vận mạch xung quanh, đồng thuận với dự đoán Glioma của AI.', 'CONCORDANT', 'Chụp bổ sung cộng hưởng từ phổ (MRS), tưới máu (Perfusion MRI) và hội chẩn Ngoại Thần kinh.', '2026-10-28 11:20:00')
      `)
        .bind(doctorId)
        .run()
        .catch(() => {});
    }

    // 6. Đảm bảo có đủ Tài liệu Y khoa FAQ chuẩn trong bảng faq_documents
    const faqCountRes: any = await env.DB.prepare('SELECT count(*) as count FROM faq_documents')
      .first()
      .catch(() => ({ count: 0 }));

    if ((faqCountRes?.count || 0) === 0) {
      await env.DB.prepare(`
        INSERT OR IGNORE INTO faq_documents (id, title, content, source, category)
        VALUES
          (1, 'Phân loại U tế bào thần kinh đệm (Glioma) theo WHO CNS5 (2021)', 'U tế bào thần kinh đệm (Glioma) bắt nguồn từ các tế bào nâng đỡ (glial cells) trong nhu mô não (nội trục). Theo phân loại WHO CNS5 (2021), Glioma được phân tầng từ Độ 1 đến Độ 4, kết hợp hình thái mô học và dấu ấn sinh học phân tử (IDH1/2, 1p/19q, MGMT). Glioblastoma (Độ 4) là dạng ác tính tiến triển nhanh, điển hình với hình ảnh ngấm thuốc dạng vòng không đều bao quanh vùng hoại tử trung tâm trên xung T1-Gd và phù não vận mạch rộng trên xung T2-FLAIR.', 'WHO CNS5 (2021) Classification of Tumors of the Central Nervous System', 'tumor_classification'),
          (2, 'U màng não (Meningioma) và dấu hiệu Đuôi màng cứng (Dural Tail Sign)', 'U màng não (Meningioma) là khối u ngoài trục (extra-axial) phát triển từ tế bào màng nhện bao bọc não và tủy sống. Đa số (80-85%) là u lành tính (WHO Độ 1). Trên phim MRI T1-Gd có tiêm thuốc đối quang từ, Meningioma điển hình có bờ đều rõ nét, đáy bám rộng vào màng cứng, ngấm thuốc mạnh đồng nhất và tạo dấu hiệu kinh điển "Đuôi màng cứng" (Dural Tail Sign).', 'National Cancer Institute (NCI) & Radiopaedia Guidelines', 'tumor_classification'),
          (3, 'U tuyến yên (Pituitary Adenoma) và biểu hiện Nội tiết - Thị giác', 'U tuyến yên (Pituitary Adenoma) là khối u nguyên phát tại thùy trước tuyến yên trong hố yên (Sella Turcica). U được chia thành Microadenoma (<10mm) và Macroadenoma (>=10mm). Khi phát triển vượt lên bể trên yên (Suprasellar), khối u chèn ép giao thoa thị giác (Optic Chiasm) gây triệu chứng bán manh thái dương hai mắt và rối loạn hormone nội tiết (Prolactin, GH, ACTH). MRI lát cắt mỏng Coronal và Sagittal T1-Gd qua vùng hố yên là tiêu chuẩn vàng chẩn đoán.', 'Endocrine Society & NHS Clinical Guidelines', 'tumor_classification'),
          (4, 'Ý nghĩa nhãn No Tumor (Không phát hiện u điển hình) và Giới hạn của AI', 'Nhãn No Tumor thể hiện lát cắt MRI 2D hiện tại có cấu trúc nhu mô não đối xứng hai bán cầu, đường giữa cân đối, hệ thống não thất thông thoáng và không ghi nhận khối choán chỗ mang đặc trưng của Glioma, Meningioma hay Pituitary. Tuy nhiên, kết quả AI trên 1 lát cắt đơn lẻ không thay thế việc bác sĩ khảo sát toàn bộ bộ chụp DICOM đa mặt phẳng hoặc loại trừ bệnh lý mạch máu não, viêm não.', 'American College of Radiology (ACR) Appropriateness Criteria', 'tumor_classification'),
          (5, 'Giải thích các chuỗi xung cộng hưởng từ sọ não (T1W, T2W, FLAIR, T1-Gd, DWI)', 'Chụp cộng hưởng từ MRI sọ não kết hợp nhiều chuỗi xung vật lý: T1W (dịch não tủy màu đen tối, chất trắng sáng hơn chất xám, tối ưu đánh giá giải phẫu), T2W (dịch não tủy và vùng phù nề sáng trắng rõ rệt), FLAIR (xóa tín hiệu dịch não tủy tự do, giữ lại dịch phù bệnh lý quanh u), T1-Gd (tiêm thuốc đối quang từ Gadolinium làm sáng rõ các khối u tăng sinh mạch), DWI/ADC (đánh giá khuếch tán phân tử nước).', 'American College of Radiology (ACR) Brain MRI Protocol', 'mri_ai_explanation'),
          (6, 'CẢNH BÁO CẤP CỨU THẦN KINH: Các dấu hiệu cờ đỏ (Red Flags) cần gọi 115', 'Nếu người bệnh có bất kỳ dấu hiệu cờ đỏ (Red Flags) nào sau đây, phải GỌI NGAY 115 hoặc đến Khoa Cấp cứu gần nhất: (1) Đau đầu dữ dội khởi phát đột ngột như sét đánh hoặc kèm nôn vọt buổi sáng; (2) Co giật mới khởi phát ở người trưởng thành; (3) Yếu liệt nửa người, méo miệng, tê bì tay chân hoặc nói đớ cấp tính; (4) Suy giảm ý thức, lú lẫn, hôn mê hoặc mất thị lực đột ngột.', 'Bộ Y tế Việt Nam & WHO — Phác đồ Cấp cứu Thần kinh', 'symptoms')
      `).run().catch(() => {});
    }

    initialized = true;
  } catch (err) {
    console.warn('[DB Init Warning]:', (err as Error)?.message);
  }
}
