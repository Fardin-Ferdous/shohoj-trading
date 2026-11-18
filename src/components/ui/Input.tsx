import React from 'react';
import { cn } from '../../utils/formatters';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, id, className, ...rest }: InputProps) {
  const inputId = id ?? `input-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-slate-800 dark:text-slate-200"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          'min-h-[44px] w-full rounded-full px-5 py-2.5 text-base transition-colors',
          'bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300',
          'dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:border-white/15',
          'focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400',
          error && 'border-red-500 dark:border-red-400',
          className
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-red-600 dark:text-red-400 px-2">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-slate-500 dark:text-slate-400 px-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
