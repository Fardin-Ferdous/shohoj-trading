import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { TEXTS } from '../texts';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { computeShohojScore, hasRiskyStyle, RISKY_TAGS } from '../utils/shohojScore';
import { TraderPerformanceCharts } from '../components/charts/TraderPerformanceCharts';
import { UserAvatar } from '../components/ui/Avatar';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ExnessDirectCard } from '../components/ui/ExnessDirectCard';
import { HelpTip } from '../components/ui/HelpTip';
import { RiskWarningNotice } from '../components/ui/RiskBanner';
import { EmptyState } from '../components/ui/States';
import { Tabs } from '../components/ui/Tabs';

export function TraderProfilePage() {
  const { traderId } = useParams<{ traderId: string }>();
  const navigate = useNavigate();
  const { db, settings } = useApp();
  const [accountTab, setAccountTab] = useState<'own' | 'managed'>('own');

  const profile = db.traderProfiles.find((p) => p.id === traderId);

  if (!profile) {
    return (
      <EmptyState
        title="Trader not found"
        message="This trader profile may have been removed or is not available."
        actionLabel="Browse traders"
        onAction={() => navigate('/traders')}
      />
    );
  }

  const liveScore = computeShohojScore(profile, settings.shohojScoreWeights);
  const stats = accountTab === 'own' ? profile.ownAccountStats : profile.managedAccountStats;
  const isRisky = hasRiskyStyle(profile);
  const newTraderShare = 100 - profile.askedProfitSharePercent;
  const proNetShare = Math.max(
    0,
    profile.askedProfitSharePercent - settings.platformCommissionPercent
  );

  return (
    <div className="space-y-6">
      <Link
        to="/traders"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Back to traders</span>
      </Link>

      {/* Header Card */}
      <Card padding="lg" className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <UserAvatar
              src={profile.avatarUrl}
              name={profile.displayName}
              color={profile.avatarColor}
              size="lg"
            />

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
                  {profile.displayName}
                </h1>
                {profile.isApproved ? (
                  <StatusBadge tone="success" label="Verified by Shohoj Trading" />
                ) : (
                  <StatusBadge tone="warning" label="Not yet public" />
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {profile.tradingStyle} · {profile.country} ·{' '}
                {profile.isOpenForRequests ? 'Open for requests' : 'Currently closed'}
              </p>
              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 max-w-2xl">
                {profile.bio}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 px-4 py-2.5 bg-slate-50/70 dark:bg-white/[0.03]">
              <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                <span>Shohoj Score</span>
                <HelpTip term="Shohoj Score" explanation={TEXTS.helpTips.shohojScore} />
              </span>
              <span className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {liveScore}
              </span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>

            <Button
              size="lg"
              disabled={!profile.isOpenForRequests || !profile.isApproved}
              onClick={() => navigate(`/requests?trader=${profile.id}`)}
            >
              <span>Request to Connect</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Risk Tags & Profit Split Summary */}
        <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {profile.riskTags.map((tag) => {
              const risky = (RISKY_TAGS as readonly string[]).includes(tag);
              return (
                <StatusBadge
                  key={tag}
                  tone={risky ? 'danger' : tag === 'Low Risk' ? 'success' : 'info'}
                  label={tag}
                />
              );
            })}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Active connections: {profile.activeConnectionsCount} / {profile.maxConnections}
            </span>
          </div>

          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-mono tabular-nums">
            Split: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{newTraderShare}% You</span>{' '}
            · {proNetShare}% Pro · {settings.platformCommissionPercent}% Platform
          </div>
        </div>

        {isRisky && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-700 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              High-risk trading alert: This trader uses {profile.riskTags.join(', ')}. Losses can grow fast during strong market trends.
            </span>
          </div>
        )}
      </Card>

      <RiskWarningNotice full />

      {/* Verified Source Lock Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>
            Numbers come from the broker or an approved source. Traders cannot type their own numbers.
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium shrink-0">
          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Data source: {stats.dataSource}</span>
        </span>
      </div>

      {/* Direct to Exness Account Option */}
      <ExnessDirectCard
        mode="public_trader"
        traderName={profile.displayName}
        accountMasked={profile.proAccountLink?.accountNumberMasked}
        accessMethod={profile.proAccountLink?.accessMethod}
      />

      {/* Own vs Managed Results Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs<'own' | 'managed'>
          value={accountTab}
          onChange={setAccountTab}
          options={[
            { value: 'own', label: 'Own account results' },
            { value: 'managed', label: 'Managed accounts results' },
          ]}
        />
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          Results can differ because of balance, lot size and timing.
        </p>
      </div>

      {/* Full Metrics Grid */}
      <Card padding="lg" className="space-y-4">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
          <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
            {accountTab === 'own' ? 'Own account metrics' : 'Managed accounts metrics'}
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Data source: {stats.dataSource}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
              <span>Account growth</span>
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatPercent(stats.accountGrowthPercent, true)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
              <span>Max drawdown</span>
              <HelpTip term="Drawdown" explanation={TEXTS.helpTips.drawdown} />
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">
              -{stats.maxDrawdownPercent.toFixed(1)}%
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
              <span>Profit factor</span>
              <HelpTip term="Profit factor" explanation={TEXTS.helpTips.profitFactor} />
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-slate-950 dark:text-white tabular-nums">
              {stats.profitFactor.toFixed(2)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
              <span>Win rate</span>
              <HelpTip term="Win rate" explanation={TEXTS.helpTips.winRate} />
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-slate-950 dark:text-white tabular-nums">
              {stats.winRatePercent.toFixed(1)}%
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total profit</p>
            <p className="mt-1 font-mono text-lg font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatCurrency(stats.totalProfitUsd)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total loss</p>
            <p className="mt-1 font-mono text-lg font-semibold text-red-600 dark:text-red-400 tabular-nums">
              -{formatCurrency(stats.totalLossUsd)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Number of trades</p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-950 dark:text-white tabular-nums">
              {stats.tradeCount}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">History length</p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-950 dark:text-white tabular-nums">
              {stats.historyMonths} months
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Average win</p>
            <p className="mt-1 font-mono text-base font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatCurrency(stats.avgWinUsd)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Average loss</p>
            <p className="mt-1 font-mono text-base font-semibold text-red-600 dark:text-red-400 tabular-nums">
              -{formatCurrency(stats.avgLossUsd)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Avg holding time</p>
            <p className="mt-1 font-mono text-base font-semibold text-slate-950 dark:text-white tabular-nums">
              {stats.avgHoldingHours} hours
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Leverage used</p>
            <p className="mt-1 font-mono text-base font-semibold text-slate-950 dark:text-white tabular-nums">
              {stats.leverageUsed}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Instruments: {profile.instruments.join(' · ')}</span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
            <span>Data source: {stats.dataSource}</span>
          </span>
        </div>
      </Card>

      {/* 4 Charts */}
      <TraderPerformanceCharts
        profile={profile}
        accountTab={accountTab}
        stats={stats}
      />
    </div>
  );
}
