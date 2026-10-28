import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { PERMANENT_MEDICAL_DISCLAIMER } from '@/constants/medicalLabels';

interface MedicalDisclaimerProps {
  compact?: boolean;
  customText?: string;
}

export const MedicalDisclaimer: React.FC<MedicalDisclaimerProps> = ({
  compact = false,
  customText,
}) => {
  return (
    <div
      role="note"
      aria-label="Khuyến cáo an toàn y tế"
      className={`rounded-2xl border border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/25 text-amber-950 dark:text-amber-200 ${
        compact ? 'px-3.5 py-2.5 text-xs' : 'p-4 text-xs sm:text-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <ShieldAlert
          className={`${
            compact ? 'w-4 h-4 mt-0.5' : 'w-5 h-5 mt-0.5'
          } text-amber-600 dark:text-amber-400 shrink-0`}
        />
        <div className="space-y-1 leading-relaxed">
          <p className="font-semibold">
            Cảnh báo An toàn Y tế & Giới hạn Công nghệ AI:
          </p>
          <p className="text-amber-900/90 dark:text-amber-200/90">
            {customText || PERMANENT_MEDICAL_DISCLAIMER}
          </p>
        </div>
      </div>
    </div>
  );
};
