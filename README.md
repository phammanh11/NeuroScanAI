# Dự án NeuroScan AI — Phân loại U não từ Ảnh MRI & Trợ lý AI Y tế

Workspace được chia thành **2 thư mục chính** để trực quan hóa và dễ dàng tìm kiếm, phát triển:

```text
d:\MRI\
├── frontend/      # Ứng dụng Frontend hoàn chỉnh (React + Vite + TypeScript + Tailwind CSS)
└── backend/       # Tài liệu Kiến trúc & Hợp đồng API FastAPI (Chờ triển khai ở giai đoạn Backend)
```

---

## 1. Khởi chạy nhanh Frontend (`d:\MRI\frontend`)

```bash
cd d:\MRI\frontend
npm install
npm run dev
```

Mở trình duyệt tại địa chỉ hiển thị trên terminal (mặc định `http://localhost:5173`).

---

## 2. Điểm nổi bật về An toàn Y tế & Minh bạch Học thuật

- **Không tự tạo kết quả lâm sàng ngẫu nhiên:** Trong chế độ Mock (`VITE_MOCK_MODE=true`), hệ thống sử dụng các bộ kết quả cố định (`DEMO_UPLOAD_FIXTURE_PRESETS`) có nhãn **"Kết quả minh họa"**, tuyệt đối không dùng `Math.random()` hay suy đoán từ tên file/màu ảnh.
- **Không làm giả bản đồ nhiệt Grad-CAM:** Tab Grad-CAM chỉ hiển thị khi dịch vụ AI trả về `gradcamUrl` thực sự; trong chế độ Demo hiển thị thông báo *"Tính năng đang phát triển — Chờ AI Service xuất Grad-CAM thực"*.
- **Trợ lý AI có kiểm duyệt & Quy tắc cấp cứu:** Chỉ trả lời dựa trên các bản ghi FAQ JSON đã xác minh nguồn (WHO, NCI, NHS); nếu câu hỏi nằm ngoài phạm vi sẽ thông báo rõ ràng; nếu phát hiện dấu hiệu cấp cứu thần kinh sẽ ưu tiên hướng dẫn gọi **115**.
- **Phân quyền RBAC (`USER` / `DOCTOR`):** Tách biệt hoàn toàn bố cục, menu, route và luồng xử lý giữa Người sử dụng và Bác sĩ chuyên khoa.
