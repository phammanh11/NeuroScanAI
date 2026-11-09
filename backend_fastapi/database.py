import sqlite3
import os
import hashlib
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "neuroscan_fastapi.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str, salt: str = "neuro_salt_2026") -> str:
    """PBKDF2-HMAC-SHA256 password hashing matching backend Web Crypto."""
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return key.hex()

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # 1. Bảng users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'patient',
        full_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Bảng patients
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS patients (
        user_id INTEGER PRIMARY KEY,
        date_of_birth TEXT,
        phone TEXT,
        gender TEXT DEFAULT 'Nam',
        address TEXT,
        medical_history TEXT,
        emergency_contact TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 3. Bảng doctors
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS doctors (
        user_id INTEGER PRIMARY KEY,
        specialty TEXT NOT NULL,
        license_no TEXT NOT NULL,
        organization TEXT NOT NULL,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 4. Bảng mri_scans
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS mri_scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        r2_key TEXT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        slice_type TEXT DEFAULT 'Axial (Trục ngang)',
        sequence_type TEXT DEFAULT 'T1-Gd (Contrast)',
        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 5. Bảng predictions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scan_id INTEGER NOT NULL,
        label TEXT NOT NULL,
        confidence REAL NOT NULL,
        probabilities TEXT NOT NULL,
        model_version TEXT NOT NULL,
        inference_time_ms INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scan_id) REFERENCES mri_scans(id) ON DELETE CASCADE
    );
    """)

    # 6. Bảng doctor_reviews
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS doctor_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prediction_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        confirmed_label TEXT NOT NULL,
        note TEXT,
        ai_assessment TEXT NOT NULL DEFAULT 'CONCORDANT',
        recommended_step TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (prediction_id) REFERENCES predictions(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 7. Bảng chat_sessions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL DEFAULT 'Hội thoại Y tế Mới',
        linked_prediction_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 8. Bảng chat_messages
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        sender TEXT NOT NULL,
        content TEXT NOT NULL,
        is_emergency INTEGER DEFAULT 0,
        sources_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );
    """)

    # 9. Bảng faq_documents
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS faq_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        source TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Bảng sessions lưu token KV mô phỏng
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # NẠP DỮ LIỆU SEED MẪU NẾU CHƯA CÓ
    cursor.execute("SELECT count(*) as cnt FROM users")
    if cursor.fetchone()["cnt"] == 0:
        salt = "neuro_salt_2026"
        # 1. Bác sĩ
        doc_hash = hash_password("Doctor@123", salt)
        cursor.execute("""
        INSERT INTO users (id, email, password_hash, password_salt, role, full_name)
        VALUES (1, 'demo.doctor@neuroscan.vn', ?, ?, 'doctor', 'BS.CKII Trần Quốc Bảo')
        """, (doc_hash, salt))
        cursor.execute("""
        INSERT INTO doctors (user_id, specialty, license_no, organization, phone)
        VALUES (1, 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)', 'CCHN-2026-NEURO-8841', 'Khoa Chẩn đoán Hình ảnh & Ngoại Thần kinh', '0909 000 222')
        """)

        # 2. Bệnh nhân
        pat_hash = hash_password("User@123", salt)
        cursor.execute("""
        INSERT INTO users (id, email, password_hash, password_salt, role, full_name)
        VALUES (2, 'demo.user@neuroscan.vn', ?, ?, 'patient', 'Nguyễn Minh An')
        """, (pat_hash, salt))
        cursor.execute("""
        INSERT INTO patients (user_id, date_of_birth, phone, gender, address, medical_history)
        VALUES (2, '1981-05-12', '0912 345 678', 'Nam', 'Hà Nội', 'Đau đầu mạn tính vùng thái dương')
        """)

        # 3. Quản trị viên
        admin_hash = hash_password("Admin@123", salt)
        cursor.execute("""
        INSERT INTO users (id, email, password_hash, password_salt, role, full_name)
        VALUES (3, 'admin@neuroscan.vn', ?, ?, 'admin', 'Quản trị viên Hệ thống')
        """, (admin_hash, salt))

        # 4. Bổ sung đầy đủ 4 Bệnh nhân lâm sàng đồng bộ với Cloudflare D1
        extra_patients = [
            (4, 'tranthimai75@gmail.com', 'Trần Thị Mai', '1975-11-20', '0987 654 321', 'Nữ', 'Quận Hải Châu, Đà Nẵng', 'Tăng huyết áp 5 năm. Chóng mặt khi thay đổi tư thế, đau đầu vùng chẩm - nền sọ.'),
            (5, 'hoangvanduc92@gmail.com', 'Hoàng Văn Đức', '1992-03-08', '0933 445 566', 'Nam', 'Quận Cầu Giấy, Hà Nội', 'Giảm thị lực hai bên thái dương tiến triển 2 tháng, rối loạn giấc ngủ, mệt mỏi.'),
            (6, 'lethuhang99@gmail.com', 'Lê Thu Hằng', '1999-08-19', '0977 889 900', 'Nữ', 'Quận Ninh Kiều, Cần Thơ', 'Khám sức khỏe tổng quát định kỳ, đôi khi căng thẳng đau đầu nhẹ do làm việc máy tính.')
        ]
        for uid, em, name, dob, ph, gen, addr, hist in extra_patients:
            cursor.execute("""
            INSERT OR IGNORE INTO users (id, email, password_hash, password_salt, role, full_name)
            VALUES (?, ?, ?, ?, 'patient', ?)
            """, (uid, em, pat_hash, salt, name))
            cursor.execute("""
            INSERT OR IGNORE INTO patients (user_id, date_of_birth, phone, gender, address, medical_history)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (uid, dob, ph, gen, addr, hist))

        # 5. Bổ sung đủ 4 Ca chụp MRI thực tế & Kết quả AI (Glioma, Meningioma, Pituitary, No Tumor)
        scans_seed = [
            (1, 2, 'sample_scans/sample_glioma_axial.jpg', 'sample_glioma_axial.jpg', 22122, 'image/jpeg', 'Axial (Trục ngang)', 'T1-Gd (Contrast)', 'Glioma', 0.934, {"Glioma": 0.934, "Meningioma": 0.041, "Pituitary": 0.015, "No Tumor": 0.010}, 45),
            (2, 4, 'sample_scans/sample_meningioma_axial.jpg', 'sample_meningioma_axial.jpg', 41726, 'image/jpeg', 'Axial (Trục ngang)', 'T1-Gd (Contrast)', 'Meningioma', 0.918, {"Glioma": 0.032, "Meningioma": 0.918, "Pituitary": 0.035, "No Tumor": 0.015}, 42),
            (3, 5, 'sample_scans/sample_pituitary_coronal.jpg', 'sample_pituitary_coronal.jpg', 38936, 'image/jpeg', 'Coronal (Đứng ngang)', 'T1-Gd (Contrast)', 'Pituitary', 0.905, {"Glioma": 0.024, "Meningioma": 0.048, "Pituitary": 0.905, "No Tumor": 0.023}, 39),
            (4, 2, 'sample_scans/sample_notumor_axial.jpg', 'sample_notumor_axial.jpg', 8456, 'image/jpeg', 'Axial (Trục ngang)', 'T2-FLAIR', 'No Tumor', 0.968, {"Glioma": 0.008, "Meningioma": 0.012, "Pituitary": 0.012, "No Tumor": 0.968}, 38),
        ]
        for sid, pid, r2k, fname, fsize, mime, stype, seqtype, lbl, conf, prb, inf_ms in scans_seed:
            cursor.execute("""
            INSERT OR REPLACE INTO mri_scans (id, patient_id, r2_key, file_name, file_size, mime_type, slice_type, sequence_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (sid, pid, r2k, fname, fsize, mime, stype, seqtype))
            cursor.execute("""
            INSERT OR REPLACE INTO predictions (id, scan_id, label, confidence, probabilities, model_version, inference_time_ms)
            VALUES (?, ?, ?, ?, ?, 'brain_mri_student_v1_onnx', ?)
            """, (sid, sid, lbl, conf, json.dumps(prb), inf_ms))

        cursor.execute("""
        INSERT OR REPLACE INTO doctor_reviews (id, prediction_id, doctor_id, confirmed_label, note, ai_assessment, recommended_step)
        VALUES (1, 1, 1, 'Glioma', 'Vùng tổn thương nội trục ngấm thuốc dạng vòng vùng đỉnh - chẩm phải kèm hoại tử trung tâm và phù não vận mạch xung quanh, đồng thuận với dự đoán Glioma của AI.', 'CONCORDANT', 'Chụp bổ sung cộng hưởng từ phổ (MRS), tưới máu (Perfusion MRI) và hội chẩn Ngoại Thần kinh.')
        """)

        # Sample FAQ Documents
        faqs = [
            ("Phân loại U tế bào thần kinh đệm (Glioma) theo WHO 2021", 
             "U tế bào thần kinh đệm (Glioma) bắt nguồn từ các tế bào nâng đỡ (glial cells) trong não bộ. Theo phân loại WHO CNS5 (2021), Glioma được phân tầng từ Độ 1 đến Độ 4. Glioblastoma (Độ 4) là dạng tiến triển nhanh nhất, thường có vùng hoại tử trung tâm và bắt thuốc viền dày không đều trên phim T1-Gd.",
             "WHO CNS5 (2021) Guidelines", "tumor_types"),
            ("U màng não (Meningioma) và đặc điểm hình ảnh MRI",
             "U màng não (Meningioma) phát triển từ màng nhện bao bọc não và tủy sống. Đa số (>80%) là u lành tính (WHO Grade 1). Trên phim MRI, Meningioma điển hình có bờ đều rõ nét và dấu hiệu kinh điển Đuôi màng cứng (Dural Tail Sign) ngấm thuốc tương phản mạnh trên chuỗi xung T1-Gd.",
             "National Cancer Institute (NCI)", "tumor_types"),
            ("U tuyến yên (Pituitary Adenoma) và ảnh hưởng thị lực",
             "U tuyến yên (Pituitary Adenoma) phát triển tại hố yên. Khi phát triển lớn vượt hố yên, khối u chèn ép giao thoa thị giác (Optic Chiasm) gây bán manh thái dương hai mắt. MRI sọ não lát cắt mỏng Sagittal và Coronal qua hố yên là tiêu chuẩn vàng chẩn đoán.",
             "NHS Foundation Trust", "tumor_types"),
            ("Ảnh MRI không phát hiện u (No Tumor / Normal Brain)",
             "Trường hợp No Tumor (không có u não) thể hiện các cấu trúc giải phẫu bình thường: não thất cân đối, không hiệu ứng khối chèn ép, rãnh cuộn não rõ nét, không ngấm thuốc đối quang từ bất thường trên T1-Gd và không phù não trên FLAIR.",
             "American College of Radiology (ACR)", "tumor_types"),
            ("Giải thích các chuỗi xung cộng hưởng từ não (T1, T2, FLAIR, T1-Gd)",
             "Chụp MRI sọ não kết hợp nhiều chuỗi xung:\n• T1W: Tối ưu đánh giá giải phẫu vỏ não.\n• T2W: Nước và dịch não tủy sáng trắng rõ rệt.\n• FLAIR: Triệt tín hiệu dịch tự do, giữ lại phù quanh u.\n• T1-Gd: Tiêm thuốc Gadolinium làm sáng rõ các vùng mạch máu tăng sinh quanh khối u.",
             "American College of Radiology (ACR)", "mri_sequences"),
            ("CẢNH BÁO CẤP CỨU THẦN KINH: Các dấu hiệu cờ đỏ cần gọi 115",
             "⚠️ NGUY HIỂM TÍNH MẠNG — CẦN CẤP CỨU Y TẾ NGAY LẬP TỨC: Đau đầu sét đánh dữ dội đột ngột, co giật lần đầu ở người lớn, dấu hiệu đột quỵ FAST (méo miệng, liệt một bên, nói ngọng), mất ý thức cấp tính. Gọi ngay Cấp cứu 115!",
             "Bộ Y tế Việt Nam & WHO", "emergency")
        ]
        for title, content, source, cat in faqs:
            cursor.execute("INSERT INTO faq_documents (title, content, source, category) VALUES (?, ?, ?, ?)", (title, content, source, cat))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("[✓] Cơ sở dữ liệu SQLite FastAPI đã khởi tạo thành công tại:", DB_PATH)
