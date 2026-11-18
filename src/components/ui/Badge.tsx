import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Info, XCircle } from 'lucide-react';
import { cn } from '../../utils/formatters';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  tone?: StatusTone;
  label: string;
  className?: string;
}

const TONE_STYLE: Record<StatusTone, string> = {
  success:
    'text-emerald-700 bg-emerald-500/10 border-emerald-500/25 dark:text-emerald-300 dark:bg-emerald-400/10 dark:border-emerald-400/25',
  warning:
    'text-amber-700 bg-amber-500/10 border-amber-500/25 dark:text-amber-300 dark:bg-amber-400/10 dark:border-amber-400/25',
  danger:
    'text-red-700 bg-red-500/10 border-red-500/25 dark:text-red-300 dark:bg-red-400/10 dark:border-red-400/25',
  info:
    'text-sky-700 bg-sky-500/10 border-sky-500/25 dark:text-sky-300 dark:bg-sky-400/10 dark:border-sky-400/25',
  neutral:
    'text-slate-700 bg-slate-500/10 border-slate-500/20 dark:text-slate-300 dark:bg-white/6 dark:border-white/15',
};

const TONE_ICON: Record<StatusTone, React.ReactNode> = {
  success: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  danger: <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  info: <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  neutral: <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
};

export function StatusBadge({ tone = 'neutral', label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shrink-0',
        TONE_STYLE[tone],
        className
      )}
    >
      {TONE_ICON[tone]}
      <span>{label}</span>
    </span>
  );
}
