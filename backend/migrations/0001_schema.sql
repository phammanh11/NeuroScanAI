-- ============================================================================
-- NeuroScan AI — Database Schema (Cloudflare D1 SQLite)
-- Tuân thủ 100% tài liệu thiết kế Mục 1.8.6 (Hệ thống 9 bảng quan hệ)
-- ============================================================================

-- 1. Bảng Tài khoản Người dùng (users)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'patient', -- 'patient', 'doctor', 'admin'
  full_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Bảng Hồ sơ Bệnh nhân (patients)
CREATE TABLE IF NOT EXISTS patients (
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
);

-- 3. Bảng Hồ sơ Bác sĩ (doctors)
CREATE TABLE IF NOT EXISTS doctors (
  user_id INTEGER PRIMARY KEY,
  specialty TEXT DEFAULT 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)',
  license_no TEXT DEFAULT 'CCHN-2026-NEURO-8841',
  organization TEXT DEFAULT 'Khoa Chẩn đoán Hình ảnh & Ngoại Thần kinh',
  phone TEXT DEFAULT '0909 000 222',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Bảng Kết quả Chụp MRI (mri_scans)
CREATE TABLE IF NOT EXISTS mri_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'image/png',
  slice_type TEXT NOT NULL DEFAULT 'Axial (Trục ngang)',
  sequence_type TEXT NOT NULL DEFAULT 'T1-Gd (Contrast)',
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mri_scans_patient ON mri_scans(patient_id);
CREATE INDEX IF NOT EXISTS idx_mri_scans_uploaded ON mri_scans(uploaded_at);

-- 5. Bảng Kết quả Phân loại AI (predictions)
CREATE TABLE IF NOT EXISTS predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id INTEGER NOT NULL,
  label TEXT NOT NULL, -- 'Glioma', 'Meningioma', 'Pituitary', 'No Tumor'
  confidence REAL NOT NULL,
  probabilities TEXT NOT NULL, -- JSON string: {"Glioma": 0.89, "Meningioma": 0.05, "Pituitary": 0.03, "No Tumor": 0.03}
  model_version TEXT NOT NULL DEFAULT 'brain_mri_student_v1_onnx',
  inference_time_ms INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (scan_id) REFERENCES mri_scans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_predictions_scan ON predictions(scan_id);
CREATE INDEX IF NOT EXISTS idx_predictions_label ON predictions(label);

-- 6. Bảng Đánh giá & Xác nhận của Bác sĩ (doctor_reviews)
CREATE TABLE IF NOT EXISTS doctor_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prediction_id INTEGER NOT NULL,
  doctor_id INTEGER NOT NULL,
  confirmed_label TEXT NOT NULL, -- 'Glioma', 'Meningioma', 'Pituitary', 'No Tumor'
  note TEXT NOT NULL DEFAULT '',
  ai_assessment TEXT DEFAULT 'CONCORDANT', -- 'CONCORDANT', 'PARTIAL_CONCORDANCE', 'DISCORDANT'
  recommended_step TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (prediction_id) REFERENCES predictions(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_doctor_reviews_pred ON doctor_reviews(prediction_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_doc ON doctor_reviews(doctor_id);

-- 7. Bảng Phiên Hội thoại Chatbot (chat_sessions)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT 'Hội thoại Y tế',
  linked_prediction_id INTEGER DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (linked_prediction_id) REFERENCES predictions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);

-- 8. Bảng Tin nhắn Chatbot (chat_messages)
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  sender TEXT NOT NULL, -- 'user' hoặc 'bot' (assistant)
  content TEXT NOT NULL,
  is_emergency INTEGER NOT NULL DEFAULT 0,
  sources_json TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- 9. Bảng Tài liệu Tri thức Y tế & FAQ phục vụ RAG (faq_documents)
CREATE TABLE IF NOT EXISTS faq_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL, -- WHO CNS5, NCI, NHS, etc.
  category TEXT NOT NULL DEFAULT 'tumor_types', -- tumor_types, mri_sequences, emergency, guidelines
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_faq_category ON faq_documents(category);

-- 10. Bảng Vector Chunks Tri thức Y khoa (rag_chunks)
CREATE TABLE IF NOT EXISTS rag_chunks (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'NeuroScan Knowledge Base',
  embedding_json TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
