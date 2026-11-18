import React from 'react';
import { Check, Circle } from 'lucide-react';
import { evaluatePasswordStrength } from '../../utils/validators';
import { cn } from '../../utils/formatters';

export function PasswordStrengthMeter({ password }: { password: string }) {
  const result = evaluatePasswordStrength(password);

  const barColors = [
    'bg-slate-300 dark:bg-white/10',
    'bg-red-500',
    'bg-amber-500',
    'bg-sky-400',
    'bg-emerald-500 dark:bg-emerald-400',
  ];

  const rules = [
    { label: 'At least 8 characters', met: result.checks.minLength },
    { label: 'One uppercase letter (A-Z)', met: result.checks.hasUpper },
    { label: 'One lowercase letter (a-z)', met: result.checks.hasLower },
    { label: 'One number (0-9)', met: result.checks.hasNumber },
    { label: 'One special symbol (!@#)', met: result.checks.hasSymbol },
  ];

  return (
    <div className="space-y-2.5 pt-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">Password strength</span>
        <span
          className={cn(
            'font-semibold',
            result.score >= 3
              ? 'text-emerald-600 dark:text-emerald-400'
              : result.score === 2
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-600 dark:text-slate-300'
          )}
        >
          {result.label}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={cn(
              'h-1.5 rounded-full transition-colors',
              result.score >= step ? barColors[result.score] : 'bg-slate-200 dark:bg-white/10'
            )}
          />
        ))}
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-600 dark:text-slate-400">
        {rules.map((r) => (
          <li key={r.label} className="flex items-center gap-1.5">
            {r.met ? (
              <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            ) : (
              <Circle className="w-3 h-3 text-slate-400 dark:text-slate-600 shrink-0" aria-hidden="true" />
            )}
            <span className={r.met ? 'text-slate-800 dark:text-slate-200' : ''}>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
