import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeCheck,
  Calculator,
  CheckCircle2,
  CreditCard,
  Play,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { TEXTS } from '../texts';
import { CommissionInvoice, SettlementRecord } from '../types';
import { formatCurrency, formatShortDate } from '../utils/formatters';
import { StatusBadge, StatusTone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { HelpTip } from '../components/ui/HelpTip';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { RiskWarningNotice } from '../components/ui/RiskBanner';
import { EmptyState } from '../components/ui/States';

function invoiceTone(status: CommissionInvoice['status']): StatusTone {
  if (status === 'paid') return 'success';
  if (status === 'overdue') return 'danger';
  return 'warning';
}

export function SettlementsPage() {
  const navigate = useNavigate();
  const {
    db,
    settings,
    currentUser,
    currentRole,
    runSettlementSimulation,
    payCommissionInvoice,
    advanceUnpaidInvoiceStep,
  } = useApp();

  const userConnections = useMemo(() => {
    if (!currentUser) return [];
    if (currentRole === 'admin') return db.connections;
    return db.connections.filter(
      (c) =>
        (c.newTraderId === currentUser.id || c.proTraderId === currentUser.id) &&
        ['active', 'paused', 'completed'].includes(c.status)
    );
  }, [db.connections, currentUser, currentRole]);

  const userSettlements = useMemo(() => {
    if (!currentUser) return [];
    if (currentRole === 'admin') return db.settlements;
    return db.settlements.filter(
      (s) => s.newTraderId === currentUser.id || s.proTraderId === currentUser.id
    );
  }, [db.settlements, currentUser, currentRole]);

  const userInvoices = useMemo(() => {
    if (!currentUser) return [];
    if (currentRole === 'admin') return db.invoices;
    return db.invoices.filter(
      (inv) => inv.newTraderId === currentUser.id || inv.proTraderId === currentUser.id
    );
  }, [db.invoices, currentUser, currentRole]);

  // Settlement simulator form state
  const [selectedConnId, setSelectedConnId] = useState<string>('');
  const [periodLabel, setPeriodLabel] = useState('Dec 2026 Settlement');
  const [endingBalance, setEndingBalance] = useState('1850');
  const [depositsUsd, setDepositsUsd] = useState('0');
  const [withdrawalsUsd, setWithdrawalsUsd] = useState('0');
  const [simError, setSimError] = useState('');

  // Receipt & Payment modals
  const [receiptTarget, setReceiptTarget] = useState<SettlementRecord | null>(null);
  const [payTarget, setPayTarget] = useState<CommissionInvoice | null>(null);
  const [providerChoice, setProviderChoice] = useState('Stripe / Licensed Card Checkout (Prototype example)');

  useEffect(() => {
    if (!selectedConnId && userConnections.length > 0) {
      const first = userConnections[0];
      setSelectedConnId(first.id);
      setEndingBalance(String(Math.round(first.currentBalanceUsd + 120)));
    }
  }, [selectedConnId, userConnections]);

  const activeSimConn = useMemo(
    () => userConnections.find((c) => c.id === selectedConnId) ?? userConnections[0],
    [userConnections, selectedConnId]
  );

  if (!currentUser) {
    return (
      <EmptyState
        title="Log in to view Settlements & Commission Invoices"
        message="Log in or pick a New Trader / Professional Trader in Demo Tools to inspect settlement statements and test commission payments."
        actionLabel="Go to Log in"
        onAction={() => navigate('/login')}
      />
    );
  }

  const isProRole = currentRole === 'pro_trader';

  // Aggregate Pro Trader earnings summary
  const totalNewTraderShare = userSettlements.reduce((sum, s) => sum + s.newTraderAmountUsd, 0);
  const totalProNet = userSettlements.reduce((sum, s) => sum + s.proNetAmountUsd, 0);
  const totalCommission = userSettlements.reduce((sum, s) => sum + s.platformCommissionUsd, 0);
  const unpaidInvoicesTotal = userInvoices
    .filter((i) => i.status !== 'paid')
    .reduce((sum, i) => sum + i.amountUsd, 0);

  const applyPresetScenario = (preset: 'profit' | 'loss' | 'recovery' | 'deposit') => {
    if (!activeSimConn) return;
    const base = activeSimConn.currentBalanceUsd;
    if (preset === 'profit') {
      setPeriodLabel('Profit Period (+10%)');
      setEndingBalance(String(Math.round(base * 1.1)));
      setDepositsUsd('0');
      setWithdrawalsUsd('0');
    } else if (preset === 'loss') {
      setPeriodLabel('Loss Period (-8% · Zero Fee)');
      setEndingBalance(String(Math.round(base * 0.92)));
      setDepositsUsd('0');
      setWithdrawalsUsd('0');
    } else if (preset === 'recovery') {
      const target = Math.max(base + 40, activeSimConn.highWaterMarkUsd - 10);
      setPeriodLabel('Recovery Below HWM (Zero Fee)');
      setEndingBalance(String(Math.round(target)));
      setDepositsUsd('0');
      setWithdrawalsUsd('0');
    } else {
      setPeriodLabel('Mid-Period Deposit ($500 Excluded)');
      setEndingBalance(String(Math.round(base + 500)));
      setDepositsUsd('500');
      setWithdrawalsUsd('0');
    }
    setSimError('');
  };

  const handleRunSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSimConn) {
      setSimError('Please select a connection first.');
      return;
    }
    setSimError('');
    const res = runSettlementSimulation({
      connectionId: activeSimConn.id,
      periodLabel,
      endingBalanceUsd: Number(endingBalance),
      depositsUsd: Number(depositsUsd),
      withdrawalsUsd: Number(withdrawalsUsd),
    });
    if (!res.ok) {
      setSimError(res.error ?? 'Could not run settlement.');
    }
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
    payCommissionInvoice({
      invoiceId: payTarget.id,
      actorName: currentUser.fullName,
      providerLabel: providerChoice,
    });
    setPayTarget(null);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">
            Transparent Profit & Commission Ledger
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white">
            Settlements & Invoices
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-300">
            Step-by-step settlement statements shared equally by New Traders and Professional Traders.
          </p>
        </div>

        <Link to="/calculator">
          <Button variant="secondary" size="sm">
            <Calculator className="w-4 h-4" aria-hidden="true" />
            <span>Open Profit Calculator</span>
          </Button>
        </Link>
      </div>

      {/* Custody & Commission Protection Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="sm" className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs sm:text-sm text-slate-300 space-y-1">
            <p className="font-semibold text-white">Platform Commission Scope</p>
            <p>
              Shohoj Trading does not hold trading money. Only the commission and fees are handled.
            </p>
          </div>
        </Card>

        <Card padding="sm" className="flex items-start gap-3">
          <BadgeCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs sm:text-sm text-slate-300 space-y-1">
            <p className="font-semibold text-white">Commission Protection Rule</p>
            <p>
              Commission is due on profit from connections started here for{' '}
              <strong className="text-emerald-400">
                {settings.commissionProtectionMonths} months
              </strong>
              .
            </p>
          </div>
        </Card>
      </div>

      {/* Summary Statement Row (role-aware highlight) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm">
          <p className="text-xs text-slate-400">Settlement Statements</p>
          <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
            {userSettlements.length}
          </p>
        </Card>

        <Card padding="sm">
          <p className="text-xs text-slate-400">
            {isProRole ? 'Pro Net Earnings Total' : 'New Trader Share Kept'}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
            {formatCurrency(isProRole ? totalProNet : totalNewTraderShare)}
          </p>
        </Card>

        <Card padding="sm">
          <p className="text-xs text-slate-400">Total Platform Commission</p>
          <p className="mt-1 font-mono text-2xl font-bold text-sky-300 tabular-nums">
            {formatCurrency(totalCommission)}
          </p>
        </Card>

        <Card padding="sm">
          <p className="text-xs text-slate-400">Unpaid Invoices Due</p>
          <p
            className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
              unpaidInvoicesTotal > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {formatCurrency(unpaidInvoicesTotal)}
          </p>
        </Card>
      </div>

      {/* Simulated Settlement Run Panel */}
      {userConnections.length > 0 && (
        <Card padding="lg" className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                Run Simulated Period Settlement
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Applies the exact High-Water Mark & 100% cent check from our Profit Engine.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPresetScenario('profit')}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/8 text-slate-200 hover:bg-emerald-400/20 hover:text-emerald-300 cursor-pointer"
              >
                +10% Profit
              </button>
              <button
                type="button"
                onClick={() => applyPresetScenario('loss')}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/8 text-slate-200 hover:bg-red-400/20 hover:text-red-300 cursor-pointer"
              >
                Loss Period
              </button>
              <button
                type="button"
                onClick={() => applyPresetScenario('recovery')}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/8 text-slate-200 hover:bg-amber-400/20 hover:text-amber-300 cursor-pointer"
              >
                Recovery Below Peak
              </button>
              <button
                type="button"
                onClick={() => applyPresetScenario('deposit')}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/8 text-slate-200 hover:bg-sky-400/20 hover:text-sky-300 cursor-pointer"
              >
                Mid-Period Deposit
              </button>
            </div>
          </div>

          <form onSubmit={handleRunSettlement} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="stl-conn" className="text-sm font-medium text-slate-200">
                Connection
              </label>
              <select
                id="stl-conn"
                value={activeSimConn?.id ?? ''}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedConnId(id);
                  const found = userConnections.find((c) => c.id === id);
                  if (found) setEndingBalance(String(Math.round(found.currentBalanceUsd + 100)));
                }}
                className="min-h-[44px] rounded-full px-4 py-2 text-sm bg-white/5 border border-white/15 text-white"
              >
                {userConnections.map((c) => {
                  const nt = db.users.find((u) => u.id === c.newTraderId);
                  const pt = db.users.find((u) => u.id === c.proTraderId);
                  return (
                    <option key={c.id} value={c.id} className="bg-[#0d1612]">
                      {c.id} ({nt?.fullName.split(' ')[0]} · {pt?.fullName.split(' ')[0]}) — Bal{' '}
                      {formatCurrency(c.currentBalanceUsd)}
                    </option>
                  );
                })}
              </select>
            </div>

            <Input
              label="Period Label"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
            />

            <Input
              label="Ending Balance ($)"
              type="number"
              step="0.01"
              value={endingBalance}
              onChange={(e) => setEndingBalance(e.target.value)}
              hint={
                activeSimConn
                  ? `Start ${formatCurrency(activeSimConn.currentBalanceUsd)} · HWM ${formatCurrency(activeSimConn.highWaterMarkUsd)}`
                  : undefined
              }
            />

            <Input
              label="Mid-Period Deposits ($)"
              type="number"
              step="0.01"
              value={depositsUsd}
              onChange={(e) => setDepositsUsd(e.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <Input
                label="Withdrawals ($)"
                type="number"
                step="0.01"
                value={withdrawalsUsd}
                onChange={(e) => setWithdrawalsUsd(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              {simError ? (
                <p className="text-sm text-red-400">{simError}</p>
              ) : (
                <p className="text-xs text-slate-400">
                  Note: Loss periods and partial recoveries below High-Water Mark charge{' '}
                  <strong className="text-white">$0.00 fee</strong> automatically.
                </p>
              )}
              <Button type="submit" size="sm">
                <Play className="w-4 h-4" aria-hidden="true" />
                <span>Run Settlement & Generate Statement</span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Commission Invoices & Unpaid Flow */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              Commission Invoices
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Due / Paid / Overdue invoices with simulated licensed provider checkout and unpaid escalation steps.
            </p>
          </div>
        </div>

        {userInvoices.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-400">No commission invoices issued for this account yet.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {userInvoices.map((inv) => {
              const proUser = db.users.find((u) => u.id === inv.proTraderId);
              const newUser = db.users.find((u) => u.id === inv.newTraderId);
              return (
                <Card key={inv.id} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-sm font-bold text-white">
                          Invoice #{inv.id}
                        </span>
                        <StatusBadge
                          tone={invoiceTone(inv.status)}
                          label={inv.status.toUpperCase()}
                        />
                        {inv.unpaidStage !== 'none' && (
                          <StatusBadge
                            tone="danger"
                            label={inv.unpaidStage.replace('_', ' ').toUpperCase()}
                          />
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        Pro Trader: <strong className="text-slate-200">{proUser?.fullName}</strong> · New
                        Trader: {newUser?.fullName} · Connection #{inv.connectionId}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-left sm:text-right">
                        <p className="font-mono text-xl font-bold text-white tabular-nums">
                          {formatCurrency(inv.amountUsd)}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {inv.status === 'paid' && inv.paidAt
                            ? `Paid ${formatShortDate(inv.paidAt)}`
                            : `Due ${formatShortDate(inv.dueAt)}`}
                        </p>
                      </div>

                      {inv.status !== 'paid' && (
                        <>
                          <Button size="sm" onClick={() => setPayTarget(inv)}>
                            <CreditCard className="w-4 h-4" aria-hidden="true" />
                            <span>Pay Invoice</span>
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => advanceUnpaidInvoiceStep(inv.id)}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                            <span>
                              {inv.unpaidStage === 'none'
                                ? 'Test Reminder'
                                : inv.unpaidStage === 'reminder_sent'
                                ? 'Test Warning'
                                : inv.unpaidStage === 'warning_sent'
                                ? 'Test Suspension'
                                : 'Suspended'}
                            </span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Unpaid Escalation / History Track */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Invoice Timeline (Issued → Reminder → Warning → Suspension / Paid)
                    </p>
                    {inv.history.map((h, idx) => (
                      <div
                        key={`${inv.id}-h-${idx}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-300"
                      >
                        <span>
                          <strong className="text-white">{h.step}:</strong> {h.note}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 shrink-0">
                          {formatShortDate(h.at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Step-by-step Settlement Statements */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white">
          Step-by-Step Settlement Statements
        </h2>

        {userSettlements.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-400">No settlement statements recorded yet.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {userSettlements.map((stl) => {
              const nt = db.users.find((u) => u.id === stl.newTraderId);
              const pt = db.users.find((u) => u.id === stl.proTraderId);
              return (
                <Card key={stl.id} padding="lg" className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-display text-lg font-bold text-white">
                          {stl.periodLabel}
                        </h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-mono text-emerald-300">
                          <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Verified Seal: {stl.verificationCode}</span>
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {nt?.fullName} (New Trader) ↔ {pt?.fullName} (Pro Trader) ·{' '}
                        {formatShortDate(stl.createdAt)} · Protection:{' '}
                        {stl.commissionProtectionMonths} mo
                      </p>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setReceiptTarget(stl)}
                    >
                      <Printer className="w-4 h-4" aria-hidden="true" />
                      <span>Statement Receipt</span>
                    </Button>
                  </div>

                  {/* Step-by-step calculation breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4 space-y-2">
                      <p className="text-xs font-mono text-emerald-400">STEP 1 · NET PROFIT</p>
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Starting Balance</span>
                        <span className="font-mono tabular-nums">
                          {formatCurrency(stl.startingBalanceUsd)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Ending Balance</span>
                        <span className="font-mono tabular-nums">
                          {formatCurrency(stl.endingBalanceUsd)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Deposits / Withdrawals</span>
                        <span className="font-mono tabular-nums">
                          -{formatCurrency(stl.depositsUsd)} / +{formatCurrency(stl.withdrawalsUsd)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-white/10 font-semibold text-white">
                        <span>Realized Net Profit</span>
                        <span
                          className={`font-mono tabular-nums ${
                            stl.realizedNetProfitUsd >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {stl.realizedNetProfitUsd >= 0 ? '+' : ''}
                          {formatCurrency(stl.realizedNetProfitUsd)}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4 space-y-2">
                      <p className="text-xs font-mono text-emerald-400 inline-flex items-center gap-1">
                        <span>STEP 2 · HIGH-WATER MARK</span>
                        <HelpTip
                          term="High-water mark"
                          explanation={TEXTS.helpTips.highWaterMark}
                        />
                      </p>
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Previous Peak (HWM)</span>
                        <span className="font-mono tabular-nums">
                          {formatCurrency(stl.previousHwmUsd)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Loss Recovery Applied</span>
                        <span className="font-mono tabular-nums">
                          {formatCurrency(stl.recoveryAppliedUsd)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>New HWM Carried</span>
                        <span className="font-mono tabular-nums">
                          {formatCurrency(stl.newHwmUsd)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-white/10 font-semibold text-white">
                        <span>Eligible New Profit</span>
                        <span className="font-mono text-emerald-400 tabular-nums">
                          {formatCurrency(stl.eligibleProfitUsd)}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4 space-y-2">
                      <p className="text-xs font-mono text-emerald-400">STEP 3 · 100% SPLIT CHECK</p>
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>New Trader ({stl.newTraderSharePercent}%)</span>
                        <span className="font-mono text-white tabular-nums">
                          {formatCurrency(stl.newTraderAmountUsd)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Pro Trader Net ({stl.proNetSharePercent}%)</span>
                        <span className="font-mono text-emerald-400 tabular-nums">
                          {formatCurrency(stl.proNetAmountUsd)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Platform Commission ({stl.platformCommissionPercent}%)</span>
                        <span className="font-mono text-sky-300 tabular-nums">
                          {formatCurrency(stl.platformCommissionUsd)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-white/10 text-xs font-semibold text-emerald-300">
                        <span>Whole-Cent 100% Check</span>
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{stl.centsSumCheck ? 'Exact Match' : 'Error'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <RiskWarningNotice full />

      {/* Pay Commission Modal */}
      <Modal
        isOpen={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        title="Pay Commission Invoice"
      >
        {payTarget && (
          <form onSubmit={handlePaySubmit} className="space-y-4">
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-3.5 text-xs text-emerald-200 space-y-1">
              <p className="font-semibold">Prototype example — Simulated Payment Screen</p>
              <p>
                Shohoj Trading does not hold trading money. Only the commission and fees are
                handled.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Invoice #{payTarget.id}</p>
                <p className="text-sm font-semibold text-white">Platform Commission Due</p>
              </div>
              <p className="font-mono text-2xl font-bold text-emerald-400 tabular-nums">
                {formatCurrency(payTarget.amountUsd)}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="provider-select" className="text-sm font-medium text-slate-200">
                Pay with licensed payment provider
              </label>
              <select
                id="provider-select"
                value={providerChoice}
                onChange={(e) => setProviderChoice(e.target.value)}
                className="min-h-[44px] rounded-full px-4 py-2 text-sm bg-white/5 border border-white/15 text-white"
              >
                <option
                  value="Stripe / Licensed Card Checkout (Prototype example)"
                  className="bg-[#0d1612]"
                >
                  Stripe / Licensed Card Checkout (Prototype example)
                </option>
                <option
                  value="Licensed Bank Transfer Gateway (Prototype example)"
                  className="bg-[#0d1612]"
                >
                  Licensed Bank Transfer Gateway (Prototype example)
                </option>
                <option
                  value="Licensed Mobile Wallet Partner (Prototype example)"
                  className="bg-[#0d1612]"
                >
                  Licensed Mobile Wallet Partner (Prototype example)
                </option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setPayTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                <CreditCard className="w-4 h-4" aria-hidden="true" />
                <span>Confirm Demo Payment</span>
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Settlement Printable Receipt Modal */}
      <Modal
        isOpen={Boolean(receiptTarget)}
        onClose={() => setReceiptTarget(null)}
        title="Verified Settlement Statement"
        size="lg"
      >
        {receiptTarget && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div>
                <p className="font-display text-lg font-bold text-white">
                  {receiptTarget.periodLabel}
                </p>
                <p className="text-xs font-mono text-emerald-400">
                  Verification Seal: {receiptTarget.verificationCode}
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {formatShortDate(receiptTarget.createdAt)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-white/[0.03] border border-white/10 rounded-2xl p-4">
              <div>
                <p className="text-slate-400">Starting → Adjusted Ending</p>
                <p className="font-mono font-semibold text-white mt-0.5">
                  {formatCurrency(receiptTarget.startingBalanceUsd)} →{' '}
                  {formatCurrency(receiptTarget.adjustedEndingUsd)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Previous HWM → New HWM</p>
                <p className="font-mono font-semibold text-white mt-0.5">
                  {formatCurrency(receiptTarget.previousHwmUsd)} →{' '}
                  {formatCurrency(receiptTarget.newHwmUsd)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Eligible New Profit</p>
                <p className="font-mono font-semibold text-emerald-400 mt-0.5">
                  {formatCurrency(receiptTarget.eligibleProfitUsd)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">New / Pro Net / Platform Fee</p>
                <p className="font-mono font-semibold text-white mt-0.5">
                  {formatCurrency(receiptTarget.newTraderAmountUsd)} /{' '}
                  {formatCurrency(receiptTarget.proNetAmountUsd)} /{' '}
                  {formatCurrency(receiptTarget.platformCommissionUsd)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Commission protection rule: Commission is due on profit from connections started here
              for {receiptTarget.commissionProtectionMonths} months. {TEXTS.prototypeExampleTag}.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setReceiptTarget(null)}>
                Close
              </Button>
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4" aria-hidden="true" />
                <span>Print / Save PDF</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
