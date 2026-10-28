import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Đã xảy ra lỗi khi xử lý yêu cầu',
  message,
  onRetry,
}) => {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-500/30 bg-rose-50/70 dark:bg-rose-950/20 p-6 text-center"
    >
      <div className="mx-auto w-11 h-11 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-3">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h3 className="text-base font-semibold text-rose-950 dark:text-rose-200">{title}</h3>
      <p className="text-sm text-rose-800 dark:text-rose-300/90 mt-1 max-w-lg mx-auto leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Thử lại
          </button>
        </div>
      )}
    </div>
  );
};
