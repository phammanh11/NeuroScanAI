import React from 'react';
import {
  BadgeCheck,
  ClipboardCheck,
  Clock,
  FileText,
  GitCompareArrows,
  Stethoscope,
} from 'lucide-react';
import {
  AI_ASSESSMENT_VERDICT_META,
  DOCTOR_REVIEW_STATUS_META,
  TUMOR_LABEL_METADATA,
} from '@/constants/medicalLabels';
import { formatDateTimeVN } from '@/utils/formatters';
import type {
  AIAssessmentVerdict,
  DoctorReviewStatus,
  TumorLabel,
} from '@/types/domain';

export interface ClinicalReviewDisplayData {
  doctorName: string;
  doctorSpecialty: string;
  confirmedLabel?: TumorLabel;
  aiAssessment: AIAssessmentVerdict;
  clinicalNoteForPatient: string;
  recommendedNextStep: string;
  updatedAt: string;
}

interface ClinicalReviewReportCardProps {
  review: ClinicalReviewDisplayData;
  aiPredictedLabel: TumorLabel;
  reviewStatus: DoctorReviewStatus;
  isPreview?: boolean;
}

function getDoctorInitials(name: string): string {
  const cleaned = name
    .replace(/^(BS\.?CKII?|TS\.?|PGS\.?|GS\.?|ThS\.?|Dr\.?)\s*/gi, '')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const ClinicalReviewReportCard: React.FC<ClinicalReviewReportCardProps> = ({
  review,
  aiPredictedLabel,
  reviewStatus,
  isPreview = false,
}) => {
  const verdictMeta = AI_ASSESSMENT_VERDICT_META[review.aiAssessment];
  const statusMeta = DOCTOR_REVIEW_STATUS_META[reviewStatus];
  const finalLabel = review.confirmedLabel || aiPredictedLabel;
  const labelMeta = TUMOR_LABEL_METADATA[finalLabel];
  const isOverridden =
    Boolean(review.confirmedLabel) && review.confirmedLabel !== aiPredictedLabel;

  return (
    <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      {/* 1. Attending Physician Sign-off Bar */}
      <div className="px-5 py-4 bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-teal-600/10 dark:bg-teal-500/15 border border-teal-600/20 dark:border-teal-400/25 flex items-center justify-center text-xs font-bold text-teal-700 dark:text-teal-300 shrink-0">
            {getDoctorInitials(review.doctorName)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {review.doctorName}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 dark:text-teal-300">
                <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Đã ký duyệt</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {review.doctorSpecialty}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isPreview && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Xem trước
            </span>
          )}
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusMeta.badgeClass}`}
          >
            {statusMeta.label}
          </span>
        </div>
      </div>

      {/* 2. Clinical Impression vs AI Concordance Grid */}
      <div className="p-5 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Primary Verdict: Doctor Confirmed Impression */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Kết luận hình ảnh của Bác sĩ</span>
            </div>

            <div className="space-y-0.5">
              <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                {finalLabel}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {labelMeta?.vietnameseTitle || finalLabel}
              </div>
            </div>

            <div className="pt-1 flex items-center gap-1.5 text-[11px]">
              <GitCompareArrows className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {isOverridden ? (
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  Bác sĩ hiệu chỉnh từ gợi ý AI ({aiPredictedLabel})
                </span>
              ) : (
                <span className="font-medium text-teal-700 dark:text-teal-300">
                  Khớp với phân loại gợi ý của AI ({aiPredictedLabel})
                </span>
              )}
            </div>
          </div>

          {/* Secondary Verdict: AI Reliability Assessment */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Đánh giá đối chiếu kết quả AI
            </div>

            <div>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${verdictMeta.badgeClass}`}
              >
                {verdictMeta.label}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {verdictMeta.description}
            </p>
          </div>
        </div>

        {/* 3. Clinical Findings / Doctor's Note */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Nhận xét chuyên môn chi tiết</span>
          </div>
          <div className="pl-4 border-l-2 border-teal-500/60 dark:border-teal-400/50 py-0.5">
            <p className="text-sm text-slate-800 dark:text-slate-100 leading-7 whitespace-pre-line">
              {review.clinicalNoteForPatient.trim() ||
                'Chưa có nội dung nhận xét lâm sàng.'}
            </p>
          </div>
        </div>

        {/* 4. Actionable Next Steps */}
        <div className="rounded-xl bg-teal-50/70 dark:bg-teal-950/25 border border-teal-200/80 dark:border-teal-800/60 p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600/10 dark:bg-teal-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <ClipboardCheck className="w-4 h-4 text-teal-700 dark:text-teal-300" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200">
              Hướng xử trí & Khuyến nghị bước tiếp theo
            </div>
            <p className="text-sm font-medium text-teal-950 dark:text-teal-100 leading-relaxed">
              {review.recommendedNextStep.trim() ||
                'Khám trực tiếp chuyên khoa kèm hồ sơ DICOM gốc.'}
            </p>
          </div>
        </div>

        {/* Footer timestamp */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Cập nhật lúc: {formatDateTimeVN(review.updatedAt)}</span>
          </span>
          <span>Nhận định chuyên môn độc lập với mô hình AI</span>
        </div>
      </div>
    </article>
  );
};
