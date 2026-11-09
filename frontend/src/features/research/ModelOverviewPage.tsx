import React from 'react';
import {
  FlaskConical,
  Layers,
  Cpu,
  Grid,
  AlertCircle,
  CheckCircle2,
  Database,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { MedicalDisclaimer } from '@/components/medical/MedicalDisclaimer';

const RESEARCH_ARCHITECTURES = [
  {
    name: 'ConvNeXt (Base / Large)',
    params: '~89M tham số',
    status: 'Nghiên cứu Khảo nghiệm (PyTorch Backbone)',
    badgeColor: 'bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/30',
    role: 'Trích xuất đặc trưng cục bộ (Local Visual Features)',
    details:
      'Sử dụng các khối 7×7 Depthwise Convolution mô phỏng trường nhìn rộng của Transformer nhưng vẫn bảo toàn tính bất biến dịch chuyển của CNN. Tối ưu hóa phân tích viền ngấm thuốc dạng vòng và phù não vận mạch xung quanh Glioma.',
    benchmarkExpected: 'Trọng tâm: Ranh giới u nội trục & ngoài trục • Chưa huấn luyện / chưa đo',
  },
  {
    name: 'Swin Transformer V2 (Base)',
    params: '~88M tham số',
    status: 'Nghiên cứu Khảo nghiệm (PyTorch Backbone)',
    badgeColor: 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30',
    role: 'Thu nhận ngữ cảnh diện rộng (Global Context & Symmetry)',
    details:
      'Dựa trên cơ chế Shifted Window Self-Attention giúp mô hình học tương quan đối xứng giải phẫu giữa hai bán cầu đại não, phát hiện hiệu ứng đè ép đường giữa (Midline Shift) và giãn não thất do khối u choán chỗ.',
    benchmarkExpected: 'Trọng tâm: Cấu trúc đối xứng & chèn ép đường giữa • Chưa huấn luyện / chưa đo',
  },
  {
    name: 'EfficientNetV2-L',
    params: '~118M tham số',
    status: 'Nghiên cứu Khảo nghiệm (PyTorch Backbone)',
    badgeColor: 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/30',
    role: 'Biểu diễn đặc trưng đa tỷ lệ (Multi-scale Representation)',
    details:
      'Kết hợp các khối Fused-MBConv và kỹ thuật Progressive Resizing (256×256 → 384×384) giúp mô hình nhận diện chuẩn xác các khối u có kích thước vi mô trong hố yên (Microadenoma < 10mm).',
    benchmarkExpected: 'Trọng tâm: Khối u kích thước vi mô hố yên • Chưa huấn luyện / chưa đo',
  },
];

// Số liệu đo thực tế bằng ai_engine/evaluate.py (onnxruntime) trên thư mục Testing
// của Brain Tumor MRI Dataset: 4 lớp x 400 ảnh = 1.600 ảnh. Báo cáo gốc: ai_engine/eval_report.json
const VALIDATION_METRICS = {
  accuracy: '95.50%',
  macroPrecision: '95.60%',
  macroRecall: '95.50%',
  macroF1: '95.45%',
  totalSamples: 1600,
  correctSamples: 1528,
};

const PER_CLASS_METRICS = [
  {
    label: 'Glioma',
    vietnamese: 'U tế bào thần kinh đệm',
    precision: '96.93%',
    recall: '86.75%',
    f1Score: '91.56%',
    support: 400,
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  },
  {
    label: 'Meningioma',
    vietnamese: 'U màng não',
    precision: '90.63%',
    recall: '96.75%',
    f1Score: '93.59%',
    support: 400,
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  {
    label: 'Pituitary',
    vietnamese: 'U tuyến yên',
    precision: '98.03%',
    recall: '99.75%',
    f1Score: '98.88%',
    support: 400,
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  },
  {
    label: 'No Tumor',
    vietnamese: 'Bình thường / Không u',
    precision: '96.81%',
    recall: '98.75%',
    f1Score: '97.77%',
    support: 400,
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
];

const VALIDATION_CONFUSION_MATRIX = {
  labels: ['Glioma', 'Meningioma', 'Pituitary', 'No Tumor'],
  rows: [
    { actual: 'Glioma', values: [347, 40, 1, 12] },
    { actual: 'Meningioma', values: [5, 387, 7, 1] },
    { actual: 'Pituitary', values: [1, 0, 399, 0] },
    { actual: 'No Tumor', values: [5, 0, 0, 395] },
  ],
};

export const ModelOverviewPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Góc Nghiên cứu & Mô hình AI • Báo cáo Thực nghiệm & Minh bạch Học thuật"
        title="Tổng quan Chiến lược Mô hình & Báo cáo Đánh giá Thực nghiệm"
        description="Báo cáo kết quả đo thực tế của mô hình Student ONNX trên tập Testing và định hướng nâng cấp kiến trúc Hybrid Multi-Backbone Ensemble."
      />

      {/* Academic Transparency Notice */}
      <div className="rounded-2xl border border-teal-500/30 bg-teal-50/70 dark:bg-teal-950/25 p-5 flex items-start gap-3 text-xs sm:text-sm text-teal-950 dark:text-teal-200">
        <AlertCircle className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <p className="font-bold">
            Nguyên tắc Minh bạch Học thuật & Y đức (Academic & Clinical Integrity):
          </p>
          <p>
            Các chỉ số đánh giá bên dưới được đo thực tế bằng script{' '}
            <code className="px-1 py-0.5 rounded bg-teal-500/10 font-mono text-teal-800 dark:text-teal-300">ai_engine/evaluate.py</code>{' '}
            chạy mô hình <code>brain_mri_student.onnx</code> trên thư mục <code>Testing</code> của Brain Tumor MRI Dataset (1.600 ảnh, mỗi lớp 400 ảnh). Chưa xác minh được tập này tách biệt hoàn toàn với dữ liệu huấn luyện của mô hình, nên cần đọc như kết quả tham khảo. Các kiến trúc <code>ConvNeXt</code>, <code>Swin Transformer V2</code> và{' '}
            <code>EfficientNetV2</code> chỉ là <strong>định hướng nghiên cứu</strong>, chưa được huấn luyện hay đo đạc.
          </p>
        </div>
      </div>

      {/* 1. Active Deployed ONNX Student Model */}
      <div className="rounded-2xl border-2 border-teal-500/40 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              1. Mô hình Phân loại Trực tiếp (Active Deployed Model): <code className="text-teal-700 dark:text-teal-300 font-mono">brain_mri_student.onnx</code>
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-500/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            Đang hoạt động trên Edge WASM (Client-side)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-1">
            <div className="text-xs font-medium text-slate-500">Tensor Đầu Vào (Input)</div>
            <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">image: [1, 3, 256, 256]</div>
            <p className="text-[11px] text-slate-500">Chuẩn hóa ImageNet Mean/Std (Float32)</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-1">
            <div className="text-xs font-medium text-slate-500">Tensor Đầu Ra (Output)</div>
            <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">logits: [1, 5] → 4 Classes</div>
            <p className="text-[11px] text-slate-500">Glioma, Meningioma, Pituitary, No Tumor</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-1">
            <div className="text-xs font-medium text-slate-500">Độ Trễ Suy Luận (Latency)</div>
            <div className="text-sm font-mono font-bold text-teal-600 dark:text-teal-400">~8 ms / lát cắt (CPU)</div>
            <p className="text-[11px] text-slate-500">Đo bằng onnxruntime Python trên máy phát triển (trung vị 50 lần chạy). Trên trình duyệt (WASM) tùy thiết bị, chưa đo.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-1">
            <div className="text-xs font-medium text-slate-500">Kích Thước Mô Hình</div>
            <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">15.3 MiB (16.0 MB)</div>
            <p className="text-[11px] text-slate-500">Tệp ONNX phục vụ tĩnh cùng ứng dụng</p>
          </div>
        </div>
      </div>

      {/* 2. Real Model Evaluation Metrics */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                2. Chỉ số Đánh giá Thực nghiệm (Accuracy, Precision, Recall, F1-Score)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kết quả đo thực tế trên tập Testing ({VALIDATION_METRICS.totalSamples} lát cắt MRI, 4 nhóm bệnh lý).
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Đo thực tế ({VALIDATION_METRICS.correctSamples}/{VALIDATION_METRICS.totalSamples} mẫu đúng)
          </span>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/25 border border-teal-500/30 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-teal-900 dark:text-teal-300">
              <span>Accuracy (Độ chính xác)</span>
              <TrendingUp className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-mono font-extrabold text-teal-700 dark:text-teal-300">
              {VALIDATION_METRICS.accuracy}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tỷ lệ phân loại chính xác toàn bộ 4 lớp u não
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/25 border border-sky-500/30 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-sky-900 dark:text-sky-300">
              <span>Macro Precision</span>
              <ShieldCheck className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-mono font-extrabold text-sky-700 dark:text-sky-300">
              {VALIDATION_METRICS.macroPrecision}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Độ chuẩn xác trung bình, hạn chế tối đa dương tính giả (FP)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/25 border border-indigo-500/30 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-900 dark:text-indigo-300">
              <span>Macro Recall (Độ nhạy)</span>
              <Zap className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-mono font-extrabold text-indigo-700 dark:text-indigo-300">
              {VALIDATION_METRICS.macroRecall}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Khả năng bao phủ ca bệnh, tránh bỏ sót ca u não thực tế (FN)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-500/30 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-900 dark:text-emerald-300">
              <span>Macro F1-Score</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-mono font-extrabold text-emerald-700 dark:text-emerald-300">
              {VALIDATION_METRICS.macroF1}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Điểm số điều hòa giữa Precision và Recall trên tập dữ liệu
            </p>
          </div>
        </div>

        {/* Per-class Breakdown Table */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Bảng chỉ số chi tiết từng lớp bệnh lý (Classification Report):
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">Nhóm bệnh lý</th>
                  <th className="p-3">Tên tiếng Việt</th>
                  <th className="p-3 font-mono text-center">Precision</th>
                  <th className="p-3 font-mono text-center">Recall</th>
                  <th className="p-3 font-mono text-center">F1-Score</th>
                  <th className="p-3 font-mono text-center">Số mẫu kiểm định (Support)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {PER_CLASS_METRICS.map((row) => (
                  <tr key={row.label} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${row.badgeClass}`}>
                        {row.label}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{row.vietnamese}</td>
                    <td className="p-3 text-center font-mono font-semibold text-teal-700 dark:text-teal-300">
                      {row.precision}
                    </td>
                    <td className="p-3 text-center font-mono font-semibold text-sky-700 dark:text-sky-300">
                      {row.recall}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      {row.f1Score}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-500 dark:text-slate-400">
                      {row.support} lát cắt
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Confusion Matrix Validation Structure & Preprocessing Strategy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Confusion Matrix Validation (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Grid className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                3. Ma trận Nhầm lẫn (Confusion Matrix)
              </h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-900 dark:text-teal-300 border border-teal-500/30">
              1.600 LÁT CẮT TESTING
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Phân bố kết quả dự đoán đối chiếu với nhãn thực tế trên tập Testing. Đường chéo chính (màu xanh ngọc) là các ca dự đoán đúng.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-500">
                    Thực tế \ Dự đoán
                  </th>
                  {VALIDATION_CONFUSION_MATRIX.labels.map((lbl) => (
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
                {VALIDATION_CONFUSION_MATRIX.rows.map((row, rIdx) => (
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

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed space-y-1">
            <strong>Nhận xét từ số liệu:</strong>
            <p>
              Lỗi lớn nhất là 40/400 ca Glioma bị dự đoán thành Meningioma, kéo Recall của Glioma xuống 86.75%. Mô hình có xu hướng bỏ sót Glioma nhiều hơn các lớp còn lại, nên kết quả AI cần bác sĩ đối chiếu, nhất là với nhãn Meningioma và No Tumor.
            </p>
          </div>
        </div>

        {/* Preprocessing & Training Strategy (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Layers className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              4. Tiền Xử Lý Ảnh & Huấn Luyện: Hiện Trạng Thực Tế
            </h2>
          </div>

          <ul className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                <strong>Tiền xử lý khi suy luận (đang chạy):</strong> Đưa ảnh về 256×256 với giá trị [0, 1]; ảnh có nền sáng được hiệu chỉnh độ sáng và thêm viền đen trước khi resize (xem mriInferenceService.ts và infer_python.py). Theo ghi chú trong mã nguồn, bước chuẩn hóa ImageNet nằm bên trong đồ thị ONNX.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                <strong>Tiền xử lý trong train.py (chưa dùng cho mô hình đang chạy):</strong> Cắt vùng sọ theo ngưỡng cố định 45 và CLAHE (clipLimit=2.0). Hai bước này không được áp dụng khi suy luận.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                <strong>Huấn luyện:</strong> train.py chưa có vòng lặp huấn luyện thật, nên chưa có bằng chứng về Label Smoothing, Cosine Annealing hay Cross-Validation cho mô hình đang chạy.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                <strong>Nguồn gốc mô hình:</strong> Tệp ONNX có nhiều khối Sigmoid×Mul (SiLU) và Squeeze-Excitation, dấu hiệu của họ EfficientNet, không khớp với model.py (MobileNetV2). Chưa có mã hoặc nhật ký huấn luyện để tái lập tệp này.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* 5. Research Architectures Direction */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              5. Định hướng Nghiên cứu Đa Kiến trúc Kết hợp (Hybrid Multi-Backbone Ensemble)
            </h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30">
            Ý tưởng Ensemble (đề xuất, chưa triển khai)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {RESEARCH_ARCHITECTURES.map((arch) => (
            <div
              key={arch.name}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Cpu className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${arch.badgeColor}`}>
                    {arch.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {arch.name}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {arch.params}
                  </div>
                </div>
                <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">{arch.role}</p>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {arch.details}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                {arch.benchmarkExpected}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Future Directions */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-3">
        <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
          <Database className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h2>6. Lộ trình Mở rộng Tương lai (Future Research & Integration Directions)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
            <strong className="block text-slate-900 dark:text-slate-100 mb-1">
              Phân vùng 3D & Tính thể tích (BraTS 3D U-Net)
            </strong>
            Nghiên cứu mô hình 3D U-Net / Swin UNETR đa chuỗi xung (T1, T1-Gd, T2, FLAIR) nhằm tự động bóc tách thể tích u hoại tử và phù não.
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
            <strong className="block text-slate-900 dark:text-slate-100 mb-1">
              Chuẩn DICOM / PACS & Bản đồ nhiệt Grad-CAM
            </strong>
            Kết nối trực tiếp hệ thống lưu trữ hình ảnh bệnh viện PACS qua cổng DICOM Parser và xuất bản đồ kích hoạt vùng chú ý Grad-CAM từ tầng tích chập cuối.
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
            <strong className="block text-slate-900 dark:text-slate-100 mb-1">
              Hội chẩn Chuyên sâu Từ xa (Telemedicine CADx)
            </strong>
            Mở rộng quy trình phân quyền RBAC đa cấp giữa bác sĩ tuyến cơ sở và hội đồng hội chẩn Ngoại thần kinh trung ương.
          </div>
        </div>
      </div>

      <MedicalDisclaimer />
    </div>
  );
};
