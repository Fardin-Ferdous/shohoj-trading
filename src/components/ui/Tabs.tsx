import React from 'react';
import { cn } from '../../utils/formatters';

export interface TabOption<T extends string> {
  value: T;
  label: string;
}

interface TabsProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

export function Tabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel = 'View options',
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap items-center gap-1 p-1 rounded-full bg-slate-900/5 border border-slate-200 dark:bg-white/5 dark:border-white/10"
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              'min-h-[40px] px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer',
              isActive
                ? 'bg-emerald-500 text-slate-950 dark:bg-emerald-400 dark:text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
