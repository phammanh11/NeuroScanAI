import React from 'react';
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonChat,
  SkeletonDashboard,
  SkeletonMRIResult,
  SkeletonFullPage,
} from './Skeleton';

export type LoadingSkeletonVariant =
  | 'auto'
  | 'page'
  | 'dashboard'
  | 'chat'
  | 'table'
  | 'cards'
  | 'mri-result'
  | 'generic'
  | 'compact';

export interface LoadingStateProps {
  title?: string;
  description?: string;
  compact?: boolean;
  variant?: LoadingSkeletonVariant;
  className?: string;
}

/**
 * LoadingState - Hệ thống hiển thị Skeleton Loading cao cấp
 * Thay thế hoàn toàn vòng xoay Spinner truyền thống bằng khung xương giao diện (Skeleton)
 * có hiệu ứng chuyển động Shimmer Wave mô phỏng cấu trúc nội dung thực tế.
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Đang tải dữ liệu...',
  description: _description,
  compact = false,
  variant = 'auto',
  className = '',
}) => {
  // 1. Compact Mini Skeleton (thường dùng trong dropdown hoặc nút bấm nhỏ)
  if (compact || variant === 'compact') {
    return (
      <div
        role="status"
        aria-label={title}
        className={`flex items-center gap-2.5 py-3 text-xs text-slate-500 dark:text-slate-400 ${className}`}
      >
        <Skeleton className="w-4 h-4 rounded-full bg-teal-500/30" />
        <Skeleton className="h-3 w-32 rounded-md" />
      </div>
    );
  }

  // 2. Xác định Variant tự động dựa trên tiêu đề ngữ cảnh
  const resolvedVariant = (() => {
    if (variant !== 'auto') return variant;
    const lower = title.toLowerCase();
    if (lower.includes('giao diện') || lower.includes('khởi tạo') || lower.includes('neuroscan')) {
      return 'page';
    }
    if (lower.includes('trợ lý') || lower.includes('chat') || lower.includes('hội thoại')) {
      return 'chat';
    }
    if (lower.includes('bảng điều khiển') || lower.includes('dashboard') || lower.includes('tổng quan')) {
      return 'dashboard';
    }
    if (lower.includes('kết quả') || lower.includes('kết quả phiên') || lower.includes('mri')) {
      return 'mri-result';
    }
    if (lower.includes('bệnh nhân') || lower.includes('khách hàng') || lower.includes('danh sách')) {
      return 'table';
    }
    if (lower.includes('kiến thức') || lower.includes('lịch sử') || lower.includes('chủ đề')) {
      return 'cards';
    }
    return 'generic';
  })();

  // 3. Render Skeleton theo Layout thực tế của từng màn hình
  switch (resolvedVariant) {
    case 'page':
      return <SkeletonFullPage className={className} />;

    case 'chat':
      return <SkeletonChat className={className} />;

    case 'dashboard':
      return <SkeletonDashboard className={className} />;

    case 'mri-result':
      return <SkeletonMRIResult className={className} />;

    case 'table':
      return (
        <div className={`space-y-4 ${className}`} role="status">
          <SkeletonTable title={title} rows={5} cols={5} />
        </div>
      );

    case 'cards':
      return (
        <div className={`space-y-6 ${className}`} role="status">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-48 rounded-lg" />
              <Skeleton className="h-3.5 w-64 rounded-md" />
            </div>
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} bodyLines={3} hasHeader hasFooter />
            ))}
          </div>
        </div>
      );

    case 'generic':
    default:
      return (
        <div
          role="status"
          aria-label={title}
          className={`w-full space-y-6 ${className}`}
        >
          {/* Header Skeleton */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div className="space-y-2">
              <Skeleton className="h-7 w-60 rounded-xl" />
              <Skeleton className="h-4 w-96 rounded-md" />
            </div>
            <div className="flex gap-2.5">
              <Skeleton className="h-10 w-28 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-soft space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="w-8 h-8 rounded-xl" />
                </div>
                <Skeleton className="h-7 w-24 rounded-lg" />
                <Skeleton className="h-3 w-36 rounded-md" />
              </div>
            ))}
          </div>

          {/* Main Full-width Card */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-6 sm:p-8 shadow-soft space-y-5">
            <div className="flex items-center gap-3.5">
              <Skeleton className="w-11 h-11 rounded-2xl bg-teal-500/15 shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-5 w-1/3 rounded-md" />
                <Skeleton className="h-3.5 w-1/4 rounded-md" />
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <SkeletonText lines={4} />
            </div>
          </div>
        </div>
      );
  }
};
