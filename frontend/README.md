# NeuroScan AI — Frontend Application

Nền tảng giao diện người dùng (Frontend) cho **NeuroScan AI** — Hệ thống hỗ trợ phân loại ảnh MRI não 4 lớp (`Glioma`, `Meningioma`, `Pituitary`, `No Tumor`), kết nối Bác sĩ xem xét chuyên môn theo phân quyền **RBAC (`USER` / `DOCTOR`)** và **Trợ lý AI Y tế** tra cứu kiến thức Vector RAG.

---

## 1. Công nghệ sử dụng (Tech Stack)

- **Core:** React 18 + Vite 6 + TypeScript (Strict Mode)
- **Inference trên Trình duyệt:** `onnxruntime-web` (WebAssembly WASM) chạy `brain_mri_student.onnx` + bản đồ nhiệt Grad-CAM trên Canvas
- **Styling & Design System:** Tailwind CSS + Custom Medical SaaS Tokens (Light/Dark Mode)
- **Icons:** Lucide React
- **Routing & RBAC:** React Router v6 (`ProtectedRoute` phân quyền `USER` và `DOCTOR`, Lazy Loading)
- **Biểu đồ:** Recharts (Phân bố 4 lớp Softmax, thống kê phiên, ma trận nhầm lẫn)
- **Form & Validation:** React Hook Form + Zod
- **State & HTTP:** TanStack Query + Axios

---

## 2. Hướng dẫn cài đặt và chạy ứng dụng

```bash
cd d:\MRI\frontend

# 1. Cài đặt dependencies
npm install

# 2. Chạy môi trường phát triển (Vite tự động nạp Hono API từ ../backend/src/index.ts)
npm run dev

# 3. Kiểm tra ESLint
npm run lint

# 4. Build bản Production (Frontend + Worker _worker.js)
npm run build
```

---

## 3. Cấu hình biến môi trường (`.env`)

Mặc định khi không đặt `.env`, ứng dụng tự dùng API tích hợp cùng origin (`/api`) và chế độ suy luận thật (`VITE_MOCK_MODE=false`):

```env
# Đường dẫn API của Cloudflare Worker / Vite Hono Middleware
VITE_API_BASE_URL=/api

# Đặt true chỉ khi muốn ép chạy hoàn toàn bằng bộ nhớ giả lập offline
VITE_MOCK_MODE=false

# Độ trễ mô phỏng trong chế độ Mock (ms)
VITE_MOCK_LATENCY_MS=300
```

---

## 4. Phân quyền RBAC (`USER` & `DOCTOR`) và Tài khoản Kiểm thử

Bạn có thể truy cập trực tiếp các tính năng công khai hoặc chuyển nhanh vai trò tại `/login`:

1. **Vai trò `USER` (`demo.user@neuroscan.vn`):**
   - `/dashboard`: Tổng quan cá nhân, biểu đồ phân bố nhãn và danh sách phiên chụp gần đây.
   - `/mri-analysis`: Tải ảnh MRI (PNG/JPG/JPEG) hoặc chọn 1 trong 4 mẫu lát cắt thực tế để chạy suy luận ONNX ngay trên trình duyệt.
   - `/mri-results/:id`: Trình xem ảnh y tế `MRIViewer` (Zoom/Pan/Reset, tab Tiền xử lý, tab Bản đồ nhiệt Grad-CAM, biểu đồ xác suất 4 lớp và phiếu nhận định của Bác sĩ).
   - `/history`: Lịch sử phân tích có tìm kiếm, lọc theo nhãn/ngày và quản lý ca chụp.
   - `/ai-assistant`: Trợ lý AI Y tế kết hợp Vector RAG + tra cứu ca chụp trên D1, tự động phát hiện tình huống khẩn cấp (Cờ đỏ).
   - `/profile`: Quản lý hồ sơ, giao diện Sáng/Tối và bảo mật tài khoản.

2. **Vai trò `DOCTOR` (`demo.doctor@neuroscan.vn`):**
   - `/doctor/dashboard`: Tổng quan ca MRI và hồ sơ bệnh nhân.
   - `/doctor/patients`: Quản lý hồ sơ bệnh nhân và tạo/chỉnh sửa đánh giá chuyên môn trực tiếp.
   - `/doctor/vision-analysis`: Computer Vision Lab dành cho bác sĩ chạy phân tích ONNX + Grad-CAM.
   - `/doctor/cases` & `/doctor/cases/:id`: Danh sách ca và trạm đọc phim hội chẩn chuyên môn.
   - `/doctor/ai-assistant`: Trợ lý AI Bác sĩ chuyên khoa.
   - `/doctor/profile`: Hồ sơ chuyên môn Bác sĩ.

3. **Các trang công khai:**
   - `/`: Landing Page giới thiệu nền tảng.
   - `/knowledge`: Thư viện kiến thức y khoa theo các nhóm chủ đề đã kiểm duyệt nguồn.
   - `/model-overview`: Báo cáo thực nghiệm đánh giá mô hình ONNX (1.600 ảnh Testing) và định hướng nghiên cứu kiến trúc Hybrid Multi-Backbone.
