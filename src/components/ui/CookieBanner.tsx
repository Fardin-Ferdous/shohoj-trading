import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { readStorage, writeStorage } from '../../data/storage';
import { Button } from './Button';

const COOKIE_KEY = 'cookie_notice_accepted';

export function CookieBanner() {
  const [accepted, setAccepted] = useState<boolean>(() => readStorage<boolean>(COOKIE_KEY, false));

  if (accepted) return null;

  const handleAccept = () => {
    writeStorage<boolean>(COOKIE_KEY, true);
    setAccepted(true);
  };

  return (
    <div
      role="region"
      aria-label="Cookie and privacy notice"
      className="fixed bottom-16 md:bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-40 rounded-2xl border border-white/15 bg-[#0a130f]/95 backdrop-blur-xl p-4 shadow-2xl space-y-3"
    >
      <div className="flex items-start gap-2.5">
        <Cookie className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-white">Simple privacy &amp; cookie notice</p>
          <p className="text-xs text-slate-300 leading-relaxed">
            Shohoj Trading uses browser storage only to save your demo session and preferences. Read our{' '}
            <Link to="/legal/privacy" className="text-emerald-400 underline hover:text-emerald-300">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Link
          to="/legal/privacy"
          className="min-h-[38px] inline-flex items-center px-3 text-xs font-medium text-slate-300 hover:text-white"
        >
          Learn more
        </Link>
        <Button size="sm" onClick={handleAccept}>
          Got it
        </Button>
      </div>
    </div>
  );
}
