# NeuroScan AI — Backend FastAPI (Python Server)

Module này cung cấp máy chủ **FastAPI REST API** viết bằng Python, đáp ứng đầy đủ đề xuất kiến trúc trong tài liệu `De_xuat_cong_nghe_Frontend_Backend_Chatbot_U_Nao_MRI.docx`. Nó có thể chạy song song hoặc thay thế Edge Worker tùy theo nhu cầu môi trường triển khai.

---

## 1. Tính Năng Nổi Bật

* **Swagger UI tự động**: Truy cập tài liệu API trực quan tại `http://127.0.0.1:8000/docs`.
* **Tích hợp Mô hình ONNX**: Tự động nạp `brain_mri_student.onnx` bằng `onnxruntime` trên máy chủ Python để chạy suy luận trực tiếp.
* **Cơ sở dữ liệu SQLite**: Tự động khởi tạo 9 bảng chuẩn mực (`users`, `patients`, `doctors`, `mri_scans`, `predictions`, `doctor_reviews`, `chat_sessions`, `chat_messages`, `faq_documents`).
* **Hỗ trợ đầy đủ các nhóm API**:
  * Xác thực & Phân quyền (PBKDF2 HMAC SHA-256): `/api/auth/*`
  * Quản lý ảnh MRI & Upload: `/api/scans/*`
  * Suy luận AI 4 lớp: `/api/predict`, `/api/predictions/*`
  * Bác sĩ hội chẩn & Ghi chú: `/api/reviews`
  * Chatbot RAG Y tế: `/api/chat/*`
  * Quản trị FAQ (FR08): `/api/faq/*`
  * Quản lý Hồ sơ Bệnh nhân: `/api/patients/*`

---

## 2. Cách Khởi Chạy

```bash
cd backend_fastapi
python run.py
```

* API Health: `http://127.0.0.1:8000/health`
* Swagger UI: `http://127.0.0.1:8000/docs`
* Tích hợp Frontend: Trong thư mục `frontend`, đặt `VITE_API_BASE_URL=http://127.0.0.1:8000/api` để kết nối thẳng vào FastAPI Backend!
