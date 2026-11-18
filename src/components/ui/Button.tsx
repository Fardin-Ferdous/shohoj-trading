import React from 'react';
import { cn } from '../../utils/formatters';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 active:bg-emerald-500 shadow-[0_0_24px_rgba(74,222,128,0.22)] dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300',
  secondary:
    'bg-slate-900/5 text-slate-900 border border-slate-300 hover:bg-slate-900/10 dark:bg-white/6 dark:text-white dark:border-white/15 dark:hover:bg-white/12',
  ghost:
    'bg-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/8',
  danger:
    'bg-red-500/12 text-red-700 border border-red-500/30 hover:bg-red-500/20 dark:text-red-300 dark:border-red-400/30',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-4 py-2 text-sm',
  md: 'min-h-[44px] px-6 py-2.5 text-sm sm:text-base',
  lg: 'min-h-[48px] px-7 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
