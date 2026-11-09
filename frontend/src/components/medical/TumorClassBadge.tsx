import React from 'react';
import { TUMOR_LABEL_METADATA } from '@/constants/medicalLabels';
import type { TumorLabel } from '@/types/domain';

interface TumorClassBadgeProps {
  label: TumorLabel;
  size?: 'sm' | 'md';
  showVietnamese?: boolean;
}

export const TumorClassBadge: React.FC<TumorClassBadgeProps> = ({
  label,
  size = 'md',
  showVietnamese = false,
}) => {
  const meta = TUMOR_LABEL_METADATA[label] ?? TUMOR_LABEL_METADATA['No Tumor'];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold border ${meta.badgeColorClass} ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
      }`}
    >
      <span>{meta.label}</span>
      {showVietnamese && (
        <span className="opacity-80 font-medium">({meta.vietnameseTitle})</span>
      )}
    </span>
  );
};
