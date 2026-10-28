import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  title?: string;
  description?: string;
  compact?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Đang tải dữ liệu...',
  description = 'Hệ thống đang chuẩn bị dữ liệu hiển thị.',
  compact = false,
}) => {
  if (compact) {
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-2.5 py-6 text-sm text-slate-600 dark:text-slate-400"
      >
        <Loader2 className="w-4 h-4 animate-spin text-teal-600 dark:text-teal-400" />
        <span>{title}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-soft"
    >
      <div className="mx-auto w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-3">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
        {description}
      </p>
      <div className="mt-6 max-w-md mx-auto space-y-2.5">
        <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="h-3 w-4/5 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
    </div>
  );
};
