import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  Lock,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { TEXTS } from '../texts';
import { formatCurrency } from '../utils/formatters';
import { calculateProfitSplit, fromCents } from '../utils/profitEngine';
import { computeShohojScore } from '../utils/shohojScore';
import { UserAvatar } from '../components/ui/Avatar';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { HelpTip } from '../components/ui/HelpTip';
import { RiskWarningNotice } from '../components/ui/RiskBanner';

export function LandingPage() {
  const { settings, publicApprovedTraders } = useApp();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [matchCapital, setMatchCapital] = useState<number>(Math.max(500, settings.minDepositUsd));
  const [matchRisk, setMatchRisk] = useState<'Low Risk' | 'Balanced' | 'Higher'>('Low Risk');

  const proNetShare = Math.max(
    0,
    settings.defaultProTraderSharePercent - settings.platformCommissionPercent
  );

  // Live trader ranking sorted by Shohoj Score (Top 3 only)
  const rankedTraders = useMemo(() => {
    return [...publicApprovedTraders]
      .map((trader) => ({
        ...trader,
        liveScore: computeShohojScore(trader, settings.shohojScoreWeights),
      }))
      .sort((a, b) => b.liveScore - a.liveScore)
      .slice(0, 3);
  }, [publicApprovedTraders, settings.shohojScoreWeights]);

  // Unique Business Feature: Smart Risk-Fit Matchmaker
  const matchedTrader = useMemo(() => {
    const scored = publicApprovedTraders
      .filter((t) => t.isOpenForRequests && t.activeConnectionsCount < t.maxConnections)
      .map((t) => ({
        ...t,
        liveScore: computeShohojScore(t, settings.shohojScoreWeights),
      }))
      .sort((a, b) => b.liveScore - a.liveScore);

    if (matchRisk === 'Low Risk') {
      return scored.find((t) => t.riskTags.includes('Low Risk')) ?? scored[0] ?? null;
    }
    if (matchRisk === 'Balanced') {
      return scored.find((t) => t.riskTags.includes('Balanced')) ?? scored[0] ?? null;
    }
    return (
      scored.find((t) => !t.riskTags.includes('Low Risk')) ?? scored[0] ?? null
    );
  }, [publicApprovedTraders, settings.shohojScoreWeights, matchRisk]);

  const matchExampleSplit = useMemo(() => {
    if (!matchedTrader) return null;
    const sampleProfit = Math.round(matchCapital * 0.1);
    return calculateProfitSplit({
      startingBalanceUsd: matchCapital,
      endingBalanceUsd: matchCapital + sampleProfit,
      depositsDuringPeriodUsd: 0,
      withdrawalsDuringPeriodUsd: 0,
      highWaterMarkUsd: matchCapital,
      proSharePercent: matchedTrader.askedProfitSharePercent,
      platformCommissionPercent: settings.platformCommissionPercent,
    });
  }, [matchedTrader, matchCapital, settings.platformCommissionPercent]);

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* Hero Section */}
      <section className="pt-4 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <h1
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] text-white"
              style={{ textWrap: 'balance' }}
            >
              {TEXTS.landing.heroTitleBefore}{' '}
              <span className="text-emerald-400">{TEXTS.landing.heroTitleHighlight}</span>{' '}
              {TEXTS.landing.heroTitleAfter}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
              {TEXTS.landing.heroSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Link to="/signup?role=new_trader" className="w-full sm:w-auto">
                <Button size="lg" fullWidth>
                  <span>{TEXTS.landing.ctaNewTrader}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link to="/signup?role=pro_trader" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" fullWidth>
                  <span>{TEXTS.landing.ctaProTrader}</span>
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400 pt-1">
              <span>{publicApprovedTraders.length} verified traders</span>
              <span aria-hidden="true">·</span>
              <span>Min deposit {formatCurrency(settings.minDepositUsd)}</span>
              <span aria-hidden="true">·</span>
              <span>Exness MT5</span>
            </div>
          </div>

          {/* Original 3D layered glass card visual */}
          <div className="lg:col-span-5 hero-card-stage flex justify-center">
            <div className="relative w-full max-w-md py-6">
              <div
                aria-hidden="true"
                className="ambient-glow-float absolute -inset-4 rounded-full bg-gradient-to-tr from-emerald-500/20 via-emerald-400/10 to-sky-500/20 blur-2xl"
              />

              <div className="relative space-y-3 hero-card-3d">
                {/* Back card */}
                <div className="mx-6 rounded-3xl p-5 border border-emerald-500/25 bg-gradient-to-br from-emerald-950/90 via-[#0d1f16]/90 to-[#0a131c]/90 text-white shadow-xl">
                  <div className="flex items-center justify-between text-xs text-emerald-300">
                    <span>Own account stays yours</span>
                    <span className="font-mono tabular-nums">Exness · MT5</span>
                  </div>
                  <p className="mt-2 font-display text-lg font-semibold">
                    {TEXTS.noPasswordRule}
                  </p>
                </div>

                {/* Front glossy card */}
                <div className="rounded-3xl p-6 border border-white/15 bg-gradient-to-br from-[#0e261a]/95 via-[#0a1611]/95 to-[#0a1420]/95 text-white shadow-2xl">
                  <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/10">
                    <div>
                      <p className="text-xs text-slate-400">Default profit split</p>
                      <p className="font-display text-xl font-bold text-white">
                        New realized profit only
                      </p>
                    </div>
                    <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" aria-hidden="true" />
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-4 text-center">
                    <div className="rounded-2xl bg-white/[0.04] p-3 border border-white/8">
                      <p className="text-xs text-slate-400">New Trader</p>
                      <p className="mt-1 font-mono text-lg font-semibold text-emerald-400 tabular-nums">
                        {settings.defaultNewTraderSharePercent}%
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.04] p-3 border border-white/8">
                      <p className="text-xs text-slate-400">Pro Trader</p>
                      <p className="mt-1 font-mono text-lg font-semibold text-white tabular-nums">
                        {proNetShare}%
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.04] p-3 border border-white/8">
                      <p className="text-xs text-slate-400">Platform</p>
                      <p className="mt-1 font-mono text-lg font-semibold text-sky-300 tabular-nums">
                        {settings.platformCommissionPercent}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <RiskWarningNotice />
        </div>
      </section>

      {/* Live Trader Ranking System directly on Home Page */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400">
              <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Live Ranking</span>
            </div>
            <h2
              className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-white"
              style={{ textWrap: 'balance' }}
            >
              Top 3 Verified <span className="text-emerald-400">Traders</span>
            </h2>
            <p className="mt-1 text-sm text-slate-400 inline-flex items-center gap-1.5 flex-wrap">
              <span>Ranked by live Shohoj Score (profit, risk control, and low drawdown).</span>
              <HelpTip term="Shohoj Score" explanation={TEXTS.helpTips.shohojScore} />
            </p>
          </div>

          <Link to="/traders">
            <Button variant="secondary" size="sm">
              <span>All {publicApprovedTraders.length} verified traders</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>

        <Card padding="sm" className="overflow-hidden">
          {rankedTraders.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">No verified traders available right now.</p>
          ) : (
            <>
              {/* Desktop sleek table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-xs font-medium text-slate-400">
                      <th className="py-3 px-4 w-16">Rank</th>
                      <th className="py-3 px-4">Trader</th>
                      <th className="py-3 px-4">Risk Tag</th>
                      <th className="py-3 px-4 text-right">Shohoj Score</th>
                      <th className="py-3 px-4 text-right">Growth</th>
                      <th className="py-3 px-4 text-right">Max Drawdown</th>
                      <th className="py-3 px-4 text-right">Share Asked</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8 text-sm">
                    {rankedTraders.map((trader, index) => {
                      const rank = index + 1;
                      const isLowRisk = trader.riskTags.includes('Low Risk');
                      const isHighRisk =
                        trader.riskTags.includes('Martingale') ||
                        trader.riskTags.includes('Grid') ||
                        trader.riskTags.includes('No stop loss');

                      return (
                        <tr
                          key={trader.id}
                          className="hover:bg-white/[0.03] transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-mono text-xs font-bold tabular-nums ${
                                rank === 1
                                  ? 'bg-emerald-400 text-slate-950'
                                  : rank <= 3
                                  ? 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/30'
                                  : 'bg-white/6 text-slate-300 border border-white/10'
                              }`}
                            >
                              #{rank}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                src={trader.avatarUrl}
                                name={trader.displayName}
                                color={trader.avatarColor}
                                size="sm"
                              />
                              <div>
                                <p className="font-semibold text-white">{trader.displayName}</p>
                                <p className="text-xs text-slate-400">
                                  {trader.tradingStyle} · {trader.country}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge
                              tone={isHighRisk ? 'warning' : isLowRisk ? 'success' : 'info'}
                              label={trader.riskTags[0] ?? 'Balanced'}
                            />
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 tabular-nums">
                            {trader.liveScore}/100
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-white tabular-nums">
                            +{trader.ownAccountStats.accountGrowthPercent}%
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-300 tabular-nums">
                            {trader.ownAccountStats.maxDrawdownPercent}%
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-300 tabular-nums">
                            {trader.askedProfitSharePercent}%
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link
                              to={`/traders/${trader.id}`}
                              className="inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold bg-white/8 text-white hover:bg-emerald-400 hover:text-slate-950 transition-colors"
                            >
                              <span>View</span>
                              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile ranking cards */}
              <div className="md:hidden divide-y divide-white/10">
                {rankedTraders.map((trader, index) => {
                  const rank = index + 1;
                  return (
                    <Link
                      key={trader.id}
                      to={`/traders/${trader.id}`}
                      className="flex items-center justify-between gap-3 p-4 hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-mono text-xs font-bold shrink-0 ${
                            rank === 1
                              ? 'bg-emerald-400 text-slate-950'
                              : 'bg-white/8 text-emerald-300'
                          }`}
                        >
                          #{rank}
                        </span>
                        <UserAvatar
                          src={trader.avatarUrl}
                          name={trader.displayName}
                          color={trader.avatarColor}
                          size="xs"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{trader.displayName}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {trader.tradingStyle} · {trader.ownAccountStats.maxDrawdownPercent}% DD
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
                          {trader.liveScore}/100
                        </p>
                        <p className="text-xs font-mono text-slate-300 tabular-nums">
                          +{trader.ownAccountStats.accountGrowthPercent}%
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        <p className="text-xs text-slate-400">{TEXTS.riskWarningShort}</p>
      </section>

      {/* Unique Business Feature: Smart Risk-Fit Matchmaker */}
      {matchedTrader && matchExampleSplit && (
        <section className="space-y-4">
          <Card padding="lg" className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Smart Risk-Fit Match</span>
                </div>
                <h2 className="font-display text-2xl font-bold text-white">
                  Find your matched trader in <span className="text-emerald-400">2 clicks</span>
                </h2>
                <p className="text-sm text-slate-400">
                  Pick your planned Exness balance and comfort level to preview the best-fit
                  verified trader and exact profit split before sending a request.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                    Capital
                  </p>
                  <div className="flex gap-1.5">
                    {[
                      Math.max(500, settings.minDepositUsd),
                      1500,
                      5000,
                    ].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setMatchCapital(amt)}
                        className={`min-h-[38px] px-3.5 rounded-full text-xs font-mono font-semibold transition-colors cursor-pointer ${
                          matchCapital === amt
                            ? 'bg-emerald-400 text-slate-950'
                            : 'bg-white/6 text-slate-300 border border-white/10 hover:bg-white/12'
                        }`}
                      >
                        {formatCurrency(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                    Risk Comfort
                  </p>
                  <div className="flex gap-1.5">
                    {(['Low Risk', 'Balanced', 'Higher'] as const).map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setMatchRisk(tier)}
                        className={`min-h-[38px] px-3.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                          matchRisk === tier
                            ? 'bg-emerald-400 text-slate-950'
                            : 'bg-white/6 text-slate-300 border border-white/10 hover:bg-white/12'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
              <div className="md:col-span-5 flex items-center gap-3.5">
                <UserAvatar
                  src={matchedTrader.avatarUrl}
                  name={matchedTrader.displayName}
                  color={matchedTrader.avatarColor}
                  size="md"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg font-bold text-white">
                      {matchedTrader.displayName}
                    </p>
                    <StatusBadge
                      tone="success"
                      label={`Score ${matchedTrader.liveScore}/100`}
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    {matchedTrader.tradingStyle} · {matchedTrader.ownAccountStats.maxDrawdownPercent}%
                    max drawdown · {matchedTrader.askedProfitSharePercent}% Pro share
                  </p>
                </div>
              </div>

              <div className="md:col-span-4 grid grid-cols-3 gap-2 text-center border-y md:border-y-0 md:border-x border-white/10 py-3 md:py-0 md:px-4">
                <div>
                  <p className="text-[11px] text-slate-400">Sample +10%</p>
                  <p className="font-mono text-sm font-bold text-white tabular-nums">
                    {formatCurrency(Math.round(matchCapital * 0.1))}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">
                    You keep ({matchExampleSplit.newTraderSharePercent}%)
                  </p>
                  <p className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
                    {formatCurrency(fromCents(matchExampleSplit.newTraderCents))}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">
                    Pro / Fee
                  </p>
                  <p className="font-mono text-sm font-bold text-slate-300 tabular-nums">
                    {formatCurrency(fromCents(matchExampleSplit.proNetCents))} /{' '}
                    {formatCurrency(fromCents(matchExampleSplit.platformCommissionCents))}
                  </p>
                </div>
              </div>

              <div className="md:col-span-3 flex justify-end">
                <Link to={`/traders/${matchedTrader.id}`} className="w-full md:w-auto">
                  <Button size="sm" fullWidth>
                    <span>View Matched Trader</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Example math only (based on a sample +10% return above High-Water Mark).{' '}
              {TEXTS.riskWarningShort}
            </p>
          </Card>
        </section>
      )}

      {/* 4 Minimal Steps */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <h2
            className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white"
            style={{ textWrap: 'balance' }}
          >
            How it works in <span className="text-emerald-400">4 steps</span>
          </h2>
          <Link
            to="/how-it-works"
            className="text-sm font-medium text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
          >
            <span>Read full guide</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEXTS.landing.steps.map((step) => (
            <Card key={step.number} className="space-y-2">
              <p className="font-mono text-xs font-semibold text-emerald-400 tabular-nums">
                {step.number}
              </p>
              <h3 className="font-display text-base font-semibold text-white">{step.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Compact Safety & Rules Strip */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            icon: <UserCheck className="w-4 h-4 text-emerald-400" />,
            title: TEXTS.landing.notItems[0].title,
            desc: TEXTS.landing.notItems[0].description,
          },
          {
            icon: <Wallet className="w-4 h-4 text-emerald-400" />,
            title: TEXTS.landing.notItems[1].title,
            desc: TEXTS.landing.notItems[1].description,
          },
          {
            icon: <Lock className="w-4 h-4 text-emerald-400" />,
            title: TEXTS.landing.notItems[2].title,
            desc: TEXTS.landing.notItems[2].description,
          },
          {
            icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
            title: TEXTS.landing.notItems[3].title,
            desc: TEXTS.landing.notItems[3].description,
          },
        ].map((item) => (
          <Card key={item.title} padding="sm" className="flex items-start gap-3.5">
            <div className="h-9 w-9 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center shrink-0">
              {item.icon}
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-white">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{item.desc}</p>
            </div>
          </Card>
        ))}
      </section>

      {/* Live Rules Snapshot */}
      <Card padding="lg" className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              Transparent rules from Settings
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Fees apply only to new realized profit above your past peak.
            </p>
          </div>
          <Link to="/calculator">
            <Button variant="secondary" size="sm">
              <span>Profit Calculator</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div>
            <p className="text-xs text-slate-400 inline-flex items-center gap-1">
              <span>Commission</span>
              <HelpTip term="Commission" explanation={TEXTS.helpTips.commission} />
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
              {settings.platformCommissionPercent}%
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400 inline-flex items-center gap-1">
              <span>Max drawdown</span>
              <HelpTip term="Drawdown" explanation={TEXTS.helpTips.drawdown} />
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
              {settings.maxDrawdownPercent}%
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">Min trader history</p>
            <p className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
              {settings.minHistoryMonths} mo · {settings.minTradeCount} trades
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400 inline-flex items-center gap-1">
              <span>Settlement</span>
              <HelpTip term="High-water mark" explanation={TEXTS.helpTips.highWaterMark} />
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-white capitalize">
              {settings.settlementPeriod}
            </p>
          </div>
        </div>
      </Card>

      {/* Compact FAQ Section */}
      <section className="space-y-4 max-w-3xl">
        <h2 className="font-display text-2xl font-bold tracking-tight text-white">
          {TEXTS.landing.faqTitle}
        </h2>

        <div className="space-y-2.5">
          {TEXTS.landing.faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <Card key={faq.q} padding="sm">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="w-full min-h-[44px] flex items-center justify-between gap-4 text-left font-display text-base font-semibold text-white cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 shrink-0 text-slate-400 transition-transform duration-150 ${
                      isOpen ? 'rotate-180 text-emerald-400' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <p className="pt-3 mt-3 border-t border-white/10 text-sm text-slate-300 leading-relaxed">
                    {faq.a}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
