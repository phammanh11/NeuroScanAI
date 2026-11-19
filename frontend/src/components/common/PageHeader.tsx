import React from 'react';

interface PageHeaderProps {
  badgeText?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  badgeText,
  title,
  description,
  actions,
}) => {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between pb-5 border-b border-slate-200 dark:border-slate-800">
      <div className="min-w-0 flex-1 space-y-1.5">
        {badgeText && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-teal-700 dark:text-teal-400">
            {badgeText}
          </p>
        )}
        <h1 className="text-2xl sm:text-[26px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2.5 xl:w-auto xl:max-w-[42rem] xl:shrink-0 xl:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
};
