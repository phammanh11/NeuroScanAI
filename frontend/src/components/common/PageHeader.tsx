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
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
      <div className="min-w-0 flex-1 space-y-1.5">
        {badgeText && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            {badgeText}
          </span>
        )}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
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
