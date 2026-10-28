import React from 'react';
import { AlertCircle, Brain, CheckCircle2, Info } from 'lucide-react';
import { TUMOR_LABEL_METADATA } from '@/constants/medicalLabels';
import { formatPercent } from '@/utils/formatters';
import type { TumorLabel } from '@/types/domain';

interface PredictionCardProps {
  predictedLabel: TumorLabel;
  confidenceScore: number | null;
  isDemoFixture: boolean;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({
  predictedLabel,
  confidenceScore,
  isDemoFixture,
}) => {
  const meta = TUMOR_LABEL_METADATA[predictedLabel];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Brain className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          Nhãn phân loại từ mô hình (4 lớp)
        </span>
        {isDemoFixture && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
            Kết quả minh họa (Mock Fixture)
          </span>
        )}
      </div>

      {/* Main Predicted Class Banner */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-xl text-sm font-bold border ${meta.badgeColorClass}`}
            >
              {meta.label}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50">
              {meta.vietnameseTitle}
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Vị trí giải phẫu tham chiếu: <strong>{meta.anatomicalLocation}</strong>
          </p>
        </div>

        <div className="sm:text-right shrink-0 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Confidence Score (Softmax)
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {confidenceScore !== null ? formatPercent(confidenceScore) : 'Chưa cung cấp'}
          </div>
        </div>
      </div>

      {/* Explicit note that confidence is NOT diagnostic accuracy */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-500/25 text-xs text-sky-950 dark:text-sky-200">
        <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Lưu ý quan trọng về điểm số:</strong> Điểm tự tin (
          <code>Confidence Score</code>) chỉ biểu thị mức độ khớp toán học của ảnh đầu vào so với
          4 nhãn trong tập dữ liệu huấn luyện;{' '}
          <strong>tuyệt đối không phải xác suất chẩn đoán đúng</strong> và không phản ánh mức độ
          lành tính hay ác tính.
        </p>
      </div>

      {/* Plain-language explanation */}
      <div className="space-y-2.5 pt-1">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Giải thích nhãn dự đoán theo ngôn ngữ dễ hiểu
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {meta.overview}
        </p>
        <ul className="space-y-1.5 pt-1">
          {meta.keyPoints.map((point, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300"
            >
              <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <span>
          <strong>Giới hạn kỹ thuật:</strong> {meta.importantLimitation}
        </span>
      </div>
    </div>
  );
};
