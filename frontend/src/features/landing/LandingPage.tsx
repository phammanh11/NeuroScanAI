import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  ScanLine,
  MessageSquareHeart,
  BookOpen,
  History,
  UploadCloud,
  Cpu,
  FileCheck2,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  Stethoscope,
  Layers,
  Database,
} from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { MedicalDisclaimer } from '@/components/medical/MedicalDisclaimer';
import { TUMOR_LABEL_METADATA } from '@/constants/medicalLabels';
import { SYNTHETIC_MRI_SLICES } from '@/assets/mriIllustrations';
import type { TumorLabel } from '@/types/domain';

const LANDING_FAQS = [
  {
    q: 'Kết quả phân loại ảnh MRI của NeuroScan AI có thay thế bác sĩ chẩn đoán hình ảnh không?',
    a: 'Tuyệt đối không. Hệ thống chỉ hỗ trợ phân loại sơ bộ 1 lát cắt MRI vào 4 nhóm nhãn tham chiếu (Glioma, Meningioma, Pituitary, No Tumor) phục vụ mục đích học tập, nghiên cứu và tra cứu thông tin. Chẩn đoán xác định bắt buộc phải do bác sĩ chuyên khoa thực hiện trên toàn bộ chuỗi xung DICOM và thăm khám lâm sàng.',
  },
  {
    q: 'Tại sao hệ thống chỉ nhận ảnh PNG, JPG, JPEG trong phiên bản hiện tại?',
    a: 'Trong giai đoạn đầu, ứng dụng tập trung vào phân loại lát cắt 2D tiêu chuẩn (PNG/JPG/JPEG). Định dạng y tế chuyên dụng DICOM (.dcm) đa lát cắt yêu cầu bộ phân tích DICOM Parser và kết nối máy chủ PACS ở tầng Backend FastAPI.',
  },
  {
    q: 'Trợ lý AI Y tế lấy dữ liệu từ đâu để trả lời người dùng?',
    a: 'Trợ lý AI được thiết kế theo kiến trúc kết hợp bộ câu hỏi thường gặp (FAQ JSON đã kiểm duyệt) và truy xuất tài liệu y khoa có nguồn xác minh (RAG từ WHO, NCI, NHS). Trong chế độ Demo, chatbot chỉ phản hồi từ các bản ghi FAQ đã chuẩn bị sẵn và không tự suy diễn ngoài phạm vi.',
  },
  {
    q: 'Quy trình gửi yêu cầu Bác sĩ xem xét (Doctor Review) hoạt động như thế nào?',
    a: 'Sau khi nhận kết quả tham khảo từ AI, người dùng có thể chủ động tích chọn đồng ý chia sẻ dữ liệu phiên phân tích cho Bác sĩ trên hệ thống. Bác sĩ (vai trò DOCTOR) sẽ xem lát cắt MRI, đối chiếu kết quả AI và để lại ghi chú chuyên môn độc lập.',
  },
];

export const LandingPage: React.FC = () => {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [previewClass, setPreviewClass] = useState<TumorLabel>('Glioma');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <PublicHeader />

      {/* HERO SECTION */}
      <section className="relative overflow-hidden py-12 sm:py-20 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/25">
                <ShieldCheck className="w-4 h-4" />
                <span>Nền tảng Hỗ trợ Phân loại MRI & Tra cứu Y khoa Có Kiểm duyệt</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                Phân tích ảnh MRI não với sự hỗ trợ của{' '}
                <span className="text-teal-600 dark:text-teal-400">trí tuệ nhân tạo</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                NeuroScan AI hỗ trợ phân loại lát cắt MRI sọ não theo 4 nhóm tham chiếu (
                <strong>Glioma</strong>, <strong>Meningioma</strong>, <strong>Pituitary</strong>,{' '}
                <strong>No Tumor</strong>), kết hợp trợ lý tra cứu kiến thức y khoa có dẫn nguồn và
                quy trình bác sĩ xem xét chuyên môn. Hệ thống chỉ hỗ trợ phân loại và tra cứu y
                khoa, <strong>không thay thế chẩn đoán chuyên môn</strong>.
              </p>

              {/* Two Primary CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
                <Link
                  to="/mri-analysis"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm sm:text-base font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white shadow-soft transition-all"
                >
                  <ScanLine className="w-5 h-5" />
                  <span>Bắt đầu phân tích MRI</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/ai-assistant"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm sm:text-base font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition-colors"
                >
                  <MessageSquareHeart className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <span>Khám phá trợ lý AI</span>
                </Link>
              </div>

              {/* Quick RBAC Demo Entry Links */}
              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Trải nghiệm phân quyền RBAC:
                </span>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline font-medium"
                >
                  Giao diện Người dùng (USER)
                </Link>
                <span>•</span>
                <Link
                  to="/doctor/dashboard"
                  className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline font-medium"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  Giao diện Bác sĩ (DOCTOR)
                </Link>
              </div>
            </div>

            {/* Right Interactive Visual Illustration */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
                      MINH HỌA TRỰC QUAN 4 NHÃN THAM CHIẾU
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    SYNTHETIC ILLUSTRATION
                  </span>
                </div>

                {/* Class Switcher Pills */}
                <div className="grid grid-cols-4 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  {(['Glioma', 'Meningioma', 'Pituitary', 'No Tumor'] as TumorLabel[]).map(
                    (lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setPreviewClass(lbl)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors ${
                          previewClass === lbl
                            ? 'bg-teal-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {lbl}
                      </button>
                    ),
                  )}
                </div>

                <div className="relative flex items-center justify-center bg-[#060911] rounded-2xl p-3 border border-slate-800/80">
                  <img
                    src={SYNTHETIC_MRI_SLICES[previewClass]}
                    alt={`Minh họa lát cắt ${previewClass}`}
                    className="h-60 w-60 object-contain rounded-xl"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-300">
                      {TUMOR_LABEL_METADATA[previewClass].vietnameseTitle}
                    </span>
                    <span className="text-[11px] text-slate-400">Minh họa học thuật</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {TUMOR_LABEL_METADATA[previewClass].anatomicalLocation}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <MedicalDisclaimer />
          </div>
        </div>
      </section>

      {/* 3-STEP WORKFLOW SECTION */}
      <section className="py-14 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            Quy trình hoạt động chuẩn hóa
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Quy trình 3 bước hỗ trợ phân tích & tra cứu
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Thiết kế minh bạch, tôn trọng quyền riêng tư dữ liệu và phân tách rõ kết quả tự động
            của AI với nhận định của bác sĩ.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: 'Bước 01',
              title: 'Tải ảnh lát cắt MRI',
              desc: 'Kiểm tra định dạng (PNG, JPG, JPEG), dung lượng an toàn, ẩn danh tên file và xác nhận đồng ý xử lý dữ liệu.',
              icon: <UploadCloud className="w-6 h-6 text-teal-600 dark:text-teal-400" />,
            },
            {
              step: 'Bước 02',
              title: 'AI tiền xử lý & phân loại 4 lớp',
              desc: 'Thực hiện pipeline chuẩn hóa ảnh và dự đoán phân bố xác suất trên 4 nhóm: Glioma, Meningioma, Pituitary, No Tumor.',
              icon: <Cpu className="w-6 h-6 text-sky-600 dark:text-sky-400" />,
            },
            {
              step: 'Bước 03',
              title: 'Xem kết quả tham khảo & Hỏi Bác sĩ',
              desc: 'Đọc giải thích thuật ngữ dễ hiểu, tra cứu Trợ lý AI có nguồn kiểm duyệt hoặc gửi yêu cầu Bác sĩ chuyên khoa xem xét.',
              icon: <FileCheck2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  {item.icon}
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">{item.step}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {item.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURE CARDS */}
      <section className="py-14 bg-white dark:bg-slate-900/60 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Hệ sinh thái tính năng
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Bốn trụ cột của nền tảng NeuroScan AI
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'MRI Classification',
                subtitle: 'Phân loại ảnh MRI 4 lớp',
                desc: 'Trình xem ảnh y tế chuyên dụng (Zoom/Pan), biểu đồ phân bố Softmax 4 lớp và giải thích giới hạn mô hình.',
                to: '/mri-analysis',
                icon: <ScanLine className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
              },
              {
                title: 'AI Medical Chatbot',
                subtitle: 'Trợ lý AI Y tế có kiểm duyệt',
                desc: 'Trả lời dựa trên dữ liệu FAQ/RAG có nguồn xác minh (WHO, NCI, NHS) và phát hiện tình huống khẩn cấp.',
                to: '/ai-assistant',
                icon: <MessageSquareHeart className="w-5 h-5 text-sky-600 dark:text-sky-400" />,
              },
              {
                title: 'Knowledge Base',
                subtitle: '7 nhóm kiến thức y khoa',
                desc: 'Thư viện tra cứu có bộ lọc chủ đề, trạng thái kiểm duyệt nội dung, ngày xác minh và nguồn chính thống.',
                to: '/knowledge',
                icon: <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
              },
              {
                title: 'Analysis History & RBAC',
                subtitle: 'Lịch sử & Bác sĩ xem xét',
                desc: 'Quản lý lịch sử phiên phân tích và quy trình chia sẻ ca bệnh có sự đồng ý giữa Người dùng và Bác sĩ.',
                to: '/history',
                icon: <History className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
              },
            ].map((feat) => (
              <Link
                key={feat.title}
                to={feat.to}
                className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 p-6 hover:border-teal-500/60 transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center">
                    {feat.icon}
                  </div>
                  <div>
                    <div className="text-xs font-mono text-teal-600 dark:text-teal-400 font-semibold">
                      {feat.title}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 group-hover:text-teal-600 dark:group-hover:text-teal-400">
                      {feat.subtitle}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400">
                  <span>Mở tính năng</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4 TUMOR CLASSES INTRODUCTION */}
      <section className="py-14 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="max-w-3xl space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            Phạm vi bộ dữ liệu MRI
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Bốn nhóm nhãn phân loại trong mô hình
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Hệ thống phân loại ảnh dựa trên 4 nhãn của tập dữ liệu tham chiếu{' '}
            <em>Brain Tumor MRI Dataset</em>. Nhãn dự đoán không tự xác nhận bản chất mô học hay
            thay thế sinh thiết giải phẫu bệnh.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['Glioma', 'Meningioma', 'Pituitary', 'No Tumor'] as TumorLabel[]).map((label) => {
            const info = TUMOR_LABEL_METADATA[label];
            return (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-bold border ${info.badgeColorClass}`}
                  >
                    {info.label}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Nhóm phân loại tham chiếu</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {info.vietnameseTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <strong>Vị trí giải phẫu:</strong> {info.anatomicalLocation}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {info.overview}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* AI ARCHITECTURE & PIPELINE SECTION */}
      <section className="py-14 bg-slate-900 text-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="max-w-3xl space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-teal-400">
              Kiến trúc Kỹ thuật & Định hướng Nghiên cứu
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Công nghệ xử lý ảnh MRI & Kiến trúc hệ thống mở rộng
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Thiết kế tách biệt tầng giao diện <strong>React + TypeScript</strong>, tầng điều phối{' '}
              <strong>FastAPI</strong>, cơ sở dữ liệu <strong>PostgreSQL / pgvector</strong> và dịch
              vụ <strong>PyTorch AI / RAG</strong>. Không đưa các con số độ chính xác chưa được kiểm
              chứng lâm sàng lên trang giới thiệu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                Tiền xử lý Brain ROI Cropping & CLAHE
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Định hướng sử dụng OpenCV cắt bỏ vùng nền đen thừa và ký tự nhiễu quanh hộp sọ, kết
                hợp chuẩn hóa tương phản cục bộ CLAHE và Z-score nhằm giảm sai lệch giữa các dòng
                máy chụp MRI (1.5T và 3.0T).
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                Định hướng Nghiên cứu Đa Kiến trúc (Ensemble)
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Tài liệu chiến lược đề xuất nghiên cứu kết hợp các họ mạng trích xuất đặc trưng bổ
                trợ nhau (như ConvNeXt, Swin Transformer V2 và EfficientNetV2) huấn luyện theo
                5-Fold Cross-Validation ở tầng AI Service.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                Kiến trúc Chatbot FAQ JSON + RAG
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Kết hợp kho câu hỏi chuẩn hóa JSON và truy xuất ngữ nghĩa pgvector. Mọi câu trả lời
                y khoa đều bắt buộc đính kèm metadata tổ chức phát hành, ngày xác minh và quy tắc
                chuyển hướng cấp cứu.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-14 sm:py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            Giải đáp thắc mắc
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Câu hỏi thường gặp về NeuroScan AI
          </h2>
        </div>

        <div className="space-y-3">
          {LANDING_FAQS.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                      isOpen ? 'rotate-180 text-teal-500' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
              <Brain className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>NeuroScan AI — Nền tảng Hỗ trợ Phân loại U não MRI & Trợ lý AI Y tế</span>
            </div>
            <p>
              Dự án nghiên cứu & phát triển ứng dụng Healthcare AI. Toàn bộ dữ liệu hiển thị trong
              chế độ Demo là dữ liệu giả lập minh họa, không chứa thông tin bệnh nhân thật.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 font-medium">
            <Link to="/mri-analysis" className="hover:text-teal-600 dark:hover:text-teal-400">
              Phân tích MRI
            </Link>
            <Link to="/ai-assistant" className="hover:text-teal-600 dark:hover:text-teal-400">
              Trợ lý AI
            </Link>
            <Link to="/knowledge" className="hover:text-teal-600 dark:hover:text-teal-400">
              Kiến thức y khoa
            </Link>
            <Link to="/login" className="hover:text-teal-600 dark:hover:text-teal-400">
              Đăng nhập (RBAC)
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
