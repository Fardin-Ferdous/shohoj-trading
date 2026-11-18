import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  FlaskConical,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../store/AppContext';
import { TEXTS } from '../texts';
import { formatCurrency } from '../utils/formatters';
import {
  calculateProfitSplit,
  fromCents,
  runProfitEngineSelfTests,
} from '../utils/profitEngine';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { HelpTip } from '../components/ui/HelpTip';
import { Input } from '../components/ui/Input';
import { RiskWarningNotice } from '../components/ui/RiskBanner';

export function ProfitCalculatorPage() {
  const { settings, publicApprovedTraders, theme } = useApp();

  const [selectedTraderId, setSelectedTraderId] = useState<string>('custom');
  const [startingBalance, setStartingBalance] = useState<string>('1000');
  const [endingBalance, setEndingBalance] = useState<string>('1400');
  const [deposits, setDeposits] = useState<string>('0');
  const [withdrawals, setWithdrawals] = useState<string>('0');
  const [previousHwm, setPreviousHwm] = useState<string>('1000');
  const [proSharePercent, setProSharePercent] = useState<number>(
    settings.defaultProTraderSharePercent
  );
  const [showSelfTests, setShowSelfTests] = useState<boolean>(false);

  const selectedTrader = useMemo(
    () => publicApprovedTraders.find((t) => t.id === selectedTraderId),
    [publicApprovedTraders, selectedTraderId]
  );

  const handleSelectTrader = (id: string) => {
    setSelectedTraderId(id);
    const match = publicApprovedTraders.find((t) => t.id === id);
    if (match) {
      setProSharePercent(match.askedProfitSharePercent);
    } else {
      setProSharePercent(settings.defaultProTraderSharePercent);
    }
  };

  const applyScenario = (
    key: 'profit' | 'loss' | 'recovery_below' | 'deposit' | 'withdrawal'
  ) => {
    if (key === 'profit') {
      setStartingBalance('1000');
      setEndingBalance('1500');
      setDeposits('0');
      setWithdrawals('0');
      setPreviousHwm('1000');
    } else if (key === 'loss') {
      setStartingBalance('1000');
      setEndingBalance('820');
      setDeposits('0');
      setWithdrawals('0');
      setPreviousHwm('1000');
    } else if (key === 'recovery_below') {
      setStartingBalance('820');
      setEndingBalance('960');
      setDeposits('0');
      setWithdrawals('0');
      setPreviousHwm('1000');
    } else if (key === 'deposit') {
      setStartingBalance('1000');
      setEndingBalance('1650');
      setDeposits('500');
      setWithdrawals('0');
      setPreviousHwm('1000');
    } else {
      setStartingBalance('1000');
      setEndingBalance('950');
      setDeposits('0');
      setWithdrawals('250');
      setPreviousHwm('1000');
    }
  };

  const result = useMemo(
    () =>
      calculateProfitSplit({
        startingBalanceUsd: Number(startingBalance) || 0,
        endingBalanceUsd: Number(endingBalance) || 0,
        depositsDuringPeriodUsd: Number(deposits) || 0,
        withdrawalsDuringPeriodUsd: Number(withdrawals) || 0,
        highWaterMarkUsd: Number(previousHwm) || 0,
        proSharePercent,
        platformCommissionPercent: settings.platformCommissionPercent,
      }),
    [
      startingBalance,
      endingBalance,
      deposits,
      withdrawals,
      previousHwm,
      proSharePercent,
      settings.platformCommissionPercent,
    ]
  );

  const selfTestResults = useMemo(
    () => runProfitEngineSelfTests(settings),
    [settings]
  );
  const allTestsPassed = selfTestResults.every((t) => t.passed);

  const chartData = [
    {
      name: `New Trader (${result.newTraderSharePercent}%)`,
      usd: fromCents(result.newTraderCents),
      color: '#22c55e',
    },
    {
      name: `Pro Trader (${result.proNetSharePercent}%)`,
      usd: fromCents(result.proNetCents),
      color: '#0ea5e9',
    },
    {
      name: `Platform (${result.platformCommissionPercent}%)`,
      usd: fromCents(result.platformCommissionCents),
      color: '#f59e0b',
    },
  ];

  const tickColor = theme === 'dark' ? '#94a3b8' : '#475569';
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
  const tooltipBg = theme === 'dark' ? '#0d1612' : '#ffffff';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Clear Profit & Commission Math
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            {TEXTS.calculator.title}
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl">
            {TEXTS.calculator.subtitle}
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowSelfTests((prev) => !prev)}
        >
          <FlaskConical className="w-4 h-4 text-emerald-500" aria-hidden="true" />
          <span>
            {showSelfTests
              ? 'Hide Engine Self-Tests'
              : `Engine Self-Tests (${selfTestResults.filter((t) => t.passed).length}/${
                  selfTestResults.length
                } Pass)`}
          </span>
        </Button>
      </div>

      <RiskWarningNotice />

      {/* Preset Scenario Chips */}
      <Card padding="sm" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Try a quick example scenario:
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Settlement period in Settings:{' '}
            <strong className="capitalize text-slate-900 dark:text-white">
              {settings.settlementPeriod}
            </strong>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyScenario('profit')}
            className="min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-medium border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 hover:bg-emerald-500/10 hover:border-emerald-500/40 cursor-pointer transition-colors"
          >
            New profit (+$500)
          </button>
          <button
            type="button"
            onClick={() => applyScenario('loss')}
            className="min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-medium border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 hover:bg-red-500/10 hover:border-red-500/40 cursor-pointer transition-colors"
          >
            Loss month (-$180)
          </button>
          <button
            type="button"
            onClick={() => applyScenario('recovery_below')}
            className="min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-medium border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 hover:bg-sky-500/10 hover:border-sky-500/40 cursor-pointer transition-colors"
          >
            Recovery below peak (no fee)
          </button>
          <button
            type="button"
            onClick={() => applyScenario('deposit')}
            className="min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-medium border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            Deposit added mid-month (+$500)
          </button>
          <button
            type="button"
            onClick={() => applyScenario('withdrawal')}
            className="min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-medium border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            Withdrawal mid-month (-$250)
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Inputs */}
        <Card padding="lg" className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
            <Calculator className="w-5 h-5 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
              Account & Split Inputs
            </h2>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="calc-trader"
              className="text-sm font-medium text-slate-800 dark:text-slate-200"
            >
              Load a verified trader&apos;s profit share (optional)
            </label>
            <select
              id="calc-trader"
              value={selectedTraderId}
              onChange={(e) => handleSelectTrader(e.target.value)}
              className="min-h-[44px] w-full rounded-full px-4 py-2 text-sm bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
            >
              <option value="custom" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">
                Platform default ({settings.defaultProTraderSharePercent}% Pro share)
              </option>
              {publicApprovedTraders.map((t) => (
                <option
                  key={t.id}
                  value={t.id}
                  className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white"
                >
                  {t.displayName} · {t.askedProfitSharePercent}% share asked
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Starting balance ($)"
              type="number"
              min={0}
              step="0.01"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
            />
            <Input
              label="Ending balance ($)"
              type="number"
              min={0}
              step="0.01"
              value={endingBalance}
              onChange={(e) => setEndingBalance(e.target.value)}
            />
            <Input
              label="Deposits added ($)"
              type="number"
              min={0}
              step="0.01"
              value={deposits}
              onChange={(e) => setDeposits(e.target.value)}
              hint="Not counted as profit"
            />
            <Input
              label="Withdrawals taken ($)"
              type="number"
              min={0}
              step="0.01"
              value={withdrawals}
              onChange={(e) => setWithdrawals(e.target.value)}
              hint="Not counted as loss"
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label
                htmlFor="calc-hwm"
                className="text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                Previous High-Water Mark ($)
              </label>
              <HelpTip term="High-Water Mark" explanation={TEXTS.helpTips.highWaterMark} />
            </div>
            <input
              id="calc-hwm"
              type="number"
              min={0}
              step="0.01"
              value={previousHwm}
              onChange={(e) => setPreviousHwm(e.target.value)}
              className="min-h-[44px] w-full rounded-full px-5 py-2.5 text-base bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Pro share slider */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-2.5 bg-slate-50/70 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="calc-pro-share"
                className="text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                Pro Trader share ({settings.minProSharePercent}% – {settings.maxProSharePercent}%)
              </label>
              <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                {proSharePercent}%
              </span>
            </div>
            <input
              id="calc-pro-share"
              type="range"
              min={settings.minProSharePercent}
              max={settings.maxProSharePercent}
              step={1}
              value={proSharePercent}
              onChange={(e) => {
                setSelectedTraderId('custom');
                setProSharePercent(Number(e.target.value));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Platform commission ({settings.platformCommissionPercent}% from Settings) is taken out
              of the Pro Trader&apos;s share. You are never charged extra.
            </p>
          </div>
        </Card>

        {/* Right: Step-by-Step Breakdown */}
        <div className="lg:col-span-7 space-y-5">
          <Card padding="lg" className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
              <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                Step-by-Step Calculation
              </h2>
              {result.valid ? (
                <StatusBadge
                  tone="success"
                  label={`100% check passed (${result.sharesSumPercent}%)`}
                />
              ) : (
                <StatusBadge tone="danger" label="Invalid split rule" />
              )}
            </div>

            {!result.valid && result.error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
                {result.error}
              </div>
            )}

            {/* Step list */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-200/70 dark:border-white/8">
                <span className="text-slate-600 dark:text-slate-300">
                  1. Adjusted ending balance (excludes deposits/withdrawals)
                </span>
                <span className="font-mono font-semibold text-slate-950 dark:text-white tabular-nums">
                  {formatCurrency(fromCents(result.adjustedEndingCents))}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-200/70 dark:border-white/8">
                <span className="text-slate-600 dark:text-slate-300">
                  2. Realized net profit / loss (after trading costs)
                </span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    result.realizedNetProfitCents >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {result.realizedNetProfitCents >= 0 ? '+' : ''}
                  {formatCurrency(fromCents(result.realizedNetProfitCents))}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-200/70 dark:border-white/8">
                <span className="text-slate-600 dark:text-slate-300 inline-flex items-center gap-1">
                  <span>3. Peak to beat (High-Water Mark)</span>
                  <HelpTip term="High-Water Mark" explanation={TEXTS.helpTips.highWaterMark} />
                </span>
                <span className="font-mono font-semibold text-slate-950 dark:text-white tabular-nums">
                  {formatCurrency(fromCents(result.effectiveHwmCents))}
                </span>
              </div>

              {result.recoveryAppliedCents > 0 && (
                <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-200/70 dark:border-white/8 text-sky-700 dark:text-sky-300">
                  <span>Recovery used to catch up to past peak (no fee charged)</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {formatCurrency(fromCents(result.recoveryAppliedCents))}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 py-2">
                <span className="font-semibold text-slate-950 dark:text-white">
                  4. Eligible new profit to share
                </span>
                <span className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(fromCents(result.eligibleProfitCents))}
                </span>
              </div>
            </div>

            {/* Three-way split cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-4">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  New Trader ({result.newTraderSharePercent}%)
                </p>
                <p className="mt-1 font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(fromCents(result.newTraderCents))}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Plus 100% of your deposit
                </p>
              </div>

              <div className="rounded-2xl border border-sky-500/25 bg-sky-500/8 p-4">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Pro Trader net ({result.proNetSharePercent}%)
                </p>
                <p className="mt-1 font-mono text-xl font-bold text-sky-600 dark:text-sky-300 tabular-nums">
                  {formatCurrency(fromCents(result.proNetCents))}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  After {result.platformCommissionPercent}% platform fee
                </p>
              </div>

              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Shohoj Trading ({result.platformCommissionPercent}%)
                </p>
                <p className="mt-1 font-mono text-xl font-bold text-amber-600 dark:text-amber-300 tabular-nums">
                  {formatCurrency(fromCents(result.platformCommissionCents))}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Taken from Pro share
                </p>
              </div>
            </div>

            {result.lossCarryForwardCents > 0 && (
              <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-3.5 text-xs sm:text-sm text-sky-900 dark:text-sky-200">
                No profit fee is charged this period.{' '}
                <strong className="font-mono">
                  {formatCurrency(fromCents(result.lossCarryForwardCents))}
                </strong>{' '}
                must still be recovered before future profit fees apply. Next High-Water Mark:{' '}
                <strong className="font-mono">
                  {formatCurrency(fromCents(result.nextHighWaterMarkCents))}
                </strong>
                .
              </div>
            )}

            {/* Chart */}
            <div className="h-48 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke={tickColor} tick={{ fontSize: 11 }} />
                  <YAxis stroke={tickColor} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: gridColor,
                      borderRadius: '14px',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [formatCurrency(Number(val ?? 0)), 'Share']}
                  />
                  <Bar dataKey="usd" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="inline-flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true" />
                <span>
                  Commission is due on profit from connections started here for{' '}
                  {settings.commissionProtectionMonths} months.
                </span>
              </div>
              {selectedTrader && (
                <Link to={`/requests?trader=${selectedTrader.id}`} className="shrink-0">
                  <Button size="sm">
                    <span>Request {selectedTrader.displayName}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Built-in Engine Self-Test Panel */}
      {showSelfTests && (
        <Card padding="lg" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                Profit Engine Self-Test Suite (9 Cases)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Runs directly against the pure whole-cent profitEngine and live Settings.
              </p>
            </div>
            <StatusBadge
              tone={allTestsPassed ? 'success' : 'danger'}
              label={allTestsPassed ? 'All 9 tests passed' : 'Check failed test'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {selfTestResults.map((tc) => (
              <div
                key={tc.id}
                className="rounded-2xl border border-slate-200 dark:border-white/10 p-3.5 space-y-1.5 text-xs bg-slate-50/70 dark:bg-white/[0.02]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-slate-950 dark:text-white">
                    {tc.name}
                  </span>
                  {tc.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" aria-hidden="true" />
                  )}
                </div>
                <p className="text-slate-600 dark:text-slate-400">{tc.description}</p>
                <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300 pt-1">
                  {tc.actualSummary}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
