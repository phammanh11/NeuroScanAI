# NeuroScan AI — Cloudflare Edge Backend (`backend/`)

Thư mục `backend/` là **Backend Production chính thức** của hệ thống NeuroScan AI, vận hành trên nền tảng **Cloudflare Workers / Pages Functions** (`https://neuroscan.pages.dev`).

---

## 1. Cấu trúc Mã nguồn

```text
backend/
├── migrations/
│   └── 0001_schema.sql      # Schema chuẩn hóa CSDL Cloudflare D1 (SQLite)
├── seeds/
│   └── seed.sql             # Dữ liệu khởi tạo ban đầu
├── shared/
│   └── types.ts             # Định nghĩa kiểu dữ liệu dùng chung (User, MriScan, Prediction, RagTraceInfo...)
├── src/
│   ├── index.ts             # Điểm vào chính (Hono App) xử lý toàn bộ REST API (/api/*)
│   ├── db/
│   │   ├── init.ts          # Tự động kiểm tra, nâng cấp schema D1 và nạp dữ liệu chuẩn (Users, 4 Patients, 4 MRI Scans, FAQ)
│   │   └── fallback.ts      # Bộ nhớ đệm D1/R2/KV/Vectorize dự phòng khi chạy độc lập không có binding
│   ├── middleware/
│   │   └── auth.ts          # Xác thực phiên làm việc (Session Token + Cookie) & phân quyền RBAC (Doctor/Patient/Admin)
│   └── utils/
│       ├── rag.ts           # Pipeline Vector RAG (@cf/baai/bge-m3 1024-dim + Cosine Similarity + Llama-3.3-70B)
│       ├── chatbot.ts       # Bộ điều phối Trợ lý AI Y tế, tra cứu trực tiếp hồ sơ ca chụp MRI trên D1 & phát hiện Cờ đỏ
│       ├── crypto.ts        # Băm mật khẩu an toàn PBKDF2-HMAC-SHA256 (100.000 vòng lặp) trên Web Crypto API
│       └── response.ts      # Chuẩn hóa định dạng JSON phản hồi API
└── package.json
```

---

## 2. Danh mục REST API Endpoints

| Nhóm | Method | Endpoint | Mô tả |
| :--- | :--- | :--- | :--- |
| **Health** | `GET` | `/api/health` | Kiểm tra trạng thái kết nối Cloudflare D1, R2, Vectorize và Workers AI |
| **Auth** | `POST` | `/api/auth/login` | Đăng nhập tài khoản (`DOCTOR`, `USER`, `ADMIN`) và cấp phát Session Token |
| **Auth** | `POST` | `/api/auth/register` | Đăng ký tài khoản mới và khởi tạo hồ sơ tương ứng trong `patients` / `doctors` |
| **Auth** | `POST` | `/api/auth/logout` | Đăng xuất và hủy phiên làm việc trên KV/Cookie |
| **Auth** | `GET` | `/api/auth/me` | Lấy thông tin người dùng hiện tại từ token |
| **Patients** | `GET/POST/PUT/DELETE` | `/api/patients` | Quản lý danh sách hồ sơ bệnh nhân lâm sàng |
| **MRI Scans** | `POST` | `/api/scans` | Tải ảnh chụp MRI lên Cloudflare R2 và lưu metadata vào bảng `mri_scans` |
| **Predictions** | `GET/POST/DELETE` | `/api/predictions` | Lưu và truy xuất kết quả suy luận AI 4 lớp (`Glioma`, `Meningioma`, `Pituitary`, `No Tumor`) |
| **Reviews** | `POST` | `/api/reviews` | Bác sĩ chuyên khoa lưu nhận định lâm sàng và xác nhận nhãn chẩn đoán |
| **Chatbot** | `GET/POST/DELETE` | `/api/chat/sessions` | Quản lý các phiên hội thoại và lịch sử tin nhắn với Trợ lý AI Y tế |
| **Chatbot** | `POST` | `/api/chat` | Gửi câu hỏi tới pipeline Vector RAG + Tra cứu trực tiếp ca chụp MRI trên D1 |
| **Vector RAG** | `POST/GET` | `/api/rag/index`, `/api/rag/status` | Đánh chỉ mục kho tri thức y khoa vào Vectorize + `rag_chunks` |
