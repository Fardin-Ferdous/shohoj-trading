import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ExternalLink, ShieldCheck } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { TEXTS } from '../../texts';
import { Button } from './Button';
import { Card } from './Card';
import { Modal } from './Modal';
import { NoPasswordNotice } from './RiskBanner';

interface ExnessDirectCardProps {
  traderName?: string;
  accountMasked?: string;
  accessMethod?: string;
  mode: 'public_trader' | 'own_new_trader' | 'own_pro_trader';
}

export function ExnessDirectCard({
  traderName,
  accountMasked,
  accessMethod,
  mode,
}: ExnessDirectCardProps) {
  const { currentRole } = useApp();
  const [modalOpen, setModalOpen] = useState(false);

  const heading =
    mode === 'public_trader'
      ? `Connect via Exness MT5${traderName ? ` with ${traderName}` : ''}`
      : 'Open your Exness MT5 account';

  const subtitle =
    mode === 'public_trader'
      ? 'Your trading money stays inside your own Exness account. Only approved broker links are used.'
      : 'Go directly to Exness to check your real MT5 account ID, balance, or broker access settings.';

  const linkTarget = currentRole === 'pro_trader' ? '/profile-editor' : '/profile';

  return (
    <>
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <h3 className="font-display text-base font-semibold text-slate-950 dark:text-white">
              {heading}
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              · {TEXTS.exnessMethodTag}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
          {(accountMasked || accessMethod) && (
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {accountMasked ? `Linked: ${accountMasked}` : ''}
              {accountMasked && accessMethod ? ' · ' : ''}
              {accessMethod ?? ''}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {mode === 'public_trader' && (
            <Link to={linkTarget}>
              <Button variant="secondary" size="sm">
                <span>Link my Exness MT5</span>
              </Button>
            </Link>
          )}
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <span>Direct to Exness</span>
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Go to Exness Account Portal"
      >
        <div className="space-y-4">
          <NoPasswordNotice />

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <p className="font-semibold text-slate-950 dark:text-white">
              What happens at Exness ({TEXTS.prototypeExampleTag})
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>Sign in directly on the official Exness website (never enter Exness passwords here).</li>
              <li>Open your MT5 Real account details or broker-approved management / copy link.</li>
              <li>You keep full control and can stop access at any time.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Stay in prototype
            </Button>
            <a
              href="https://my.exness.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setModalOpen(false)}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 dark:bg-emerald-400 dark:hover:bg-emerald-300 transition-colors"
            >
              <span>Continue to Exness</span>
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </Modal>
    </>
  );
}
