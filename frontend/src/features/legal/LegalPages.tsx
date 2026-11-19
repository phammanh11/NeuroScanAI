import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, ArrowLeft, Lock, Database, AlertTriangle } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';

const LegalShell: React.FC<{
  badge: string;
  title: string;
  updatedAt: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ badge, title, updatedAt, icon, children }) => (
  <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
    <PublicHeader />
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay về Trang chủ
      </Link>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-card space-y-6">
        <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
            {icon}
            <span>{badge}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cập nhật lần cuối: {updatedAt} • Áp dụng cho nền tảng NeuroScan AI
          </p>
        </div>

        <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {children}
        </div>
      </div>
    </main>
  </div>
);

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <LegalShell
      badge="Bảo vệ Dữ liệu Sức khỏe (PHI / PII)"
      title="Chính sách Bảo mật Dữ liệu Y tế & Quyền riêng tư"
      updatedAt="19/11/2026"
      icon={<ShieldCheck className="w-4 h-4" />}
    >
      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          1. Nguyên tắc xử lý ảnh MRI trực tiếp trên trình duyệt (Client-Side Edge AI)
        </h2>
        <p>
          NeuroScan AI thực thi mô hình học sâu ONNX (<code>brain_mri_student.onnx</code>) trực tiếp
          bên trong trình duyệt của bạn thông qua WebAssembly (ONNX Runtime Web). Đối với người dùng
          trải nghiệm ở chế độ Khách (chưa đăng nhập), ảnh MRI và lịch sử trò chuyện chỉ tồn tại tạm
          thời trong bộ nhớ trình duyệt và <strong>không được gửi hay lưu trữ lên máy chủ</strong>.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          2. Lưu trữ, Ẩn danh hóa và Phân quyền Dữ liệu cho Tài khoản đã Đăng nhập
        </h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Mọi tên tệp MRI đều được tự động ẩn danh hóa trước khi tải lên Cloudflare R2. Tệp DICOM
            (<code>.dcm</code>) được giải mã cục bộ trên trình duyệt để tách riêng dữ liệu ảnh pixel,
            loại bỏ các thẻ định danh bệnh nhân trước khi lưu trữ.
          </li>
          <li>
            Ảnh MRI riêng tư được bảo vệ bằng cơ chế xác thực Cookie <code>HttpOnly</code> ký số
            HMAC-SHA256. Chỉ chủ sở hữu ca chụp và Bác sĩ/Quản trị viên được cấp phép mới có quyền
            truy xuất.
          </li>
          <li>
            Mật khẩu người dùng được băm bằng thuật toán <strong>PBKDF2-HMAC-SHA256</strong> với
            muối (salt) ngẫu nhiên riêng biệt cho từng tài khoản.
          </li>
          <li>
            Mọi thao tác nhạy cảm (đăng nhập, đổi mật khẩu, cấp tài khoản bác sĩ, xác nhận chẩn đoán,
            xóa hồ sơ) đều được ghi nhận vào Nhật ký Kiểm toán (<code>audit_logs</code>).
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          3. Quyền kiểm soát và Xóa dữ liệu của Người dùng
        </h2>
        <p>
          Bạn có toàn quyền xem lại, chủ động chọn có chia sẻ ca chụp cho Bác sĩ hay không, và xóa
          vĩnh viễn bất kỳ phiên phân tích MRI nào trong mục Lịch sử. Khi bạn xóa một phiên phân
          tích, hệ thống đồng thời xóa bản ghi dự đoán, siêu dữ liệu ca chụp trên Cloudflare D1 và
          tệp ảnh gốc trên Cloudflare R2.
        </p>
      </section>
    </LegalShell>
  );
};

export const TermsOfServicePage: React.FC = () => {
  return (
    <LegalShell
      badge="Điều khoản & Miễn trừ Y khoa"
      title="Điều khoản Sử dụng & Giới hạn Trách nhiệm Y khoa"
      updatedAt="19/11/2026"
      icon={<FileText className="w-4 h-4" />}
    >
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
          <strong>Tuyên bố miễn trừ quan trọng:</strong> NeuroScan AI là hệ thống phần mềm hỗ trợ
          phân loại hình ảnh MRI tham khảo và tra cứu kiến thức y khoa. Kết quả từ AI và Trợ lý
          Chatbot <strong>KHÔNG phải là chẩn đoán y khoa chính thức</strong> và không thay thế ý
          kiến, thăm khám trực tiếp của Bác sĩ chuyên khoa Chẩn đoán hình ảnh hoặc Ngoại Thần kinh.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          1. Phạm vi sử dụng hợp lệ
        </h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Người dùng cam kết không tải lên hình ảnh chứa thông tin định danh nhạy cảm (họ tên thật,
            số CCCD, mã bảo hiểm in trên viền ảnh) khi chưa ẩn danh.
          </li>
          <li>
            Không sử dụng kết quả xác suất AI để tự ý kê đơn, thay đổi phác đồ điều trị hoặc trì
            hoãn việc thăm khám y tế.
          </li>
          <li>
            Trong trường hợp có dấu hiệu cấp cứu thần kinh (đau đầu sét đánh, co giật, yếu liệt nửa
            người, rối loạn ý thức), người dùng phải gọi ngay cấp cứu <strong>115</strong> hoặc đến
            cơ sở y tế gần nhất.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          2. Quy định phân quyền Tài khoản (RBAC)
        </h2>
        <p>
          Tính năng đăng ký công khai chỉ cấp vai trò <strong>Người dùng (USER)</strong>. Tài khoản
          <strong> Bác sĩ chuyên khoa (DOCTOR)</strong> chỉ được cấp phát và xác minh Chứng chỉ Hành
          nghề (CCHN) bởi Quản trị viên Hệ thống thông qua Cổng Quản trị. Mọi hành vi cố tình gian
          lận danh tính hoặc truy cập trái phép sẽ bị khóa tài khoản vĩnh viễn.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          3. Giới hạn kỹ thuật của mô hình AI
        </h2>
        <p>
          Mô hình học sâu được huấn luyện phân loại 4 nhóm tổn thương tham chiếu (Glioma, Meningioma,
          Pituitary, No Tumor) trên lát cắt MRI sọ não 2D. Mô hình không thay thế đánh giá chuỗi
          xung đa mặt phẳng (T1W, T2W, FLAIR, T1-Gd, DWI) hay giải phẫu bệnh mô học.
        </p>
      </section>
    </LegalShell>
  );
};
