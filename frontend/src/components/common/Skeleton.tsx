import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

// -----------------------------------------------------------------------------
// 1. Base Skeleton Primitive
// -----------------------------------------------------------------------------
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  shimmer = true,
  ...props
}) => {
  return (
    <div
      role="status"
      aria-label="Đang tải dữ liệu..."
      className={cn(
        'bg-slate-200/80 dark:bg-slate-800/80 animate-pulse rounded-xl',
        shimmer && 'skeleton-shimmer',
        className
      )}
      {...props}
    />
  );
};

// -----------------------------------------------------------------------------
// 2. Text Line / Paragraph Skeleton
// -----------------------------------------------------------------------------
export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  className,
}) => {
  const widths = ['w-full', 'w-11/12', 'w-4/5', 'w-3/4', 'w-2/3'];
  return (
    <div className={cn('space-y-2.5', className)} role="status">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3.5', widths[i % widths.length], 'rounded-md')}
        />
      ))}
    </div>
  );
};

// -----------------------------------------------------------------------------
// 3. Card Block Skeleton
// -----------------------------------------------------------------------------
export interface SkeletonCardProps {
  className?: string;
  hasHeader?: boolean;
  hasFooter?: boolean;
  bodyLines?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  className,
  hasHeader = true,
  hasFooter = false,
  bodyLines = 3,
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 space-y-4 shadow-soft',
        className
      )}
      role="status"
    >
      {hasHeader && (
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-3 w-1/3 rounded-md" />
          </div>
        </div>
      )}

      <SkeletonText lines={bodyLines} />

      {hasFooter && (
        <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="h-7 w-24 rounded-xl" />
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// 4. Table / Data List Skeleton
// -----------------------------------------------------------------------------
export interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  className?: string;
  title?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  cols = 5,
  className,
  title: _title,
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 shadow-soft space-y-4',
        className
      )}
      role="status"
    >
      {/* Table Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-slate-800">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-48 rounded-lg" />
          <Skeleton className="h-3.5 w-64 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-40 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* Table Column Headers */}
      <div className="grid grid-cols-12 gap-3 py-2 px-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className={cn(
              i === 0 ? 'col-span-3' : i === 1 ? 'col-span-3' : 'col-span-2'
            )}
          >
            <Skeleton className="h-3.5 w-2/3 rounded-md" />
          </div>
        ))}
      </div>

      {/* Table Rows */}
      <div className="space-y-3 pt-1">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid grid-cols-12 gap-3 items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800/60"
          >
            <div className="col-span-3 flex items-center gap-2.5">
              <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3.5 w-3/4 rounded-md" />
                <Skeleton className="h-2.5 w-1/2 rounded-md" />
              </div>
            </div>
            <div className="col-span-3 space-y-1">
              <Skeleton className="h-3.5 w-4/5 rounded-md" />
              <Skeleton className="h-2.5 w-1/2 rounded-md" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-3.5 w-20 rounded-md" />
            </div>
            <div className="col-span-2 flex justify-end">
              <Skeleton className="h-8 w-20 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 5. Chat & Assistant Skeleton
// -----------------------------------------------------------------------------
export const SkeletonChat: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-8.5rem)] min-h-[580px]',
        className
      )}
      role="status"
    >
      {/* Left Column: Sessions List Skeleton (Hidden on mobile) */}
      <div className="hidden lg:flex lg:col-span-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-4 flex-col gap-3 shadow-soft">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-800">
          <Skeleton className="h-5 w-32 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3.5 w-24 rounded-md mb-3" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-2"
            >
              <Skeleton className="h-4 w-4/5 rounded-md" />
              <Skeleton className="h-3 w-1/2 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Chat Window Skeleton */}
      <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 flex flex-col shadow-soft overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4.5 w-36 rounded-md" />
              <Skeleton className="h-3 w-56 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>

        {/* Chat Messages Flow */}
        <div className="flex-1 p-5 space-y-5 overflow-y-auto">
          {/* 1. Assistant Welcome Bubble */}
          <div className="flex items-start gap-3 max-w-[85%]">
            <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
            <div className="p-4 rounded-2xl rounded-tl-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex-1 space-y-2.5">
              <Skeleton className="h-3.5 w-3/4 rounded-md" />
              <Skeleton className="h-3.5 w-full rounded-md" />
              <Skeleton className="h-3.5 w-5/6 rounded-md" />
              <div className="pt-2 flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
            </div>
          </div>

          {/* 2. User Question Bubble (Right aligned) */}
          <div className="flex items-start justify-end gap-3 ml-auto max-w-[75%]">
            <div className="p-3.5 rounded-2xl rounded-tr-xs bg-teal-500/15 dark:bg-teal-900/30 border border-teal-500/25 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-full rounded-md bg-teal-500/20 dark:bg-teal-700/40" />
              <Skeleton className="h-3.5 w-2/3 rounded-md bg-teal-500/20 dark:bg-teal-700/40" />
            </div>
            <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          </div>

          {/* 3. Assistant Responding Bubble with Sources */}
          <div className="flex items-start gap-3 max-w-[85%]">
            <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
            <div className="p-4 rounded-2xl rounded-tl-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex-1 space-y-2.5">
              <Skeleton className="h-3.5 w-full rounded-md" />
              <Skeleton className="h-3.5 w-11/12 rounded-md" />
              <Skeleton className="h-3.5 w-4/5 rounded-md" />
              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/50 space-y-2">
                <Skeleton className="h-3 w-40 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Chat Input Bar Skeleton */}
        <div className="p-4 border-t border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <Skeleton className="h-11 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 6. Typing Message Skeleton (Used while AI is streaming or reasoning)
// -----------------------------------------------------------------------------
export const SkeletonTypingMessage: React.FC = () => {
  return (
    <div className="flex items-start gap-3 max-w-[85%] animate-in fade-in duration-200" role="status">
      <Skeleton className="w-8 h-8 rounded-xl shrink-0 bg-teal-500/20 text-teal-600" />
      <div className="p-4 rounded-2xl rounded-tl-xs bg-white dark:bg-slate-900 border border-teal-500/30 text-slate-700 dark:text-slate-200 shadow-soft flex-1 space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
          <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">
            Trợ lý AI đang truy xuất RAG & suy luận câu trả lời...
          </span>
        </div>
        <Skeleton className="h-3.5 w-11/12 rounded-md" />
        <Skeleton className="h-3.5 w-4/5 rounded-md" />
        <Skeleton className="h-3.5 w-2/3 rounded-md" />
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 7. Dashboard Skeleton (KPIs + Grid Cards + Recent Table)
// -----------------------------------------------------------------------------
export const SkeletonDashboard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('space-y-6', className)} role="status">
      {/* Welcome Banner Skeleton */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-500/10 via-sky-500/5 to-transparent border border-teal-500/20 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-64 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex gap-2.5">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-soft space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="w-9 h-9 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-20 rounded-lg" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
        ))}
      </div>

      {/* Main 2-column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Table Skeleton (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-800">
            <div className="space-y-1">
              <Skeleton className="h-5 w-48 rounded-lg" />
              <Skeleton className="h-3.5 w-60 rounded-md" />
            </div>
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/70 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-3 w-24 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Quick Actions Card (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <SkeletonCard bodyLines={4} hasFooter />
          <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-soft space-y-3">
            <Skeleton className="h-4.5 w-32 rounded-md" />
            <Skeleton className="h-3.5 w-full rounded-md" />
            <Skeleton className="h-3.5 w-4/5 rounded-md" />
            <Skeleton className="h-9 w-full rounded-xl mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 8. MRI Scan / Result Detail Skeleton
// -----------------------------------------------------------------------------
export const SkeletonMRIResult: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('space-y-6', className)} role="status">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="space-y-2">
          <Skeleton className="h-7 w-72 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex gap-2.5">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* 2-Column Main View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 512x512 Canvas Viewport Skeleton (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>

          {/* Large Square Image Viewport */}
          <div className="aspect-square w-full max-w-[512px] mx-auto rounded-2xl bg-slate-900/90 relative overflow-hidden flex flex-col items-center justify-center p-6">
            <Skeleton className="w-3/4 h-3/4 rounded-full opacity-60" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <Skeleton className="h-3 w-28 rounded-md bg-slate-700" />
              <Skeleton className="h-3 w-20 rounded-md bg-slate-700" />
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-9 w-36 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
        </div>

        {/* Right: Diagnostic Card + Probabilities (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Main Diagnosis Card */}
          <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
            <Skeleton className="h-8 w-48 rounded-lg" />
            <SkeletonText lines={3} />
          </div>

          {/* 4 Probabilities Distribution */}
          <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-soft space-y-3.5">
            <Skeleton className="h-5 w-44 rounded-md mb-2" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-28 rounded-md" />
                  <Skeleton className="h-3.5 w-12 rounded-md" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
            ))}
          </div>

          {/* Doctor Review Box */}
          <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-soft space-y-3">
            <Skeleton className="h-5 w-36 rounded-md" />
            <SkeletonText lines={2} />
            <Skeleton className="h-10 w-full rounded-xl mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 9. Full Application Shell Skeleton (Full screen, top header + sidebar + canvas)
// -----------------------------------------------------------------------------
export const SkeletonFullPage: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col',
        className
      )}
      role="status"
      aria-label="Đang khởi tạo giao diện NeuroScan AI..."
    >
      {/* Top Navigation Bar Skeleton */}
      <header className="h-16 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl bg-teal-500/20" />
          <div className="space-y-1">
            <Skeleton className="h-4.5 w-32 rounded-md" />
            <Skeleton className="h-2.5 w-20 rounded-md" />
          </div>
          <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-slate-200 dark:border-slate-800">
            <Skeleton className="h-3.5 w-16 rounded-md" />
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <Skeleton className="h-3.5 w-28 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="hidden md:block h-9 w-44 rounded-xl" />
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="w-9 h-9 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Skeleton (Desktop) */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-4 space-y-4">
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 mb-3 space-y-1">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl">
                <Skeleton className="w-5 h-5 rounded-lg shrink-0" />
                <Skeleton className="h-3.5 w-28 rounded-md" />
              </div>
            ))}
          </div>

          {/* Bottom user card */}
          <div className="p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3.5 w-20 rounded-md" />
              <Skeleton className="h-2.5 w-28 rounded-md" />
            </div>
          </div>
        </aside>

        {/* Main Content Area Skeleton */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
          {/* Page Title & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div className="space-y-2">
              <Skeleton className="h-7 w-60 rounded-xl" />
              <Skeleton className="h-4 w-96 rounded-md" />
            </div>
            <div className="flex gap-2.5">
              <Skeleton className="h-10 w-28 rounded-xl" />
              <Skeleton className="h-10 w-36 rounded-xl" />
            </div>
          </div>

          {/* 4 Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-soft space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="w-9 h-9 rounded-xl" />
                </div>
                <Skeleton className="h-7 w-20 rounded-lg" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
            ))}
          </div>

          {/* Large Grid Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 shadow-soft space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-800">
                <Skeleton className="h-5 w-40 rounded-lg" />
                <Skeleton className="h-8 w-24 rounded-xl" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/70 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-36 rounded-md" />
                        <Skeleton className="h-3 w-24 rounded-md" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-8 w-20 rounded-xl" />
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 space-y-4">
              <SkeletonCard bodyLines={4} hasFooter />
              <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-soft space-y-3">
                <Skeleton className="h-4.5 w-32 rounded-md" />
                <SkeletonText lines={3} />
                <Skeleton className="h-9 w-full rounded-xl mt-2" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
