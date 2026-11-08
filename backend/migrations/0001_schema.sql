-- ============================================================================
-- NeuroScan AI — Database Schema (Cloudflare D1 SQLite)
-- ============================================================================

-- 1. Bảng Người dùng & Bác sĩ (Users)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'DOCTOR', -- 'DOCTOR' hoặc 'USER'
  specialty TEXT DEFAULT 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)',
  organization TEXT DEFAULT 'Khoa Chẩn đoán Hình ảnh & Ngoại Thần kinh',
  license_code TEXT DEFAULT 'CCHN-2026-NEURO-8841',
  phone TEXT DEFAULT '0909 000 222',
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Bảng Phiên làm việc (Sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  csrf_token TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- 3. Bảng Hồ sơ Bệnh nhân (Patients)
CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mrn TEXT NOT NULL UNIQUE, -- Mã bệnh án (Medical Record Number) e.g. NS-BN-2026-001
  full_name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL DEFAULT 'Nam', -- 'Nam', 'Nữ', 'Khác'
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  clinical_history TEXT DEFAULT '',
  symptoms TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Đang theo dõi', -- 'Đang theo dõi', 'Chờ phân tích', 'Đã chẩn đoán'
  last_scan_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);

-- 4. Bảng Kết quả & Lịch sử Chụp MRI (mri_scans)
CREATE TABLE IF NOT EXISTS mri_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_code TEXT NOT NULL UNIQUE, -- e.g. SCAN-2026-001
  patient_id INTEGER,
  patient_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_key TEXT NOT NULL, -- Khóa lưu trữ trên Cloudflare R2 (scans/...)
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/png',
  slice_type TEXT NOT NULL DEFAULT 'Axial (Trục ngang)',
  sequence_type TEXT NOT NULL DEFAULT 'T1-Gd (Contrast)',
  status TEXT NOT NULL DEFAULT 'PENDING_MODEL', -- 'PENDING_MODEL', 'ANALYZED', 'REVIEWED'
  predicted_label TEXT DEFAULT NULL, -- 'Glioma', 'Meningioma', 'Pituitary', 'No Tumor'
  confidence REAL DEFAULT NULL,
  probabilities_json TEXT DEFAULT NULL,
  findings_summary TEXT DEFAULT 'Ảnh chụp MRI đã được tải lên và lưu trữ an toàn trên Cloudflare R2. Tình trạng phân loại AI đang tạm chờ nạp trọng số mô hình sau huấn luyện.',
  doctor_notes TEXT DEFAULT '',
  doctor_approved INTEGER NOT NULL DEFAULT 0,
  approved_by TEXT DEFAULT NULL,
  approved_at TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_mri_scans_code ON mri_scans(scan_code);
CREATE INDEX IF NOT EXISTS idx_mri_scans_patient_id ON mri_scans(patient_id);
CREATE INDEX IF NOT EXISTS idx_mri_scans_status ON mri_scans(status);

-- 5. Bảng Phân đoạn Tri thức RAG Chatbot (rag_chunks)
CREATE TABLE IF NOT EXISTS rag_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chunk_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- 'tumor_types', 'mri_sequences', 'who_grading', 'guidelines', 'emergency'
  content TEXT NOT NULL,
  source TEXT NOT NULL, -- 'WHO CNS5 2021', 'NCI Guidelines', 'NHS', 'NeuroScan AI Protocol'
  embedding_model TEXT NOT NULL DEFAULT '@cf/baai/bge-m3',
  embedding_dim INTEGER NOT NULL DEFAULT 1024,
  embedding_json TEXT, -- Mảng số thực vector embedding
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_category ON rag_chunks(category);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_chunk_id ON rag_chunks(chunk_id);

-- 6. Bảng Nhật ký Hội thoại Chatbot (chat_messages)
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  user_id INTEGER,
  role TEXT NOT NULL, -- 'user' hoặc 'assistant'
  content TEXT NOT NULL,
  is_emergency INTEGER NOT NULL DEFAULT 0,
  rag_trace_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

