import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { TEXTS } from '../../texts';
import { useApp } from '../../store/AppContext';

export function PrototypeBanner() {
  return (
    <div className="w-full border-b border-slate-200/80 dark:border-white/8 bg-slate-100/90 dark:bg-[#09120e]/90 px-4 py-1.5 text-center text-xs text-slate-600 dark:text-slate-300">
      <span>{TEXTS.prototypeBanner}</span>
    </div>
  );
}

export function RiskWarningNotice({ full = false }: { full?: boolean }) {
  const { settings } = useApp();
  const message = full ? settings.riskWarningText || TEXTS.riskWarningFull : TEXTS.riskWarningShort;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}

export function NoPasswordNotice() {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-2.5 text-sm text-emerald-800 dark:text-emerald-200">
      <ShieldAlert className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
      <span>{TEXTS.noPasswordRule}</span>
    </div>
  );
}
