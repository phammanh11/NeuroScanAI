import React from 'react';
import { CheckCircle2, Clock, ExternalLink, Building2 } from 'lucide-react';
import { formatDateVN } from '@/utils/formatters';
import type { KnowledgeSourceMetadata } from '@/types/domain';

interface SourceCardProps {
  source: KnowledgeSourceMetadata;
  compact?: boolean;
}

export const SourceCard: React.FC<SourceCardProps> = ({ source, compact = false }) => {
  const isVerified = source.reviewStatus === 'verified';

  return (
    <div
      className={`rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 ${
        compact ? 'p-3 text-xs' : 'p-4 text-xs sm:text-sm'
      } space-y-2`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
          <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>{source.organization}</span>
        </div>

        {isVerified ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Nguồn đã xác minh
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            Bản thảo / Chờ kiểm duyệt
          </span>
        )}
      </div>

      <p className="text-slate-700 dark:text-slate-300 font-medium">{source.title}</p>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
        <span>Ngày xác minh: {formatDateVN(source.lastVerified)}</span>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-teal-600 dark:text-teal-400 hover:underline"
        >
          <span>Mở tài liệu gốc</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
