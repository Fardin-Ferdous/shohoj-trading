import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Flag,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  Scale,
  ShieldAlert,
  Square,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { TEXTS } from '../../texts';
import { Connection } from '../../types';
import { formatCurrency, formatPercent, formatShortDate } from '../../utils/formatters';
import { calculateProfitSplit, fromCents } from '../../utils/profitEngine';
import { UserAvatar } from '../ui/Avatar';
import { StatusBadge, StatusTone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { HelpTip } from '../ui/HelpTip';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/States';

type FilterTab = 'all' | 'active' | 'paused' | 'completed';

function statusToTone(status: Connection['status']): StatusTone {
  if (status === 'active' || status === 'completed') return 'success';
  if (status === 'paused') return 'warning';
  if (status === 'rejected' || status === 'expired') return 'danger';
  if (status === 'accepted') return 'info';
  return 'neutral';
}

function describeOpenTradeRule(rule: Connection['snapshot']['openTradeRule'], hours: number): string {
  if (rule === 'close_immediately') return 'Open trades must close immediately.';
  if (rule === 'let_finish') return 'Open trades may finish; no new trades allowed.';
  return `Open trades close safely within ${hours} hours.`;
}

export function ActiveConnectionsBoard() {
  const navigate = useNavigate();
  const {
    db,
    settings,
    currentUser,
    currentRole,
    pauseConnection,
    resumeConnection,
    completeConnection,
    stopConnection,
    openDispute,
    reportTraderOrUser,
  } = useApp();

  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});

  // Modals state
  const [stopTarget, setStopTarget] = useState<Connection | null>(null);
  const [stopReason, setStopReason] = useState('');

  const [pauseTarget, setPauseTarget] = useState<Connection | null>(null);
  const [pauseReason, setPauseReason] = useState('');

  const [disputeTarget, setDisputeTarget] = useState<Connection | null>(null);
  const [disputeReason, setDisputeReason] = useState('Profit or fee calculation disagreement');
  const [disputeDetails, setDisputeDetails] = useState('');
  const [disputeError, setDisputeError] = useState('');

  const [reportTarget, setReportTarget] = useState<{ conn: Connection; targetUserId: string; targetName: string } | null>(null);
  const [reportReason, setReportReason] = useState('Risk limit or trading rule concern');
  const [reportDetails, setReportDetails] = useState('');
  const [reportError, setReportError] = useState('');

  const userConnections = useMemo(() => {
    if (!currentUser) return [];
    return db.connections.filter(
      (c) =>
        (c.newTraderId === currentUser.id || c.proTraderId === currentUser.id) &&
        ['active', 'paused', 'completed'].includes(c.status)
    );
  }, [db.connections, currentUser]);

  const filteredConnections = useMemo(() => {
    if (filterTab === 'all') return userConnections;
    return userConnections.filter((c) => c.status === filterTab);
  }, [userConnections, filterTab]);

  const myDisputes = useMemo(() => {
    if (!currentUser) return [];
    return db.disputes.filter(
      (d) => d.openedByUserId === currentUser.id || d.againstUserId === currentUser.id
    );
  }, [db.disputes, currentUser]);

  const myReports = useMemo(() => {
    if (!currentUser) return [];
    return db.reports.filter((r) => r.reporterUserId === currentUser.id);
  }, [db.reports, currentUser]);

  if (!currentUser || (currentRole !== 'new_trader' && currentRole !== 'pro_trader')) {
    return null;
  }

  const isProRole = currentRole === 'pro_trader';

  const counts = {
    all: userConnections.length,
    active: userConnections.filter((c) => c.status === 'active').length,
    paused: userConnections.filter((c) => c.status === 'paused').length,
    completed: userConnections.filter((c) => c.status === 'completed').length,
  };

  const toggleHistory = (id: string) => {
    setExpandedHistoryIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleConfirmPause = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pauseTarget) return;
    pauseConnection(pauseTarget.id, currentUser.fullName, pauseReason);
    setPauseTarget(null);
    setPauseReason('');
  };

  const handleConfirmStop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stopTarget) return;
    stopConnection(stopTarget.id, currentUser.fullName, stopReason);
    setStopTarget(null);
    setStopReason('');
  };

  const handleConfirmDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeTarget) return;
    setDisputeError('');
    const res = openDispute({
      connectionId: disputeTarget.id,
      userId: currentUser.id,
      reason: disputeReason,
      details: disputeDetails,
    });
    if (!res.ok) {
      setDisputeError(res.error ?? 'Could not open dispute.');
      return;
    }
    setDisputeTarget(null);
    setDisputeDetails('');
  };

  const handleConfirmReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;
    setReportError('');
    const res = reportTraderOrUser({
      reporterId: currentUser.id,
      targetUserId: reportTarget.targetUserId,
      reason: reportReason,
      details: reportDetails,
    });
    if (!res.ok) {
      setReportError(res.error ?? 'Could not submit report.');
      return;
    }
    setReportTarget(null);
    setReportDetails('');
  };

  return (
    <section className="space-y-6">
      {/* Header & Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">
            {isProRole ? 'Live Subscriber Monitoring' : 'Live Account Monitoring'}
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-white">
            {isProRole ? 'My Connected Traders' : 'My Connections'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Shared numbers stay identical for both sides. {TEXTS.riskWarningShort}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: 'all', label: `All (${counts.all})` },
              { key: 'active', label: `Active (${counts.active})` },
              { key: 'paused', label: `Paused (${counts.paused})` },
              { key: 'completed', label: `Completed (${counts.completed})` },
            ] as { key: FilterTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterTab(tab.key)}
              className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                filterTab === tab.key
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-white/6 text-slate-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Connections List */}
      {filteredConnections.length === 0 ? (
        <EmptyState
          title={
            userConnections.length === 0
              ? 'No active or past connections yet'
              : `No ${filterTab} connections`
          }
          message={
            userConnections.length === 0
              ? isProRole
                ? 'Accept a Request to Connect and finish agreement signing to see connected New Traders here.'
                : 'Send a Request to Connect, sign the agreement, and complete your Exness access checklist to track live results here.'
              : 'Try another filter tab above or switch demo users in Demo Tools.'
          }
          actionLabel={isProRole ? 'Open Incoming Requests' : 'Find Traders'}
          onAction={() => navigate(isProRole ? '/requests' : '/traders')}
        />
      ) : (
        <div className="space-y-5">
          {filteredConnections.map((conn) => {
            const newUser = db.users.find((u) => u.id === conn.newTraderId);
            const proUser = db.users.find((u) => u.id === conn.proTraderId);
            const proProfile = db.traderProfiles.find(
              (p) => p.userId === conn.proTraderId || p.id === conn.proTraderId
            );
            const agreement = db.agreements.find((a) => a.connectionId === conn.id);

            const partnerName = isProRole
              ? newUser?.fullName ?? 'New Trader'
              : proProfile?.displayName ?? proUser?.fullName ?? 'Professional Trader';
            const partnerAvatarUrl = isProRole
              ? newUser?.avatarUrl
              : proProfile?.avatarUrl ?? proUser?.avatarUrl;
            const partnerAvatarColor = isProRole ? undefined : proProfile?.avatarColor;
            const partnerUserId = isProRole ? conn.newTraderId : conn.proTraderId;

            const growthPct =
              conn.plannedAmountUsd > 0
                ? ((conn.currentBalanceUsd - conn.plannedAmountUsd) / conn.plannedAmountUsd) * 100
                : 0;

            // Compute exact live profit estimate using Profit & Commission Engine
            const split = calculateProfitSplit({
              startingBalanceUsd: conn.plannedAmountUsd,
              endingBalanceUsd: conn.currentBalanceUsd,
              depositsDuringPeriodUsd: 0,
              withdrawalsDuringPeriodUsd: 0,
              highWaterMarkUsd: conn.plannedAmountUsd,
              proSharePercent: conn.snapshot.proTraderSharePercent,
              platformCommissionPercent: conn.snapshot.platformCommissionPercent,
            });
            const proNetEst = fromCents(split.proNetCents);
            const commissionEst = fromCents(split.platformCommissionCents);

            const drawdownNow = conn.currentDrawdownPercent ?? 0;
            const riskPerTradeNow = conn.lastRiskPerTradePercent ?? 0;
            const lotSizeNow = conn.lastLotSize ?? 0;
            const periodPct = Math.min(100, Math.max(0, conn.periodProgressPercent ?? 50));

            const ddRatio =
              conn.snapshot.maxDrawdownPercent > 0
                ? (drawdownNow / conn.snapshot.maxDrawdownPercent) * 100
                : 0;
            const ddBreached = drawdownNow > conn.snapshot.maxDrawdownPercent;
            const riskBreached = riskPerTradeNow > conn.snapshot.maxRiskPerTradePercent;
            const lotBreached = lotSizeNow > conn.snapshot.maxLotSize;
            const anyBreach = ddBreached || riskBreached || lotBreached || Boolean(conn.riskWarningMessage);
            const historyExpanded = Boolean(expandedHistoryIds[conn.id]);

            return (
              <Card key={conn.id} padding="lg" className="space-y-6">
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3.5">
                    <UserAvatar
                      src={partnerAvatarUrl}
                      name={partnerName}
                      color={partnerAvatarColor}
                      size="md"
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-display text-xl font-bold text-white">{partnerName}</h3>
                        <StatusBadge
                          tone={statusToTone(conn.status)}
                          label={conn.status.toUpperCase()}
                        />
                        <span className="text-xs font-mono text-slate-400">#{conn.id}</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Split {conn.snapshot.newTraderSharePercent}/{conn.snapshot.proTraderSharePercent} ·{' '}
                        {conn.snapshot.settlementPeriod} settlement ·{' '}
                        {agreement?.accessActive ? 'Exness access active' : 'Access inactive / paused'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link to="/settlements">
                      <Button variant="secondary" size="sm">
                        <span>Settlements</span>
                      </Button>
                    </Link>
                    <Link to={`/connections/${conn.id}`}>
                      <Button variant="secondary" size="sm">
                        <MessageSquare className="w-4 h-4" aria-hidden="true" />
                        <span>Chat & Agreement</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Risk Warning Alert Banner if Rule Broken */}
                {anyBreach && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-500/40 bg-red-500/12 p-4 flex items-start gap-3 text-sm text-red-200"
                  >
                    <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-red-300">Safety limit warning triggered</p>
                      <p className="mt-1">
                        {conn.riskWarningMessage ??
                          'One of the agreed safety limits was crossed. Connection paused for protection.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Shared Numbers Grid (identical for New Trader & Pro Trader) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div className="rounded-2xl bg-white/[0.04] border border-white/8 p-3.5">
                    <p className="text-xs text-slate-400">Balance</p>
                    <p className="mt-1 font-mono text-lg font-bold text-white tabular-nums">
                      {formatCurrency(conn.currentBalanceUsd)}
                    </p>
                    <p className="text-[11px] text-slate-400 tabular-nums">
                      Start: {formatCurrency(conn.plannedAmountUsd)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/[0.04] border border-white/8 p-3.5">
                    <p className="text-xs text-slate-400">Growth %</p>
                    <p
                      className={`mt-1 font-mono text-lg font-bold tabular-nums ${
                        growthPct >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {formatPercent(growthPct)}
                    </p>
                    <p className="text-[11px] text-slate-400 tabular-nums">
                      HWM: {formatCurrency(conn.highWaterMarkUsd)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/[0.04] border border-white/8 p-3.5">
                    <p className="text-xs text-slate-400">Realized P&L</p>
                    <p
                      className={`mt-1 font-mono text-lg font-bold tabular-nums ${
                        conn.realizedProfitUsd >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {conn.realizedProfitUsd >= 0 ? '+' : ''}
                      {formatCurrency(conn.realizedProfitUsd)}
                    </p>
                    <p className="text-[11px] text-slate-400">New profit only</p>
                  </div>

                  <div className="rounded-2xl bg-white/[0.04] border border-white/8 p-3.5">
                    <p className="text-xs text-slate-400 inline-flex items-center gap-1">
                      <span>{isProRole ? 'Pro Earnings / Comm.' : 'Fees Paid'}</span>
                      <HelpTip
                        term="High-water mark"
                        explanation={TEXTS.helpTips.highWaterMark}
                      />
                    </p>
                    {isProRole ? (
                      <>
                        <p className="mt-1 font-mono text-lg font-bold text-emerald-400 tabular-nums">
                          {formatCurrency(proNetEst)}
                        </p>
                        <p className="text-[11px] text-slate-400 tabular-nums">
                          Est. fee due: {formatCurrency(commissionEst)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-1 font-mono text-lg font-bold text-white tabular-nums">
                          {formatCurrency(conn.feesPaidUsd ?? 0)}
                        </p>
                        <p className="text-[11px] text-slate-400 tabular-nums">
                          Platform {conn.snapshot.platformCommissionPercent}% from Pro share
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Settlement Period Progress + Risk Limit Meter */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Period Progress */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                        <CalendarClock className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                        <span>Settlement period progress</span>
                      </span>
                      <span className="font-mono font-semibold text-white tabular-nums">
                        {periodPct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all"
                        style={{ width: `${periodPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="capitalize">Cycle: {conn.snapshot.settlementPeriod}</span>
                      <span>
                        Next settlement:{' '}
                        <strong className="text-slate-200 font-mono">
                          {conn.nextSettlementAt ? formatShortDate(conn.nextSettlementAt) : 'End of cycle'}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Risk Limit Meter */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                        <AlertTriangle
                          className={`w-4 h-4 ${
                            anyBreach
                              ? 'text-red-400'
                              : ddRatio >= 75
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                          aria-hidden="true"
                        />
                        <span>Risk limit meter (Agreed snapshot)</span>
                      </span>
                      <span
                        className={`font-mono font-semibold tabular-nums ${
                          ddBreached ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        DD {drawdownNow}% / {conn.snapshot.maxDrawdownPercent}%
                      </span>
                    </div>

                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          ddBreached
                            ? 'bg-red-500'
                            : ddRatio >= 75
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(4, ddRatio))}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                      <span>
                        Risk / trade:{' '}
                        <strong
                          className={`font-mono tabular-nums ${
                            riskBreached ? 'text-red-400' : 'text-slate-200'
                          }`}
                        >
                          {riskPerTradeNow}%
                        </strong>{' '}
                        / {conn.snapshot.maxRiskPerTradePercent}%
                      </span>
                      <span className="text-right">
                        Max lot:{' '}
                        <strong
                          className={`font-mono tabular-nums ${
                            lotBreached ? 'text-red-400' : 'text-slate-200'
                          }`}
                        >
                          {lotSizeNow}
                        </strong>{' '}
                        / {conn.snapshot.maxLotSize}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Controls Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <div className="flex flex-wrap items-center gap-2">
                    {conn.status === 'active' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPauseTarget(conn)}
                      >
                        <PauseCircle className="w-4 h-4" aria-hidden="true" />
                        <span>Pause</span>
                      </Button>
                    )}

                    {conn.status === 'paused' && (
                      <Button
                        size="sm"
                        onClick={() => resumeConnection(conn.id, currentUser.fullName)}
                      >
                        <PlayCircle className="w-4 h-4" aria-hidden="true" />
                        <span>Resume</span>
                      </Button>
                    )}

                    {(conn.status === 'active' || conn.status === 'paused') && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => completeConnection(conn.id, currentUser.fullName)}
                      >
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        <span>Complete</span>
                      </Button>
                    )}

                    {!isProRole && (conn.status === 'active' || conn.status === 'paused') && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setStopTarget(conn)}
                      >
                        <Square className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Stop connection</span>
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!isProRole && (
                      <button
                        type="button"
                        onClick={() =>
                          setReportTarget({
                            conn,
                            targetUserId: partnerUserId,
                            targetName: partnerName,
                          })
                        }
                        className="min-h-[38px] inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 border border-white/15 hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <Flag className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                        <span>Report trader</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setDisputeTarget(conn)}
                      className="min-h-[38px] inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 border border-white/15 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Scale className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                      <span>Open dispute</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleHistory(conn.id)}
                      className="min-h-[38px] inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/8 transition-colors cursor-pointer"
                    >
                      <span>History ({conn.history.length})</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          historyExpanded ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>

                {/* Expandable Status History */}
                {historyExpanded && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Status History Timeline
                    </p>
                    <ul className="space-y-2">
                      {conn.history.map((entry, idx) => (
                        <li
                          key={`${conn.id}-hist-${idx}`}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs border-b border-white/6 last:border-b-0 pb-2 last:pb-0"
                        >
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              tone={statusToTone(entry.status)}
                              label={entry.status}
                            />
                            <span className="text-slate-200">{entry.reason}</span>
                          </div>
                          <span className="text-slate-400 font-mono shrink-0">
                            {entry.changedByName} · {formatShortDate(entry.changedAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* User's Open Disputes & Reports */}
      {(myDisputes.length > 0 || myReports.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {myDisputes.length > 0 && (
            <Card className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-sky-400" aria-hidden="true" />
                  <span>Support Disputes ({myDisputes.length})</span>
                </h3>
                <Link to="/disputes" className="text-xs font-semibold text-emerald-400 hover:underline">
                  Full Hub →
                </Link>
              </div>
              <ul className="space-y-2.5">
                {myDisputes.map((disp) => (
                  <li
                    key={disp.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">{disp.reason}</span>
                      <StatusBadge
                        tone={disp.status === 'resolved' ? 'success' : 'warning'}
                        label={disp.status.replace('_', ' ')}
                      />
                    </div>
                    <p className="text-slate-300">{disp.details}</p>
                    <p className="text-slate-500 font-mono">
                      {disp.connectionId} · {formatShortDate(disp.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {myReports.length > 0 && (
            <Card className="space-y-3">
              <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                <Flag className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span>Submitted Reports ({myReports.length})</span>
              </h3>
              <ul className="space-y-2.5">
                {myReports.map((rep) => (
                  <li
                    key={rep.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">
                        {rep.targetName} · {rep.reason}
                      </span>
                      <StatusBadge
                        tone={rep.status === 'checked' ? 'success' : 'info'}
                        label={rep.status}
                      />
                    </div>
                    <p className="text-slate-300">{rep.details}</p>
                    <p className="text-slate-500 font-mono">{formatShortDate(rep.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Pause Modal */}
      <Modal
        isOpen={Boolean(pauseTarget)}
        onClose={() => setPauseTarget(null)}
        title="Pause active connection"
      >
        <form onSubmit={handleConfirmPause} className="space-y-4">
          <p className="text-sm text-slate-300">
            Pausing stops new copy-trading activity while keeping your full agreement history and chat intact.
          </p>
          <Input
            label="Reason (optional)"
            placeholder="e.g. Pausing before high-impact news"
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setPauseTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Pause connection
            </Button>
          </div>
        </form>
      </Modal>

      {/* Stop Connection Modal */}
      <Modal
        isOpen={Boolean(stopTarget)}
        onClose={() => setStopTarget(null)}
        title="Stop connection & remove access"
      >
        {stopTarget && (
          <form onSubmit={handleConfirmStop} className="space-y-4">
            <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3.5 text-xs text-amber-200 space-y-1.5">
              <p className="font-semibold">Agreed notice & open-trade rule:</p>
              <p>
                • Notice period: <strong>{stopTarget.snapshot.cancellationNoticeDays} days</strong>
              </p>
              <p>
                • Open trades:{' '}
                <strong>
                  {describeOpenTradeRule(
                    stopTarget.snapshot.openTradeRule,
                    settings.openTradeCloseHours
                  )}
                </strong>
              </p>
              <p>• Your Exness broker access will be marked removed immediately.</p>
            </div>

            <Input
              label="Reason for stopping (optional)"
              placeholder="e.g. Closing cycle and withdrawing profit"
              value={stopReason}
              onChange={(e) => setStopReason(e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setStopTarget(null)}>
                Keep connection
              </Button>
              <Button type="submit" variant="danger" size="sm">
                Stop & remove access
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Open Dispute Modal */}
      <Modal
        isOpen={Boolean(disputeTarget)}
        onClose={() => {
          setDisputeTarget(null);
          setDisputeError('');
        }}
        title="Open Support dispute"
      >
        <form onSubmit={handleConfirmDispute} className="space-y-4">
          <p className="text-sm text-slate-300">
            Support will review the locked agreement snapshot, chat timeline, and profit calculations.
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="dispute-reason" className="text-sm font-medium text-slate-200">
              Dispute topic
            </label>
            <select
              id="dispute-reason"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="min-h-[44px] w-full rounded-full px-4 py-2 text-sm bg-white/5 border border-white/15 text-white"
            >
              <option value="Profit or fee calculation disagreement" className="bg-[#0d1612]">
                Profit or fee calculation disagreement
              </option>
              <option value="Drawdown or risk limit exceeded" className="bg-[#0d1612]">
                Drawdown or risk limit exceeded
              </option>
              <option value="Open trades not closed after stop notice" className="bg-[#0d1612]">
                Open trades not closed after stop notice
              </option>
              <option value="Other agreement issue" className="bg-[#0d1612]">
                Other agreement issue
              </option>
            </select>
          </div>

          <Input
            label="Explain what happened"
            placeholder="Describe dates, trade numbers, or what needs review..."
            value={disputeDetails}
            onChange={(e) => setDisputeDetails(e.target.value)}
            error={disputeError}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDisputeTarget(null)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Submit dispute
            </Button>
          </div>
        </form>
      </Modal>

      {/* Report Trader Modal */}
      <Modal
        isOpen={Boolean(reportTarget)}
        onClose={() => {
          setReportTarget(null);
          setReportError('');
        }}
        title={reportTarget ? `Report ${reportTarget.targetName}` : 'Report Trader'}
      >
        <form onSubmit={handleConfirmReport} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-reason" className="text-sm font-medium text-slate-200">
              Report reason
            </label>
            <select
              id="report-reason"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="min-h-[44px] w-full rounded-full px-4 py-2 text-sm bg-white/5 border border-white/15 text-white"
            >
              <option value="Risk limit or trading rule concern" className="bg-[#0d1612]">
                Risk limit or trading rule concern
              </option>
              <option value="Asked to move chat outside platform" className="bg-[#0d1612]">
                Asked to move chat outside platform
              </option>
              <option value="Asked for MT5 master password" className="bg-[#0d1612]">
                Asked for MT5 master password
              </option>
              <option value="Misleading claims or promised returns" className="bg-[#0d1612]">
                Misleading claims or promised returns
              </option>
            </select>
          </div>

          <Input
            label="Details for Support"
            placeholder="Share a short summary for our safety team..."
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            error={reportError}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setReportTarget(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="sm">
              Send report
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
