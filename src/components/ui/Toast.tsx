import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useApp } from '../../store/AppContext';

export function ToastStack() {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)]"
    >
      {toasts.map((toast) => {
        const icon =
          toast.tone === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true" />
          ) : toast.tone === 'error' || toast.tone === 'warning' ? (
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
          ) : (
            <Info className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />
          );

        return (
          <div
            key={toast.id}
            className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm bg-white text-slate-900 border border-slate-200 shadow-lg dark:bg-[#0d1612] dark:text-white dark:border-white/15"
          >
            <div className="flex items-center gap-2.5">
              {icon}
              <span>{toast.title}</span>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
