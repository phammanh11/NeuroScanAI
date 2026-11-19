# NeuroScan AI — Hướng dẫn Go-Live & Vận hành Production trên Cloudflare Pages

Tài liệu này tổng hợp đầy đủ các lệnh cần thực thi khi đưa **NeuroScan AI** lên Internet chính thức trên **Cloudflare Pages** (`neuroscan.pages.dev` hoặc Custom Domain riêng).

---

## 1. Thiết lập Secret Bảo mật Bắt buộc trên Cloudflare Pages

Tuyệt đối không để trống `SESSION_SECRET` trên môi trường Production:

```powershell
# 1. Tạo chuỗi ngẫu nhiên 64 ký tự hex và lưu thành Secret
npx wrangler pages secret put SESSION_SECRET --project-name neuroscan

# 2. (Tùy chọn nhưng khuyến nghị) Bật gửi email thật cho Quên mật khẩu qua Resend
npx wrangler pages secret put RESEND_API_KEY --project-name neuroscan
npx wrangler pages secret put RESEND_FROM_EMAIL --project-name neuroscan

# 3. (Tùy chọn) Gắn Gemini API Key fallback cho Chatbot Y tế
npx wrangler pages secret put GEMINI_API_KEY --project-name neuroscan
```

---

## 2. Áp dụng Schema & Nạp 192 Tài liệu FAQ Y khoa lên Cloudflare D1

```powershell
# Chạy schema mới nhất (gồm users.is_active, user_sessions, audit_logs, password_reset_tokens, error_logs)
npx wrangler d1 execute neuroscan-db --remote --file=backend/migrations/0001_schema.sql

# Nạp 192 tài liệu FAQ Y khoa chuẩn hóa lên D1 Production
npx wrangler d1 execute neuroscan-db --remote --file=backend/seeds/seed_faq_192.sql
```

Sau khi deploy xong, đăng nhập tài khoản Quản trị (`admin@gmail.com` / `pass@123`), vào **Quản trị Hệ thống (`/admin`) → Tab Kho Kiến thức FAQ / RAG → bấm "Đồng bộ Vectorize RAG"** để lập chỉ mục vector cho toàn bộ 192 tài liệu.

---

## 3. Build & Deploy bản Production

```powershell
cd frontend
npm run lint
npm run build
npx wrangler pages deploy dist --project-name neuroscan
```

---

## 4. Gắn Tên miền Riêng (Custom Domain) & Bật Cloudflare WAF

1. Truy cập **Cloudflare Dashboard → Workers & Pages → `neuroscan` → Custom domains → Set up a custom domain** (ví dụ `neuroscan.vn` hoặc `app.neuroscan.vn`).
2. Nếu dùng domain riêng, bổ sung domain đó vào `ALLOWED_EXACT_ORIGINS` trong `backend/src/index.ts` và deploy lại.
3. Trong **Cloudflare Dashboard → Security**:
   - Bật **Bot Fight Mode** (chống bot quét tự động).
   - Bật **Managed WAF Rules** (OWASP Core Ruleset).
   - Thiết lập **SSL/TLS → Full (strict)** và bật **Always Use HTTPS**.

---

## 5. Nâng cấp Độ chính xác AI (Recall Glioma > 95%) trên GPU

Khi có GPU (Google Colab T4 hoặc Kaggle P100 miễn phí), chạy lệnh 1-click sau:

```bash
python ai_engine/colab_retrain_glioma.py \
  --data_dir /content/brain_tumor_mri_dataset \
  --epochs 20 \
  --glioma_weight 1.5 \
  --focal_gamma 1.0 \
  --output_onnx frontend/public/models/brain_mri_student.onnx
```

Sau đó copy file `brain_mri_student.onnx` mới vào `frontend/public/models/` và deploy lại. Hệ thống tự động sử dụng **2-View Horizontal-Flip TTA** và **Real CNN CAM** ngay lập tức.
