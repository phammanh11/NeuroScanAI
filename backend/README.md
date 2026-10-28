# NeuroScan AI — Backend Specification & API Contract (Chờ triển khai)

Thư mục `backend/` được tổ chức sẵn nhằm trực quan hóa cấu trúc dự án theo kiến trúc tách biệt **Frontend (`frontend/`)** và **Backend (`backend/`)** như đề xuất trong 3 tài liệu đặc tả.

> **Lưu ý:** Trong phạm vi giai đoạn hiện tại, toàn bộ ứng dụng hoạt động ở tầng **Frontend (`d:\MRI\frontend`)** với chế độ Mock (`VITE_MOCK_MODE=true`) và lớp Adapter API đã định nghĩa đầy đủ kiểu dữ liệu (`TypeScript interfaces`). Không triển khai code Backend FastAPI, Database hoặc mô hình PyTorch tại giai đoạn này.

---

## 1. Cấu trúc thư mục Backend dự kiến (FastAPI + PostgreSQL/pgvector + PyTorch)

```text
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py          # Xác thực JWT, phân quyền RBAC (USER / DOCTOR)
│   │       ├── mri.py           # Upload ảnh MRI, lấy kết quả phân tích, lịch sử, gửi yêu cầu bác sĩ
│   │       ├── doctor.py        # Danh sách ca được phân công, ghi chú lâm sàng, cập nhật trạng thái review
│   │       ├── chat.py          # Hội thoại trợ lý AI Y tế (FAQ JSON + RAG pgvector)
│   │       └── knowledge.py     # Truy xuất bài viết y khoa đã kiểm duyệt
│   ├── core/
│   │   ├── config.py            # Biến môi trường, giới hạn upload, CORS
│   │   └── security.py          # Kiểm tra quyền trên mỗi endpoint (không phụ thuộc UI ẩn nút)
│   ├── models/                  # SQLAlchemy / SQLModel (PostgreSQL + pgvector)
│   ├── schemas/                 # Pydantic v2 schemas khớp với `frontend/src/types/domain.ts`
│   └── services/
│       ├── mri_pipeline.py      # Tiền xử lý OpenCV (Brain ROI Cropping, CLAHE, Z-score) & PyTorch Inference
│       └── rag_service.py       # Truy xuất FAQ JSON & Vector DB kèm metadata nguồn xác minh
├── data/
│   └── knowledge_seed.json      # Dữ liệu FAQ y khoa chuẩn hóa theo cấu trúc JSON đề xuất
├── .env.example
└── README.md
```

---

## 2. Danh mục REST API Endpoints dự kiến (Khớp với `frontend/src/constants/apiEndpoints.ts`)

| Nhóm | Method | Endpoint | Quyền truy cập | Mô tả |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/login` | Công khai | Đăng nhập và trả về thông tin phiên kèm role (`USER` hoặc `DOCTOR`) |
| **Auth** | `POST` | `/api/v1/auth/register` | Công khai | Đăng ký tài khoản `USER` (Không cho phép tự đăng ký role `DOCTOR`) |
| **Auth** | `POST` | `/api/v1/auth/forgot-password` | Công khai | Yêu cầu khôi phục mật khẩu |
| **MRI (User)** | `POST` | `/api/v1/mri/analyses` | `USER` | Upload ảnh MRI (`multipart/form-data`), kiểm tra định dạng/dung lượng và chạy pipeline |
| **MRI (User)** | `GET` | `/api/v1/mri/analyses` | `USER` | Lấy danh sách lịch sử phân tích của người dùng hiện tại |
| **MRI (User)** | `GET` | `/api/v1/mri/analyses/:id` | `USER`, `DOCTOR` (được chia sẻ) | Xem chi tiết phiên phân tích, xác suất 4 lớp, trạng thái phản hồi bác sĩ |
| **MRI (User)** | `DELETE` | `/api/v1/mri/analyses/:id` | `USER` | Xóa bản ghi phân tích thuộc quyền sở hữu của người dùng |
| **MRI (User)** | `POST` | `/api/v1/mri/analyses/:id/request-review` | `USER` | Người dùng đồng ý chia sẻ dữ liệu và gửi yêu cầu bác sĩ xem xét |
| **Doctor** | `GET` | `/api/v1/doctor/cases` | `DOCTOR` | Lấy danh sách các ca MRI được phân công hoặc chia sẻ hợp lệ |
| **Doctor** | `GET` | `/api/v1/doctor/cases/:id` | `DOCTOR` | Xem chi tiết ca MRI, xác suất AI, ảnh tiền xử lý/Grad-CAM (nếu có) |
| **Doctor** | `POST` | `/api/v1/doctor/cases/:id/review` | `DOCTOR` | Lưu ghi chú chuyên môn, đánh giá kết quả AI và cập nhật trạng thái ca |
| **Chatbot** | `GET` | `/api/v1/chat/sessions` | `USER`, `DOCTOR` | Lấy danh sách phiên hội thoại với Trợ lý AI Y tế |
| **Chatbot** | `POST` | `/api/v1/chat/messages` | `USER`, `DOCTOR` | Gửi câu hỏi, kiểm tra quy tắc an toàn/cấp cứu, truy xuất FAQ/RAG có nguồn |
| **Knowledge** | `GET` | `/api/v1/knowledge/articles` | Công khai / Đã đăng nhập | Tra cứu kho kiến thức y khoa theo 7 nhóm chủ đề |

---

## 3. Nguyên tắc Bảo mật & An toàn Y tế khi triển khai Backend

1. **Kiểm tra phân quyền (RBAC) tại tầng API:** Mọi endpoint `/api/v1/doctor/*` phải xác thực token và kiểm tra role `DOCTOR` cùng quyền truy cập trên từng ca bệnh (`case_id`).
2. **Bảo vệ dữ liệu sức khỏe:** Ảnh MRI lưu trên Object Storage (Cloudflare R2 / S3), loại bỏ metadata định danh (EXIF/DICOM tags nhạy cảm) trước khi lưu trữ.
3. **Không suy diễn quá phạm vi mô hình:** Chỉ trả về `preprocessedImageUrl` và `gradcamUrl` khi pipeline AI thực sự sinh ra các đầu ra này.
