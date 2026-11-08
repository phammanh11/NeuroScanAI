-- ============================================================================
-- NeuroScan AI — Seed Data (Dữ liệu mẫu ban đầu cho D1)
-- ============================================================================

-- Bệnh nhân mẫu
INSERT OR IGNORE INTO patients (id, mrn, full_name, age, gender, phone, email, address, clinical_history, symptoms, status, last_scan_date) VALUES
(1, 'NS-BN-2026-001', 'Lê Văn Hoàng', 48, 'Nam', '0912 345 678', 'hoang.le@email.vn', 'Quận 5, TP. Hồ Chí Minh', 'Tiền sử tăng huyết áp nhẹ, không có bệnh nền mạn tính khác.', 'Đau đầu âm ỉ vùng thái dương trái kéo dài 3 tuần, tăng khi thức dậy.', 'Đang theo dõi', '2026-10-28 09:15:00'),
(2, 'NS-BN-2026-002', 'Nguyễn Thị Mai', 54, 'Nữ', '0983 221 456', 'mai.nguyen@email.vn', 'Ba Đình, Hà Nội', 'Mãn kinh 3 năm, có triệu chứng giảm thị lực góc ngoài mắt phải.', 'Nhìn mờ bán manh thái dương hai mắt nhẹ, mệt mỏi buổi sáng.', 'Chờ phân tích', '2026-11-01 14:30:00'),
(3, 'NS-BN-2026-003', 'Phạm Đức Huy', 39, 'Nam', '0908 776 543', 'huy.pham@email.vn', 'Hải Châu, Đà Nẵng', 'Theo dõi sức khỏe thần kinh định kỳ hàng năm.', 'Không ghi nhận triệu chứng thần kinh khu trú, sức khỏe ổn định.', 'Đã chẩn đoán', '2026-11-05 10:00:00');

-- Dữ liệu Tri thức RAG Chatbot Y tế (Chuẩn WHO CNS5 & NCI & NHS)
INSERT OR IGNORE INTO rag_chunks (chunk_id, title, category, content, source) VALUES
('kb-glioma-classification', 'Phân loại U tế bào thần kinh đệm (Glioma) theo WHO 2021', 'tumor_types', 
'U tế bào thần kinh đệm (Glioma) bắt nguồn từ các tế bào nâng đỡ (tế bào đệm - glial cells) trong não bộ. Theo phân loại WHO CNS5 (2021), Glioma được phân tầng theo độ ác tính từ Độ 1 đến Độ 4 (Grade 1 - 4), kết hợp hình thái mô học và dấu ấn sinh học phân tử như đột biến gen IDH và mất đoạn 1p/19q. Glioblastoma (GBM - Độ 4) là dạng tiến triển nhanh nhất, thường xuất hiện vùng hoại tử trung tâm và bắt thuốc viền dày không đều trên phim MRI T1-Gd có tiêm thuốc đối quang từ.', 
'WHO CNS5 (2021) Classification of Tumors of the Central Nervous System'),

('kb-meningioma-classification', 'U màng não (Meningioma) và đặc điểm chẩn đoán hình ảnh MRI', 'tumor_types', 
'U màng não (Meningioma) phát triển từ lớp màng nhện bao bọc não và tủy sống. Đa số (>80%) là u lành tính (WHO Grade 1), tiến triển chậm. Trên phim chụp cộng hưởng từ MRI, Meningioma điển hình có bờ đều rõ nét, đáy rộng bám sát màng cứng và tạo dấu hiệu kinh điển "Đuôi màng cứng" (Dural Tail Sign) ngấm thuốc tương phản mạnh trên chuỗi xung T1-Gd. Xung T2-FLAIR thường hiển thị dải dịch phù não bao quanh u nếu khối u gây chèn ép nhu mô não lân cận.', 
'National Cancer Institute (NCI) Meningioma Guidelines'),

('kb-pituitary-adenoma', 'U tuyến yên (Pituitary Adenoma) và ảnh hưởng nội tiết thần kinh', 'tumor_types', 
'U tuyến yên (Pituitary Adenoma) là khối u nguyên phát tại thùy trước tuyến yên nằm trong hố yên (Sella Turcica) ở đáy não. U phân loại thành Microadenoma (<10mm) hoặc Macroadenoma (>=10mm). Khi Macroadenoma phát triển vượt lên khỏi hố yên, khối u thường chèn ép giao thoa thị giác (Optic Chiasm) gây triệu chứng kinh điển là bán manh thái dương hai mắt (Bitemporal Hemianopsia). MRI sọ não lát cắt mỏng Sagittal và Coronal qua hố yên là tiêu chuẩn vàng chẩn đoán.', 
'NHS Foundation Trust & Endocrine Society Clinical Guidelines'),

('kb-mri-sequences-explained', 'Giải thích các chuỗi xung cộng hưởng từ não (MRI Sequences: T1, T2, FLAIR, T1-Gd)', 'mri_sequences', 
'Chụp cộng hưởng từ MRI sọ não kết hợp nhiều chuỗi xung vật lý khác nhau để phân tích đa góc nhìn:
• T1-weighted (T1W): Dịch não tủy (CSF) có màu đen, chất xám có màu xám, chất trắng sáng hơn. Tối ưu đánh giá giải phẫu tổng quát vỏ não và các rãnh cuộn não.
• T2-weighted (T2W): Nước và dịch não tủy sáng trắng rõ rệt. Giúp phát hiện dịch tích tụ, u phù nề và tổn thương mô não.
• FLAIR (Fluid-Attenuated Inversion Recovery): Chuỗi xung triệt tín hiệu dịch tự do, giữ lại tín hiệu của dịch phù do tổn thương bệnh lý, là chuỗi xung nhạy nhất nhận diện phù não quanh khối u.
• T1-Gd (Contrast Enhanced): Tiêm thuốc đối quang từ Gadolinium, làm sáng các vùng mạch máu tăng sinh bất thường hoặc hàng rào máu não bị phá vỡ quanh khối u.', 
'American College of Radiology (ACR) Appropriateness Criteria'),

('kb-emergency-redflags-115', 'CẢNH BÁO CẤP CỨU THẦN KINH: Các dấu hiệu cờ đỏ cần gọi 115 ngay lập tức', 'emergency', 
'⚠️ NGUY HIỂM TÍNH MẠNG — CẦN CẤP CỨU Y TẾ NGAY LẬP TỨC:
Nếu bản thân hoặc người xung quanh có bất kỳ dấu hiệu thần kinh "cờ đỏ" (Red Flags) sau đây, tuyệt đối KHÔNG trì hoãn tra cứu mà phải GỌI NGAY 115 hoặc đến khoa Cấp cứu bệnh viện gần nhất:
1. Đau đầu sét đánh (Thunderclap Headache): Đau đầu dữ dội đột ngột đạt đỉnh cực đại trong vòng vài giây, cảm giác "như bị nổ trong đầu".
2. Co giật hoặc co giật tái diễn lần đầu tiên xuất hiện ở người trưởng thành.
3. Dấu hiệu đột quỵ FAST: Méo miệng, tê yếu hoặc liệt một bên tay/chân, nói khó, ngọng hoặc không hiểu lời nói.
4. Mất ý thức đột ngột, lú lẫn cấp tính, hôn mê hoặc không đánh thức được.
5. Sốt cao kèm cứng cổ, đau đầu dữ dội và sợ ánh sáng (nghi ngờ viêm màng não cấp).', 
'World Health Organization (WHO) & Bộ Y tế Việt Nam — Phác đồ Cấp cứu Thần kinh'),

('kb-ai-clinical-integration', 'Nguyên tắc an toàn y tế và vai trò hỗ trợ của Trợ lý AI NeuroScan', 'guidelines', 
'NeuroScan AI được thiết kế và vận hành như một công cụ hỗ trợ sàng lọc và định hướng tham khảo y tế (Clinical Decision Support Tool), KHÔNG thay thế phán đoán lâm sàng của bác sĩ chuyên khoa thần kinh. Mọi kết quả phân tích hình ảnh và khuyến nghị từ hệ thống bắt buộc phải được đối chiếu với hồ sơ bệnh án đầy đủ, triệu chứng lâm sàng và chỉ định của Bác sĩ điều trị có chứng chỉ hành nghề hợp pháp.', 
'NeuroScan AI Clinical Safety Protocol & Medical Ethics Standard');

-- Bản ghi chụp MRI mẫu (Lưu trữ an toàn trên R2 với trạng thái PENDING_MODEL)
INSERT OR IGNORE INTO mri_scans (id, scan_code, patient_id, patient_name, file_name, file_key, file_url, file_size, mime_type, slice_type, sequence_type, status, findings_summary) VALUES
(1, 'SCAN-2026-001', 1, 'Lê Văn Hoàng', 'patient_hoang_t1gd_axial.png', 'scans/demo_hoang_t1gd_axial.png', '/api/v1/files/scans/demo_hoang_t1gd_axial.png', 245890, 'image/png', 'Axial (Trục ngang)', 'T1-Gd (Contrast)', 'PENDING_MODEL', 'Ảnh chụp MRI đã được tải lên và lưu trữ an toàn trên Cloudflare R2. Tình trạng phân loại AI đang tạm chờ nạp trọng số mô hình sau huấn luyện.'),
(2, 'SCAN-2026-002', 2, 'Nguyễn Thị Mai', 'patient_mai_flair_sagittal.png', 'scans/demo_mai_flair_sagittal.png', '/api/v1/files/scans/demo_mai_flair_sagittal.png', 312450, 'image/png', 'Sagittal (Mặt cắt dọc)', 'T2-FLAIR', 'PENDING_MODEL', 'Ảnh chụp MRI đã được tải lên và lưu trữ an toàn trên Cloudflare R2. Tình trạng phân loại AI đang tạm chờ nạp trọng số mô hình sau huấn luyện.');

