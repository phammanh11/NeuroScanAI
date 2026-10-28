import React from 'react';
import {
  FlaskConical,
  Layers,
  Cpu,
  Grid,
  AlertCircle,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { MedicalDisclaimer } from '@/components/medical/MedicalDisclaimer';

const RESEARCH_ARCHITECTURES = [
  {
    name: 'ConvNeXt (Base / Large)',
    status: 'Định hướng nghiên cứu (Chưa triển khai)',
    role: 'Trích xuất đặc trưng cục bộ (Local Visual Features)',
    details:
      'Sử dụng các khối 7×7 Depthwise Convolution nhằm mô phỏng trường nhìn rộng nhưng giữ tính bất biến dịch chuyển của mạng CNN, định hướng phục vụ nhận diện rìa tổn thương trên lát cắt MRI.',
  },
  {
    name: 'Swin Transformer V2 / EVA-02',
    status: 'Định hướng nghiên cứu (Chưa triển khai)',
    role: 'Thu nhận ngữ cảnh diện rộng (Global Context)',
    details:
      'Dựa trên cơ chế Shifted Windows giúp khảo sát tương quan đối xứng giữa hai bán cầu não và hiệu ứng choán chỗ trên toàn bộ mặt cắt.',
  },
  {
    name: 'EfficientNetV2-L',
    status: 'Định hướng nghiên cứu (Chưa triển khai)',
    role: 'Biểu diễn đặc trưng đa tỷ lệ (Multi-scale Representation)',
    details:
      'Kết hợp Fused-MBConv và chiến lược Progressive Resizing (224×224 → 384×384) nhằm tối ưu hóa khả năng nhận diện các tổn thương có kích thước khác nhau.',
  },
];

const DEMO_CONFUSION_MATRIX = {
  labels: ['Glioma', 'Meningioma', 'Pituitary', 'No Tumor'],
  // Các giá trị minh họa cấu trúc bảng để hiển thị UI, có nhãn DEMO rõ ràng
  rows: [
    { actual: 'Glioma', values: [28, 3, 0, 1] },
    { actual: 'Meningioma', values: [2, 29, 1, 0] },
    { actual: 'Pituitary', values: [0, 1, 30, 1] },
    { actual: 'No Tumor', values: [0, 1, 0, 31] },
  ],
};

export const ModelOverviewPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Góc Nghiên cứu & Mô hình AI • Minh bạch Học thuật"
        title="Tổng quan Chiến lược Mô hình & Định hướng Nghiên cứu"
        description="Trình bày trung thực kiến trúc tiền xử lý, định hướng nghiên cứu Hybrid Multi-Backbone Ensemble và cấu trúc đánh giá mô hình theo Tài liệu Đặc tả Kỹ thuật."
      />

      {/* Academic Transparency Notice */}
      <div className="rounded-2xl border border-teal-500/30 bg-teal-50/70 dark:bg-teal-950/25 p-5 flex items-start gap-3 text-xs sm:text-sm text-teal-950 dark:text-teal-200">
        <AlertCircle className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <p className="font-bold">
            Nguyên tắc Minh bạch Học thuật (Academic & Clinical Integrity):
          </p>
          <p>
            Mục tiêu tối ưu hóa Accuracy / F1-Score trong tài liệu chiến lược là{' '}
            <strong>mục tiêu nghiên cứu kỳ vọng</strong>, tuyệt đối không được tuyên bố như kết quả
            đã xác minh khi chưa có báo cáo đánh giá thực nghiệm từ Backend PyTorch. Các kiến trúc{' '}
            <code>ConvNeXt</code>, <code>Swin Transformer V2</code> và{' '}
            <code>EfficientNetV2</code> dưới đây được trình bày đúng vai trò là{' '}
            <strong>định hướng nghiên cứu</strong>.
          </p>
        </div>
      </div>

      {/* Evaluation Metrics Placeholders (Only shown when real report is provided) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              1. Chỉ số Đánh giá Thực nghiệm (Accuracy, Precision, Recall, F1-Score)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chỉ hiển thị con số thực khi Backend cung cấp báo cáo đánh giá mô hình (Evaluation
              Report JSON) từ tập Test độc lập.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
            Chờ kết nối Báo cáo Thực nghiệm Backend
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {['Accuracy (Độ chính xác)', 'Macro Precision', 'Macro Recall', 'Macro F1-Score'].map(
            (metric) => (
              <div
                key={metric}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1.5"
              >
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {metric}
                </div>
                <div className="text-base font-mono font-bold text-slate-700 dark:text-slate-300">
                  Chưa nạp báo cáo thực
                </div>
                <p className="text-[11px] text-slate-500">
                  Không hiển thị số liệu giả lập cho chỉ số kiểm định
                </p>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Research Architectures Direction */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            2. Định hướng Nghiên cứu Kiến trúc Kết hợp (Hybrid Multi-Backbone Ensemble)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {RESEARCH_ARCHITECTURES.map((arch) => (
            <div
              key={arch.name}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <Cpu className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/30">
                  {arch.status}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {arch.name}
              </h3>
              <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">{arch.role}</p>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {arch.details}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Preprocessing Strategy & Demo Confusion Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Preprocessing & Training Strategy (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              3. Chiến lược Tiền xử lý & Huấn luyện Đề xuất
            </h2>
          </div>

          <ul className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                <strong>Brain Contour ROI Cropping (OpenCV):</strong> Dùng Otsu Thresholding tìm
                contour hộp sọ lớn nhất để cắt bỏ nền đen thừa và ký tự viền ảnh.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                <strong>Chuẩn hóa CLAHE & Z-score:</strong> Giảm hiện tượng dịch chuyển miền (Domain
                Shift) giữa máy chụp 1.5T và 3.0T.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                <strong>Augmentation phù hợp bản chất xám MRI:</strong> Không dùng Hue/Saturation
                Jitter; ưu tiên Horizontal Flip, xoay góc nhỏ (±15°), CoarseDropout và CutMix/Mixup
                mức nhẹ.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                <strong>5-Fold Stratified Cross-Validation & Label Smoothing:</strong> Đảm bảo tỷ lệ
                4 lớp cân bằng và hạn chế overconfidence ở vùng biên tổn thương mờ.
              </span>
            </li>
          </ul>
        </div>

        {/* Confusion Matrix Demo Structure (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Grid className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                4. Confusion Matrix (Bản Minh họa Cấu trúc UI)
              </h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/30">
              DEMO CẤU TRÚC — KHÔNG PHẢI SỐ LIỆU THỰC
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ma trận dưới đây minh họa cách giao diện hiển thị độ phân tách giữa 4 nhãn (đặc biệt là
            cặp dễ nhầm lẫn <code>Glioma</code> và <code>Meningioma</code>) khi nạp file kết quả từ
            tập Test.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-500">
                    Thực tế \ Dự đoán
                  </th>
                  {DEMO_CONFUSION_MATRIX.labels.map((lbl) => (
                    <th
                      key={lbl}
                      className="p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200"
                    >
                      {lbl}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEMO_CONFUSION_MATRIX.rows.map((row, rIdx) => (
                  <tr key={row.actual}>
                    <th className="p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-bold text-left text-slate-800 dark:text-slate-200">
                      {row.actual}
                    </th>
                    {row.values.map((val, cIdx) => {
                      const isDiag = rIdx === cIdx;
                      return (
                        <td
                          key={cIdx}
                          className={`p-2.5 border border-slate-200 dark:border-slate-800 font-mono font-bold ${
                            isDiag
                              ? 'bg-teal-500/20 text-teal-900 dark:text-teal-200'
                              : val > 0
                                ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300'
                                : 'text-slate-400'
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Future Directions from Spec 2 */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-3">
        <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
          <Database className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h2>5. Lộ trình Mở rộng Tương lai (Future Research Directions)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
            <strong className="block text-slate-900 dark:text-slate-100 mb-1">
              Phân vùng 3D & Tính thể tích (BraTS)
            </strong>
            Định hướng nghiên cứu 3D U-Net / Swin UNETR trên đa chuỗi xung (T1, T1ce, T2, FLAIR).
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
            <strong className="block text-slate-900 dark:text-slate-100 mb-1">
              Tích hợp Chuẩn DICOM / PACS & XAI
            </strong>
            Kết nối DICOM Parser và xuất bản đồ nhiệt Grad-CAM trực tiếp từ tầng tích chập PyTorch.
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
            <strong className="block text-slate-900 dark:text-slate-100 mb-1">
              Hội chẩn Từ xa (Telemedicine CADx)
            </strong>
            Mở rộng quy trình chia sẻ ca bệnh có kiểm soát quyền giữa cơ sở tuyến dưới và chuyên
            gia.
          </div>
        </div>
      </div>

      <MedicalDisclaimer />
    </div>
  );
};
