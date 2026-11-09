-- ============================================================================
-- NeuroScan AI — Seed Data Khởi tạo (Cloudflare D1 SQLite)
-- Khởi tạo người dùng mẫu, hồ sơ bệnh nhân/bác sĩ, kết quả và bộ FAQ y khoa
-- ============================================================================

-- 1. Tài khoản Người dùng (Mật khẩu băm PBKDF2 khớp với crypto.ts)
-- Doctor: demo.doctor@neuroscan.vn (Doctor@123)
-- Patient: demo.user@neuroscan.vn (User@123)
-- Admin: admin@neuroscan.vn (Admin@123)
INSERT OR IGNORE INTO users (id, email, password_hash, password_salt, role, full_name, created_at) VALUES
(1, 'demo.doctor@neuroscan.vn', '888a7c2e0b57e79c6d3bc0a03bb3c383e20606995079a4087e59670eb82088b3', 'neuro_salt_2026', 'doctor', 'BS.CKII Trần Quốc Bảo', '2026-08-01 08:00:00'),
(2, 'demo.user@neuroscan.vn', 'e81255e4bf51a7e937d94cf212b77fcb2933be7be12269c2df36e053d2bb0c49', 'neuro_salt_2026', 'patient', 'Nguyễn Minh An', '2026-09-15 08:30:00'),
(3, 'admin@neuroscan.vn', 'fbcf02fe1ba1dc718797926b4843b0d2a84e62a3ea4279b32938cf7873a46698', 'neuro_salt_2026', 'admin', 'Quản trị viên Hệ thống', '2026-01-01 00:00:00');

-- 2. Hồ sơ Bác sĩ (doctors)
INSERT OR IGNORE INTO doctors (user_id, specialty, license_no, organization, phone) VALUES
(1, 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)', 'CCHN-2026-NEURO-8841', 'Khoa Chẩn đoán Hình ảnh & Ngoại Thần kinh', '0909 000 222');

-- 3. Hồ sơ Bệnh nhân (patients)
INSERT OR IGNORE INTO patients (user_id, date_of_birth, phone) VALUES
(2, '1981-05-12', '0912 345 678');

-- 4. Bản ghi chụp MRI mẫu (mri_scans)
INSERT OR IGNORE INTO mri_scans (id, patient_id, r2_key, uploaded_at, file_name, file_size, mime_type, slice_type, sequence_type) VALUES
(1, 2, 'scans/demo_glioma_t1ce.png', '2026-10-28 09:15:00', 'patient_an_axial_t1ce.png', 245890, 'image/png', 'Axial (Trục ngang)', 'T1-Gd (Contrast)'),
(2, 2, 'scans/demo_meningioma_t1ce.png', '2026-11-01 14:30:00', 'patient_an_dural_sagittal.png', 312450, 'image/png', 'Sagittal (Mặt cắt dọc)', 'T1-Gd (Contrast)'),
(3, 2, 'scans/demo_notumor_flair.png', '2026-11-05 10:00:00', 'patient_an_normal_flair.png', 198760, 'image/png', 'Axial (Trục ngang)', 'T2-FLAIR');

-- 5. Kết quả Dự đoán AI (predictions)
INSERT OR IGNORE INTO predictions (id, scan_id, label, confidence, probabilities, model_version, inference_time_ms, created_at) VALUES
(1, 1, 'Glioma', 0.892, '{"Glioma":0.892,"Meningioma":0.054,"Pituitary":0.021,"No Tumor":0.033}', 'brain_mri_student_v1_onnx', 45, '2026-10-28 09:15:05'),
(2, 2, 'Meningioma', 0.865, '{"Glioma":0.048,"Meningioma":0.865,"Pituitary":0.032,"No Tumor":0.055}', 'brain_mri_student_v1_onnx', 42, '2026-11-01 14:30:04'),
(3, 3, 'No Tumor', 0.941, '{"Glioma":0.012,"Meningioma":0.018,"Pituitary":0.029,"No Tumor":0.941}', 'brain_mri_student_v1_onnx', 38, '2026-11-05 10:00:03');

-- 6. Đánh giá & Xác nhận của Bác sĩ (doctor_reviews)
INSERT OR IGNORE INTO doctor_reviews (id, prediction_id, doctor_id, confirmed_label, note, ai_assessment, recommended_step, created_at) VALUES
(1, 1, 1, 'Glioma', 'Vùng tổn thương ngấm thuốc dạng viền thùy trán - thái dương trái phù hợp hình ảnh Glioma bậc cao. Khuyến nghị chụp thêm MRI phổ (MRS) và hội chẩn ngoại thần kinh.', 'CONCORDANT', 'Chụp MRI phổ (MRS) và sinh thiết vi phẫu', '2026-10-28 11:20:00');

-- 7. Phiên Chatbot (chat_sessions)
INSERT OR IGNORE INTO chat_sessions (id, user_id, title, linked_prediction_id, created_at) VALUES
(1, 2, 'Hỏi về kết quả MRI Glioma', 1, '2026-10-28 09:20:00');

-- 8. Tin nhắn Chatbot (chat_messages)
INSERT OR IGNORE INTO chat_messages (id, session_id, sender, content, is_emergency, created_at) VALUES
(1, 1, 'user', 'U tế bào thần kinh đệm (Glioma) có nguy hiểm không bác sĩ?', 0, '2026-10-28 09:20:05'),
(2, 1, 'bot', 'U tế bào thần kinh đệm (Glioma) là nhóm u nguyên phát phát triển từ các tế bào thần kinh đệm. Mức độ nguy hiểm phụ thuộc vào cấp độ WHO CNS5 (Độ 1 đến Độ 4). Bệnh nhân cần được bác sĩ chuyên khoa thần kinh thăm khám trực tiếp để lên phác đồ điều trị phù hợp.', 0, '2026-10-28 09:20:10');

-- 9. Tài liệu Tri thức Y tế & FAQ RAG (faq_documents)
INSERT OR IGNORE INTO faq_documents (id, title, content, source, category) VALUES
(1, 'Phân loại U tế bào thần kinh đệm (Glioma) theo WHO 2021', 
'U tế bào thần kinh đệm (Glioma) bắt nguồn từ các tế bào nâng đỡ (glial cells) trong não bộ. Theo phân loại WHO CNS5 (2021), Glioma được phân tầng từ Độ 1 đến Độ 4, kết hợp hình thái mô học và dấu ấn phân tử như đột biến gen IDH và mất đoạn 1p/19q. Glioblastoma (Độ 4) là dạng tiến triển nhanh nhất, thường có vùng hoại tử trung tâm và bắt thuốc viền dày không đều trên phim T1-Gd.', 
'WHO CNS5 (2021) Classification of Tumors of the Central Nervous System', 'tumor_types'),

(2, 'U màng não (Meningioma) và đặc điểm hình ảnh MRI', 
'U màng não (Meningioma) phát triển từ màng nhện bao bọc não và tủy sống. Đa số (>80%) là u lành tính (WHO Grade 1). Trên phim MRI, Meningioma điển hình có bờ đều rõ nét, đáy rộng bám sát màng cứng và tạo dấu hiệu kinh điển "Đuôi màng cứng" (Dural Tail Sign) ngấm thuốc tương phản mạnh trên chuỗi xung T1-Gd. Xung T2-FLAIR thường hiển thị dải dịch phù não quanh u.', 
'National Cancer Institute (NCI) Meningioma Guidelines', 'tumor_types'),

(3, 'U tuyến yên (Pituitary Adenoma) và ảnh hưởng thị lực', 
'U tuyến yên (Pituitary Adenoma) là khối u nguyên phát tại thùy trước tuyến yên trong hố yên (Sella Turcica). U phân loại thành Microadenoma (<10mm) hoặc Macroadenoma (>=10mm). Khi phát triển vượt hố yên, khối u chèn ép giao thoa thị giác (Optic Chiasm) gây triệu chứng kinh điển là bán manh thái dương hai mắt. MRI sọ não lát cắt mỏng Sagittal và Coronal qua hố yên là tiêu chuẩn vàng chẩn đoán.', 
'NHS Foundation Trust & Endocrine Society Clinical Guidelines', 'tumor_types'),

(4, 'Ảnh MRI không phát hiện u (No Tumor / Normal Brain)', 
'Trường hợp No Tumor (không có khối u não) thể hiện các cấu trúc giải phẫu nhu mô não bình thường: hệ thống não thất cân đối, không có hiệu ứng khối chèn ép, rãnh cuộn não rõ nét, không có tổn thương ngấm thuốc đối quang từ bất thường trên xung T1-Gd và không có vùng phù não tăng tín hiệu trên xung FLAIR.', 
'American College of Radiology (ACR) Appropriateness Criteria', 'tumor_types'),

(5, 'Giải thích các chuỗi xung cộng hưởng từ não (T1, T2, FLAIR, T1-Gd)', 
'Chụp cộng hưởng từ MRI sọ não kết hợp nhiều chuỗi xung vật lý:
• T1-weighted (T1W): Dịch não tủy màu tối, chất trắng sáng hơn chất xám. Tối ưu đánh giá giải phẫu tổng quát vỏ não.
• T2-weighted (T2W): Nước và dịch não tủy sáng trắng rõ rệt. Giúp phát hiện dịch tích tụ, tổn thương mô não.
• FLAIR: Triệt tín hiệu dịch tự do, giữ lại tín hiệu của dịch phù do tổn thương bệnh lý, là chuỗi xung nhạy nhất nhận diện phù quanh u.
• T1-Gd: Tiêm thuốc đối quang từ Gadolinium, làm sáng rõ các vùng mạch máu tăng sinh bất thường hoặc hàng rào máu não bị phá vỡ quanh khối u.', 
'American College of Radiology (ACR)', 'mri_sequences'),

(6, 'CẢNH BÁO CẤP CỨU THẦN KINH: Các dấu hiệu cờ đỏ cần gọi 115', 
'⚠️ NGUY HIỂM TÍNH MẠNG — CẦN CẤP CỨU Y TẾ NGAY LẬP TỨC:
Nếu bản thân hoặc người xung quanh có bất kỳ dấu hiệu "cờ đỏ" sau đây, phải GỌI NGAY 115 hoặc đến khoa Cấp cứu bệnh viện gần nhất:
1. Đau đầu sét đánh (Thunderclap Headache): Đau đầu dữ dội đột ngột đạt đỉnh cực đại trong vài giây.
2. Co giật hoặc co giật tái diễn lần đầu xuất hiện ở người trưởng thành.
3. Dấu hiệu đột quỵ FAST: Méo miệng, tê yếu hoặc liệt một bên tay/chân, nói khó, ngọng.
4. Mất ý thức đột ngột, lú lẫn cấp tính, hôn mê.
5. Sốt cao kèm cứng cổ, đau đầu dữ dội và sợ ánh sáng.', 
'Bộ Y tế Việt Nam & WHO — Phác đồ Cấp cứu Thần kinh', 'emergency'),

(7, 'Quy tắc an toàn y tế và vai trò hỗ trợ của Trợ lý AI NeuroScan', 
'NeuroScan AI được vận hành như một công cụ hỗ trợ sàng lọc và định hướng tham khảo y tế (Clinical Decision Support Tool), KHÔNG thay thế phán đoán lâm sàng của bác sĩ chuyên khoa thần kinh. Mọi kết quả phân tích hình ảnh và khuyến nghị từ hệ thống bắt buộc phải được đối chiếu với hồ sơ bệnh án đầy đủ và chỉ định của Bác sĩ điều trị có chứng chỉ hành nghề.', 
'NeuroScan AI Clinical Safety Protocol & Medical Ethics Standard', 'guidelines');
