import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, Lock, ShieldCheck } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { TEXTS } from '../texts';
import { formatCurrency } from '../utils/formatters';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { HelpTip } from '../components/ui/HelpTip';
import { NoPasswordNotice, RiskWarningNotice } from '../components/ui/RiskBanner';

export function HowItWorksPage() {
  const { settings } = useApp();

  const steps = [
    {
      number: '01',
      title: 'Choose a verified trader',
      body: `Compare verified traders by real history (${settings.minHistoryMonths}+ months, ${settings.minTradeCount}+ trades), drawdown, and Shohoj Score.`,
    },
    {
      number: '02',
      title: 'Send a Request to Connect',
      body: `Enter your planned amount (from ${formatCurrency(settings.minDepositUsd)}) and preview exact profit shares before sending.`,
    },
    {
      number: '03',
      title: 'Agree & connect safely',
      body: 'Chat in-app, sign a locked agreement snapshot, and link your Exness MT5 account without master passwords.',
    },
    {
      number: '04',
      title: 'Share only new profit',
      body: `Settlements run ${settings.settlementPeriod} above your High-Water Mark. Pause or stop anytime under agreed rules.`,
    },
  ];

  return (
    <div className="max-w-5xl space-y-12">
      {/* Header */}
      <div className="space-y-4 max-w-2xl">
        <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">
          Simple & Transparent
        </p>
        <h1
          className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1]"
          style={{ textWrap: 'balance' }}
        >
          How Shohoj Trading <span className="text-emerald-400">works</span>
        </h1>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
          Your trading capital stays inside your own Exness MT5 account. Connect with verified
          traders under clear, written rules.
        </p>
      </div>

      {/* 4 Minimal Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {steps.map((step) => (
          <Card key={step.number} className="space-y-3">
            <span className="font-mono text-sm font-semibold text-emerald-400 tabular-nums">
              {step.number}
            </span>
            <h2 className="font-display text-xl font-semibold text-white">{step.title}</h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">{step.body}</p>
          </Card>
        ))}
      </div>

      {/* Core Safety Rules */}
      <Card padding="lg" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Key protection rules</h2>
            <p className="text-sm text-slate-400">Live limits read directly from platform Settings.</p>
          </div>
          <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" aria-hidden="true" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 inline-flex items-center gap-1">
              <span>High-Water Mark</span>
              <HelpTip term="High-water mark" explanation={TEXTS.helpTips.highWaterMark} />
            </p>
            <p className="font-mono text-xl font-bold text-white">New profit only</p>
            <p className="text-xs text-slate-400">
              {settings.platformCommissionPercent}% platform fee is taken from the Pro Trader share.
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-400 inline-flex items-center gap-1">
              <span>Default Drawdown Limit</span>
              <HelpTip term="Drawdown" explanation={TEXTS.helpTips.drawdown} />
            </p>
            <p className="font-mono text-xl font-bold text-emerald-400 tabular-nums">
              {settings.maxDrawdownPercent}% max
            </p>
            <p className="text-xs text-slate-400">
              Connections auto-pause if risk rules are crossed.
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-400 inline-flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span>Account Custody</span>
            </p>
            <p className="font-mono text-xl font-bold text-white">Exness MT5</p>
            <p className="text-xs text-slate-400">
              {settings.cancellationNoticeDays}-day stop notice · One-click access removal.
            </p>
          </div>
        </div>

        <NoPasswordNotice />
      </Card>

      {/* Clean Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Link to="/traders" className="w-full sm:w-auto">
          <Button size="lg" fullWidth>
            <span>Browse Verified Traders</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </Link>
        <Link to="/calculator" className="w-full sm:w-auto">
          <Button variant="secondary" size="lg" fullWidth>
            <Calculator className="w-4 h-4" aria-hidden="true" />
            <span>Open Profit Calculator</span>
          </Button>
        </Link>
      </div>

      <RiskWarningNotice full />
    </div>
  );
}
