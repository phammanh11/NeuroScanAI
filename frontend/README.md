# NeuroScan AI — Frontend Application

Nền tảng giao diện người dùng (Frontend) cho **NeuroScan AI** — Hệ thống hỗ trợ phân loại ảnh MRI não (4 lớp: `Glioma`, `Meningioma`, `Pituitary`, `No Tumor`), kết nối Bác sĩ xem xét chuyên môn theo phân quyền **RBAC (`USER` / `DOCTOR`)** và **Trợ lý AI Y tế** tra cứu kiến thức có kiểm duyệt.

---

## 1. Công nghệ sử dụng (Tech Stack)

- **Core:** React 18 + Vite 6 + TypeScript (Strict Mode)
- **Styling & Design System:** Tailwind CSS + Custom Medical SaaS Tokens (Light/Dark Mode)
- **Icons:** Lucide React
- **Routing & RBAC:** React Router v6 (`ProtectedRoute` phân quyền `USER` và `DOCTOR`, Lazy Loading)
- **Biểu đồ:** Recharts (Phân bố 4 lớp Softmax, thống kê phiên, lịch sử sử dụng Demo)
- **Form & Validation:** React Hook Form + Zod
- **State & HTTP:** TanStack Query + Axios + In-Memory Mock Store Adapter

---

## 2. Hướng dẫn cài đặt và chạy ứng dụng

```bash
cd d:\MRI\frontend

# 1. Cài đặt dependencies
npm install

# 2. Chạy môi trường phát triển (Development Server)
npm run dev

# 3. Kiểm tra ESLint
npm run lint

# 4. Build bản Production
npm run build
```

---

## 3. Cấu hình biến môi trường (`.env.example`)

Tạo file `.env` từ `.env.example`:

```env
# URL của Backend FastAPI khi tích hợp thực tế
VITE_API_BASE_URL=http://localhost:8000/api/v1

# Bật chế độ Mock để chạy toàn bộ demo mà không cần Backend
VITE_MOCK_MODE=true

# Độ trễ mô phỏng mạng trong chế độ Mock (ms)
VITE_MOCK_LATENCY_MS=650
```

- Khi `VITE_MOCK_MODE=true`: Toàn bộ ứng dụng hoạt động độc lập bằng dữ liệu giả lập trong bộ nhớ phiên (`src/services/mock/mockStore.ts`). Tuyệt đối không gửi dữ liệu người dùng ra ngoài và không lưu ảnh MRI hay dữ liệu sức khỏe nhạy cảm vào `localStorage`.
- Khi `VITE_MOCK_MODE=false`: Lớp adapter (`src/services/api/neuroscanAdapter.ts`) tự động chuyển sang gọi HTTP REST API tới `VITE_API_BASE_URL` thông qua Axios (`src/services/api/httpClient.ts`) mà không cần sửa lại bất kỳ component giao diện nào.

---

## 4. Phân quyền RBAC (`USER` & `DOCTOR`) và Tài khoản Giả lập

Trong chế độ Mock Demo, bạn có thể chuyển đổi tức thì giữa hai vai trò bằng nút **"Đổi vai trò Demo"** trên thanh Header hoặc tại trang `/login`:

1. **Vai trò `USER` (`demo.user@neuroscan.vn`):**
   - `/dashboard`: Tổng quan cá nhân, biểu đồ phân bố 4 nhãn Demo, bảng phiên gần đây.
   - `/mri-analysis`: Tải ảnh MRI (PNG/JPG/JPEG) hoặc nạp nhanh 4 mẫu tổng hợp (Synthetic Demo), chọn bộ kết quả cố định (Mock Fixture), xem stepper mô phỏng UI.
   - `/mri-results/:id`: Trình xem ảnh y tế `MRIViewer` (Zoom/Pan/Reset, tab So sánh Tiền xử lý ROI/CLAHE khi có dữ liệu, tab Grad-CAM placeholder trung thực), biểu đồ xác suất 4 lớp, tải báo cáo minh họa và **gửi yêu cầu Bác sĩ xem xét** kèm xác nhận đồng ý chia sẻ dữ liệu.
   - `/history`: Lịch sử phân tích có tìm kiếm, lọc theo nhãn/ngày, ẩn/hiện thumbnail và xóa có xác nhận.
   - `/ai-assistant`: Trợ lý AI Y tế trả lời từ bộ FAQ JSON đã kiểm duyệt nguồn (WHO, NCI, NHS), tự động phát hiện từ khóa cấp cứu để hướng dẫn gọi 115.
   - `/profile` & `/settings`: Quản lý hồ sơ, giao diện Sáng/Tối, quyền riêng tư và xóa toàn bộ lịch sử.

2. **Vai trò `DOCTOR` (`demo.doctor@neuroscan.vn`):**
   - `/doctor/dashboard`: Tổng quan các ca MRI được phân công theo 4 trạng thái (`Chờ xem xét`, `Đang xem xét`, `Đã xem xét`, `Cần bổ sung thông tin`).
   - `/doctor/cases`: Danh sách các ca MRI đã có sự đồng ý chia sẻ từ người bệnh.
   - `/doctor/cases/:id`: Trạm đọc phim dành cho Bác sĩ — xem `MRIViewer`, đối chiếu kết quả AI, đánh giá mức độ phù hợp của AI và lưu **Phiếu nhận xét chuyên môn** độc lập với kết quả AI.
   - `/doctor/reviews`: Tổng hợp các đánh giá kết quả AI.
   - `/doctor/history`: Lịch sử các ca đã hoàn tất xử lý.
   - `/doctor/profile`: Hồ sơ chuyên môn Bác sĩ.

3. **Các trang dùng chung:**
   - `/`: Landing Page giới thiệu nền tảng.
   - `/knowledge`: Thư viện kiến thức y khoa theo 7 nhóm chủ đề (chỉ xuất bản các bài có `reviewStatus = 'verified'`).
   - `/model-overview`: Trang tổng quan định hướng nghiên cứu mô hình (`ConvNeXt`, `Swin Transformer V2`, `EfficientNetV2`, tiền xử lý `Brain ROI Cropping` + `CLAHE` và cấu trúc Confusion Matrix minh họa).
