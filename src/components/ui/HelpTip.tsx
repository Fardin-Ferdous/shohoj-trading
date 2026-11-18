import React, { useEffect, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTipProps {
  term: string;
  explanation: string;
}

export function HelpTip({ term, explanation }: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <span ref={containerRef} className="relative inline-flex items-center align-middle">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Explain ${term}`}
        aria-expanded={open}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors cursor-pointer"
      >
        <HelpCircle className="w-4 h-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute left-0 bottom-full mb-2 z-40 w-64 rounded-2xl p-3.5 text-sm shadow-xl bg-white text-slate-800 border border-slate-200 dark:bg-[#0d1612] dark:text-slate-100 dark:border-white/15"
        >
          <p className="font-semibold text-slate-900 dark:text-white mb-1">{term}</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{explanation}</p>
        </div>
      )}
    </span>
  );
}
