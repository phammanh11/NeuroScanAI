import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  ScanLine,
  MessageSquareHeart,
  ArrowRight,
  Plus,
  Minus,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { MedicalDisclaimer } from '@/components/medical/MedicalDisclaimer';
import { TUMOR_LABEL_METADATA } from '@/constants/medicalLabels';
import { SYNTHETIC_MRI_SLICES } from '@/assets/mriIllustrations';
import type { TumorLabel } from '@/types/domain';

const LANDING_FAQS = [
  {
    q: 'Kết quả phân loại của NeuroScan AI có thay thế chẩn đoán của bác sĩ không?',
    a: 'Không. NeuroScan AI là công cụ hỗ trợ phân loại hình ảnh tham khảo theo 4 nhóm tổn thương (Glioma, Meningioma, Pituitary, No Tumor) và hỗ trợ tra cứu kiến thức y khoa. Quyết định chẩn đoán và điều trị bắt buộc phải do bác sĩ chuyên khoa Chẩn đoán hình ảnh hoặc Ngoại Thần kinh kết luận.',
  },
  {
    q: 'Ảnh MRI tải lên có bị lưu trữ hoặc lộ thông tin cá nhân không?',
    a: 'Mô hình ONNX chạy trực tiếp trên trình duyệt của bạn qua WebAssembly. Ở chế độ Khách, ảnh MRI chỉ nằm tạm trong bộ nhớ trình duyệt và không gửi lên máy chủ. Với tài khoản đã đăng nhập, tên file được tự động ẩn danh, tệp DICOM được tách bỏ thẻ định danh bệnh nhân trước khi lưu và bảo vệ bằng phân quyền RBAC.',
  },
  {
    q: 'Bản đồ nhiệt Grad-CAM và 2-View TTA giúp ích gì khi đọc phim?',
    a: 'Bản đồ nhiệt CAM trích xuất trực tiếp từ tầng tích chập cuối của mạng nơ-ron giúp làm nổi bật vùng hình ảnh có trọng số cao nhất đối với dự đoán. Kỹ thuật 2-View TTA đối chiếu đồng thời ảnh gốc và ảnh lật ngang hai bán cầu não để tăng tính ổn định của xác suất Softmax.',
  },
  {
    q: 'Quy trình gửi bác sĩ xem xét (Doctor Review) hoạt động như thế nào?',
    a: 'Người dùng đã đăng nhập có thể chủ động chọn chia sẻ phiên phân tích kèm ghi chú triệu chứng để bác sĩ chuyên khoa trên hệ thống xem phim MRI, đối chiếu bản đồ nhiệt CAM và để lại nhận định lâm sàng độc lập.',
  },
];

const CLINICAL_CAPABILITIES = [
  {
    index: '01',
    title: 'Phân loại 4 nhóm tổn thương & Real CNN CAM',
    body: 'Chạy suy luận trực tiếp trên trình duyệt bằng mô hình ONNX dual-output với 2-View TTA, hỗ trợ ảnh PNG/JPG lẫn tệp y khoa DICOM (.dcm) và xuất báo cáo A4 PDF.',
  },
  {
    index: '02',
    title: 'Trợ lý tra cứu y khoa RAG có dẫn nguồn',
    body: 'Tìm kiếm ngữ nghĩa trên 198 tài liệu chuẩn hóa từ WHO CNS5, ACR và NCI; tích hợp bộ lọc cảnh báo cờ đỏ cấp cứu thần kinh (115) theo thời gian thực.',
  },
  {
    index: '03',
    title: 'Luồng phối hợp Bác sĩ & Kiểm toán RBAC',
    body: 'Tách biệt chặt chẽ vai trò Người dùng, Bác sĩ chuyên khoa (xác minh CCHN) và Quản trị viên bệnh viện; mọi thao tác nhạy cảm đều được ghi nhật ký kiểm toán.',
  },
];

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [previewClass, setPreviewClass] = useState<TumorLabel>('Glioma');

  const isDoctorOrAdmin =
    user?.role === 'DOCTOR' ||
    user?.role === 'doctor' ||
    user?.role === 'ADMIN' ||
    user?.role === 'admin';
  const mriEntryPath = isDoctorOrAdmin ? '/doctor/vision-analysis' : '/mri-analysis';
  const aiEntryPath = isDoctorOrAdmin ? '/doctor/ai-assistant' : '/ai-assistant';

  const activeMeta = TUMOR_LABEL_METADATA[previewClass];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <PublicHeader />

      {/* HERO SECTION — Clinical Editorial Layout */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Editorial Copy */}
            <div className="lg:col-span-6 space-y-7">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700 dark:text-teal-400">
                Neuroradiology Decision Support • WHO CNS5
              </p>

              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-[-0.025em] text-slate-900 dark:text-white leading-[1.15]">
                Phân tích lát cắt MRI sọ não chính xác, minh bạch và bảo mật.
              </h1>

              <p className="text-[15px] sm:text-base text-slate-600 dark:text-slate-400 leading-[1.7] max-w-xl">
                Hỗ trợ phân loại 4 nhóm tham chiếu (Glioma, Meningioma, Pituitary, No Tumor) trực
                tiếp trên trình duyệt, kết hợp bản đồ nhiệt CNN CAM, trợ lý tra cứu y khoa RAG và
                cổng hội chẩn bác sĩ chuyên khoa.
              </p>

              {/* Flat Utilitarian CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <Link
                  to={mriEntryPath}
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-lg text-sm font-medium bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white transition-colors"
                >
                  <ScanLine className="w-4 h-4" />
                  <span>Phân tích ảnh MRI</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to={aiEntryPath}
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition-colors"
                >
                  <MessageSquareHeart className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  <span>Tra cứu Trợ lý Y khoa</span>
                </Link>
              </div>

              {/* Subtle Account Portal Line */}
              <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-800">
                {user ? (
                  <Link
                    to={isDoctorOrAdmin ? '/doctor/dashboard' : '/dashboard'}
                    className="inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-400 font-medium pt-3"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    Vào Bảng điều khiển ({user.fullName})
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 pt-3">
                    <Link
                      to="/login"
                      className="text-slate-800 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-400 font-medium"
                    >
                      Đăng nhập tài khoản →
                    </Link>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <Link
                      to="/register"
                      className="hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      Đăng ký người dùng mới
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Right Clinical PACS Workstation Preview */}
            <div className="lg:col-span-6">
              <div className="rounded-xl border border-slate-800 bg-[#0b0d10] text-slate-100 overflow-hidden">
                {/* Minimalist PACS Top Bar */}
                <div className="px-4 py-2.5 border-b border-slate-800/90 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    <span className="text-slate-200">PACS VIEWER • T1-GD / AXIAL</span>
                  </div>
                  <span>256×256 ONNX CAM</span>
                </div>

                {/* MRI Frame */}
                <div className="p-5 sm:p-6 space-y-5">
                  <div className="relative rounded-lg bg-[#050608] border border-slate-800/80 h-64 sm:h-72 flex items-center justify-center overflow-hidden">
                    <img
                      src={SYNTHETIC_MRI_SLICES[previewClass]}
                      alt={`Lát cắt MRI tham chiếu nhóm ${previewClass}`}
                      className="h-full w-full object-contain p-3"
                    />
                    <div className="absolute top-3 left-3 text-[10px] font-mono text-slate-400 space-y-0.5 pointer-events-none">
                      <div>CLASS: {previewClass.toUpperCase()}</div>
                      <div>MODE: 2-VIEW TTA</div>
                    </div>
                    <div className="absolute bottom-3 right-3 text-[10px] font-mono text-teal-400 pointer-events-none">
                      CLIENT-SIDE WASM
                    </div>
                  </div>

                  {/* 4 Class Selector Tabs (Crisp Flat Grid) */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['Glioma', 'Meningioma', 'Pituitary', 'No Tumor'] as TumorLabel[]).map(
                      (cls) => {
                        const active = previewClass === cls;
                        return (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => setPreviewClass(cls)}
                            className={`px-2 py-2 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                              active
                                ? 'bg-teal-600 text-white font-semibold'
                                : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800'
                            }`}
                          >
                            {cls}
                          </button>
                        );
                      },
                    )}
                  </div>

                  {/* Clinical Summary Line */}
                  <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-xs">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-100">{activeMeta.vietnameseTitle}</p>
                      <p className="text-slate-400 leading-relaxed line-clamp-2">
                        {activeMeta.overview}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FLAT METRICS STRIP (Architectural Dividers, Zero Card Nesting) */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
            <div className="py-6 sm:px-6 first:pl-0">
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                4 lớp
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Glioma, Meningioma, Pituitary, No Tumor
              </p>
            </div>
            <div className="py-6 sm:px-6">
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                DICOM + CAM
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Giải mã .dcm cục bộ & bản đồ nhiệt thật
              </p>
            </div>
            <div className="py-6 sm:px-6">
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                198 tài liệu
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tri thức RAG chuẩn WHO CNS5 / ACR / NCI
              </p>
            </div>
            <div className="py-6 sm:px-6">
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                3 vai trò RBAC
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Người dùng, Bác sĩ CCHN & Quản trị viên
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES — Editorial 3-Column Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-10 w-full">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs uppercase tracking-[0.12em] text-teal-700 dark:text-teal-400 font-semibold">
            Kiến trúc Lâm sàng
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Thiết kế cho độ tin cậy và tốc độ đọc phim thực tế
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-slate-200 dark:border-slate-800 pt-8">
          {CLINICAL_CAPABILITIES.map((item) => (
            <div key={item.index} className="space-y-3">
              <span className="font-mono text-xs font-semibold text-teal-700 dark:text-teal-400">
                {item.index}
              </span>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {item.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        <MedicalDisclaimer compact />
      </section>

      {/* FAQ — Clean Border-Bottom Editorial Accordion */}
      <section className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-8">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.12em] text-teal-700 dark:text-teal-400 font-semibold">
              Câu hỏi thường gặp
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Minh bạch về giới hạn kỹ thuật và quyền riêng tư
            </h2>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
            {LANDING_FAQS.map((item, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div key={idx} className="py-5">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full text-left flex items-center justify-between gap-4 font-medium text-sm sm:text-[15px] text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <Minus className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                    ) : (
                      <Plus className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed pr-8">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* MINIMALIST FOOTER */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white">
              <Brain className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              <span>NeuroScan Clinical AI</span>
            </div>
            <p className="leading-relaxed">
              Công cụ hỗ trợ phân loại hình ảnh MRI sọ não và tra cứu kiến thức y khoa. Kết quả AI
              chỉ mang tính tham khảo và không thay thế chẩn đoán lâm sàng của bác sĩ chuyên khoa.
            </p>
          </div>
          <div className="flex flex-wrap gap-5 font-medium">
            <Link to="/mri-analysis" className="hover:text-slate-900 dark:hover:text-white">
              Phân tích MRI
            </Link>
            <Link to="/ai-assistant" className="hover:text-slate-900 dark:hover:text-white">
              Trợ lý AI
            </Link>
            <Link to="/knowledge" className="hover:text-slate-900 dark:hover:text-white">
              Kiến thức y khoa
            </Link>
            <Link to="/privacy-policy" className="hover:text-slate-900 dark:hover:text-white">
              Chính sách bảo mật
            </Link>
            <Link to="/terms-of-service" className="hover:text-slate-900 dark:hover:text-white">
              Điều khoản sử dụng
            </Link>
            <Link to="/login" className="hover:text-slate-900 dark:hover:text-white">
              Đăng nhập
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
