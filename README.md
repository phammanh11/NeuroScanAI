# NeuroScan AI — Hệ thống Phân loại U não từ Ảnh MRI & Trợ lý AI Y tế (Vector RAG)

Nền tảng hỗ trợ đọc hiểu hình ảnh học Cộng hưởng từ (MRI) sọ não 4 phân lớp theo tiêu chuẩn **WHO CNS5 (2021)** (`Glioma`, `Meningioma`, `Pituitary`, `No Tumor`), kết nối luồng hội chẩn chuyên môn giữa **Bác sĩ Chuyên khoa (`DOCTOR`)** và **Người bệnh (`USER`)**, tích hợp **Trợ lý AI Y tế Vector RAG** vận hành trên hạ tầng **Cloudflare Edge & ONNX Runtime Web**.

---

## 1. Kiến trúc Tổng thể & Mối liên hệ giữa 3 Thư mục trong Dự án

```text
d:\MRI\
├── frontend/          # Giao diện Web (React 18 + TypeScript + Vite + Tailwind CSS + ONNX Runtime Web)
├── backend/           # Backend duy nhất (Cloudflare Workers + Hono + D1 + R2 + Vectorize + Workers AI)
├── ai_engine/         # Pipeline huấn luyện Deep Learning (PyTorch), Grad-CAM, đánh giá & xuất model .onnx
└── wrangler.jsonc     # Cấu hình triển khai Cloudflare Pages, D1 Database, R2 Bucket, Vectorize & Workers AI
```

```mermaid
flowchart LR
    subgraph Training["1. ai_engine/ (Python Deep Learning - Offline)"]
        A1["train.py (PyTorch + Grad-CAM)"] --> A2["export_onnx.py / evaluate.py"]
        A2 --> A3["brain_mri_student.onnx"]
    end

    subgraph WebClient["2. frontend/ (React + TypeScript)"]
        B1["Giao diện Bác sĩ (DOCTOR) & Người bệnh (USER)"]
        B2["ONNX Runtime Web (Suy luận trực tiếp + Canvas Heatmap)"]
        B3["Trợ lý AI Y tế tích hợp (/user/ai-assistant & /doctor/ai-assistant)"]
    end

    subgraph EdgeBackend["3. backend/ (Cloudflare Workers Production & Vite Dev)"]
        C1["Hono REST API (/api/*) -> dist/_worker.js"]
        C2["Cloudflare D1 (10 bảng chuẩn hóa) & R2 Storage"]
        C3["RAG Vector DB (@cf/baai/bge-m3 + Llama-3.3-70B)"]
    end

    A3 --> B2
    B1 <--> C1
    C1 <--> C2
    C1 <--> C3
```

### Chi tiết vai trò từng module:
1. **`frontend/` (Giao diện & Suy luận Edge Client):**
   - Chứa toàn bộ giao diện phân quyền RBAC (`DOCTOR` / `USER`), Trạm đọc ảnh MRI đa chế độ (`MRIViewer`), Computer Vision Lab, Quản lý hồ sơ bệnh nhân và Trợ lý AI Y tế.
   - Chứa mô hình [`frontend/public/models/brain_mri_student.onnx`](file:///d:/MRI/frontend/public/models/brain_mri_student.onnx) và 4 ảnh chụp MRI kèm bản đồ nhiệt mẫu tại [`frontend/public/sample_scans/`](file:///d:/MRI/frontend/public/sample_scans/).
   - Khi chạy `npm run dev`, [`frontend/vite.config.ts`](file:///d:/MRI/frontend/vite.config.ts) tự động nạp trực tiếp `backend/src/index.ts` qua Hono dev middleware.
   - Khi chạy `npm run build`, script [`frontend/scripts/build-worker.mjs`](file:///d:/MRI/frontend/scripts/build-worker.mjs) tự động đóng gói **`backend/src/index.ts`** thành `frontend/dist/_worker.js` để triển khai đồng nhất cả Frontend + Backend API lên Cloudflare Pages (`https://neuroscan.pages.dev`).
2. **`backend/` (Backend duy nhất trên Cloudflare Workers):**
   - Xây dựng bằng **Hono + TypeScript**, kết nối trực tiếp với **Cloudflare D1** (10 bảng quan hệ: `users`, `patients`, `doctors`, `mri_scans`, `predictions`, `doctor_reviews`, `chat_sessions`, `chat_messages`, `faq_documents`, `rag_chunks`), **Cloudflare R2**, **Cloudflare Vectorize** và **Workers AI** (`@cf/baai/bge-m3` 1024-dim embeddings + `@cf/meta/llama-3.3-70b-instruct-fp8-fast`).
3. **`ai_engine/` (Huấn luyện Mô hình, Grad-CAM & Đánh giá Offline):**
   - Chứa mã nguồn huấn luyện mạng nơ-ron (`model.py`, `train.py`), engine **Grad-CAM** (`gradcam.py`), script kiểm thử độc lập (`infer_python.py --gradcam`), đo chỉ số thực nghiệm trên 1.600 ảnh Testing (`evaluate.py` $\to$ `eval_report.json`) và xuất sang chuẩn ONNX (`export_onnx.py`).

---

## 2. Tài khoản Kiểm thử Mặc định (RBAC)

| Vai trò | Họ và tên | Email | Mật khẩu | Đường dẫn chính |
| :--- | :--- | :--- | :--- | :--- |
| **Bác sĩ (`DOCTOR`)** | BS.CKII Trần Quốc Bảo | `demo.doctor@neuroscan.vn` | `Doctor@123` | `/doctor/dashboard` |
| **Người bệnh (`USER`)** | Nguyễn Minh An | `demo.user@neuroscan.vn` | `User@123` | `/dashboard` |
| **Quản trị (`ADMIN`)** | Quản trị viên Hệ thống | `admin@neuroscan.vn` | `Admin@123` | `/doctor/dashboard` |

---

## 3. Hướng dẫn Khởi chạy & Xây dựng Dự án

### Chạy môi trường phát triển (Frontend + Hono Backend API tích hợp):
```bash
cd frontend
npm install
npm run dev
```

### Build bản Production (Frontend + Cloudflare Worker `_worker.js`):
```bash
cd frontend
npm run build
```

### Deploy lên Cloudflare Pages:
```bash
cd frontend
npx wrangler pages deploy dist --project-name neuroscan
```
