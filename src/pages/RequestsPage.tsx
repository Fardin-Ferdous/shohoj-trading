import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Lock,
  Mail,
  Phone,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { TEXTS } from '../texts';
import { Connection, ConnectionStatus } from '../types';
import { formatCurrency, formatShortDate } from '../utils/formatters';
import { calculateProfitSplit, fromCents } from '../utils/profitEngine';
import { UserAvatar } from '../components/ui/Avatar';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { NoPasswordNotice, RiskWarningNotice } from '../components/ui/RiskBanner';
import { EmptyState } from '../components/ui/States';

function statusTone(
  status: ConnectionStatus
): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'active' || status === 'accepted' || status === 'completed') return 'success';
  if (status === 'pending' || status === 'paused') return 'info';
  if (status === 'rejected') return 'danger';
  return 'neutral';
}

export function RequestsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTraderParam = searchParams.get('trader');

  const {
    db,
    settings,
    currentUser,
    currentRole,
    publicApprovedTraders,
    simulatedNow,
    sendConnectionRequest,
    cancelConnectionRequest,
    respondToConnectionRequest,
  } = useApp();

  const existingBrokerLink = currentUser
    ? db.brokerLinks.find((b) => b.userId === currentUser.id)
    : undefined;

  const [selectedTraderId, setSelectedTraderId] = useState<string>(
    requestedTraderParam ?? publicApprovedTraders[0]?.id ?? ''
  );
  const [plannedAmount, setPlannedAmount] = useState<string>(
    String(existingBrokerLink?.balanceUsd ?? Math.max(settings.minDepositUsd, 500))
  );
  const [riskComfort, setRiskComfort] = useState<'Low' | 'Medium' | 'Higher'>(
    currentUser?.newTraderPrefs?.riskComfort ?? 'Low'
  );
  const [message, setMessage] = useState<string>(
    'Hello, I read your performance stats and risk tags. I would like to connect under these terms.'
  );
  const [formError, setFormError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'closed'>('all');

  // Reject modal state (for Pro Trader)
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  useEffect(() => {
    if (requestedTraderParam) {
      setSelectedTraderId(requestedTraderParam);
    }
  }, [requestedTraderParam]);

  useEffect(() => {
    if (!currentUser) return;
    const link = db.brokerLinks.find((b) => b.userId === currentUser.id);
    setPlannedAmount(String(link?.balanceUsd ?? Math.max(settings.minDepositUsd, 500)));
    setRiskComfort(currentUser.newTraderPrefs?.riskComfort ?? 'Low');
    setFormError('');
  }, [currentUser?.id]);

  const targetTrader = useMemo(() => {
    return (
      publicApprovedTraders.find(
        (t) => t.id === selectedTraderId || t.userId === selectedTraderId
      ) ?? db.traderProfiles.find((t) => t.id === selectedTraderId || t.userId === selectedTraderId)
    );
  }, [publicApprovedTraders, db.traderProfiles, selectedTraderId]);

  // Example split using profitEngine ($100 sample profit)
  const exampleSplit = useMemo(() => {
    const proShare = targetTrader?.askedProfitSharePercent ?? settings.defaultProTraderSharePercent;
    return calculateProfitSplit({
      startingBalanceUsd: 1000,
      endingBalanceUsd: 1100,
      depositsDuringPeriodUsd: 0,
      withdrawalsDuringPeriodUsd: 0,
      highWaterMarkUsd: 1000,
      proSharePercent: proShare,
      platformCommissionPercent: settings.platformCommissionPercent,
    });
  }, [targetTrader?.askedProfitSharePercent, settings]);

  if (!currentUser) {
    return (
      <EmptyState
        title="Log in to manage requests"
        message="Log in as a New Trader or Professional Trader (or use Demo Tools) to send and review Requests to Connect."
        actionLabel="Go to Log in"
        onAction={() => navigate('/login')}
      />
    );
  }

  const isPro = currentRole === 'pro_trader';
  const myRequests = db.connections.filter((c) =>
    isPro ? c.proTraderId === currentUser.id : c.newTraderId === currentUser.id
  );

  const filteredRequests = myRequests.filter((c) => {
    if (statusFilter === 'pending') return c.status === 'pending';
    if (statusFilter === 'accepted') return ['accepted', 'active', 'paused'].includes(c.status);
    if (statusFilter === 'closed')
      return ['rejected', 'cancelled', 'expired', 'completed'].includes(c.status);
    return true;
  });

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!targetTrader) {
      setFormError('Please pick a verified trader first.');
      return;
    }
    const res = sendConnectionRequest({
      newTraderId: currentUser.id,
      proTraderProfileId: targetTrader.id,
      plannedAmountUsd: Number(plannedAmount),
      riskComfort,
      message,
    });
    if (!res.ok) {
      setFormError(res.error ?? 'Could not send request.');
      return;
    }
    if (requestedTraderParam) {
      setSearchParams({}, { replace: true });
    }
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTargetId) return;
    setRejectError('');
    const res = respondToConnectionRequest(rejectTargetId, 'rejected', rejectReason);
    if (!res.ok) {
      setRejectError(res.error ?? 'Please provide a short reason.');
      return;
    }
    setRejectTargetId(null);
    setRejectReason('');
  };

  const canSeeContact = (status: ConnectionStatus) =>
    ['accepted', 'active', 'paused', 'completed'].includes(status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {isPro ? 'Professional Trader Inbox' : 'New Trader Connection Flow'}
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            {isPro ? TEXTS.requests.titlePro : TEXTS.requests.titleNew}
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            {isPro ? TEXTS.requests.subtitlePro : TEXTS.requests.subtitleNew}
          </p>
        </div>

        {!isPro && (
          <Link to="/traders">
            <Button variant="secondary" size="sm">
              <span>Browse verified traders</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </Link>
        )}
      </div>

      <RiskWarningNotice />

      {/* Send Request Form (for New Traders, especially when arriving via ?trader=...) */}
      {currentRole === 'new_trader' && (
        <Card padding="lg" className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                Send a Request to Connect
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Requests expire automatically after {settings.requestExpiryDays} days if unanswered.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Clock: {formatShortDate(simulatedNow.toISOString())}
            </span>
          </div>

          <NoPasswordNotice />

          <form onSubmit={handleSendRequest} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="req-trader-select"
                  className="text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  Choose verified Professional Trader
                </label>
                <select
                  id="req-trader-select"
                  value={targetTrader?.id ?? ''}
                  onChange={(e) => setSelectedTraderId(e.target.value)}
                  className="min-h-[44px] w-full rounded-full px-4 py-2 text-sm bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
                >
                  {publicApprovedTraders.map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white"
                    >
                      {t.displayName} · {t.askedProfitSharePercent}% Pro share ·{' '}
                      {t.isOpenForRequests ? 'Open' : 'Closed'}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Planned starting amount (USD)"
                type="number"
                min={0}
                value={plannedAmount}
                onChange={(e) => setPlannedAmount(e.target.value)}
                hint={`Minimum from Settings: ${formatCurrency(settings.minDepositUsd)}`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="req-risk-comfort"
                  className="text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  Your risk comfort
                </label>
                <select
                  id="req-risk-comfort"
                  value={riskComfort}
                  onChange={(e) =>
                    setRiskComfort(e.target.value as 'Low' | 'Medium' | 'Higher')
                  }
                  className="min-h-[44px] w-full rounded-full px-4 py-2 text-sm bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
                >
                  <option value="Low" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">
                    Low (smaller drawdown preferred)
                  </option>
                  <option value="Medium" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">
                    Medium (balanced)
                  </option>
                  <option value="Higher" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">
                    Higher (accept bigger swings)
                  </option>
                </select>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3.5 text-xs bg-slate-50/70 dark:bg-white/[0.02] space-y-1">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Terms preview (from Settings + {targetTrader?.displayName ?? 'Trader'})
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  Max drawdown limit: <span className="font-mono">{settings.maxDrawdownPercent}%</span> ·
                  Notice: <span className="font-mono">{settings.cancellationNoticeDays} days</span> ·
                  Settlement: <span className="capitalize">{settings.settlementPeriod}</span>
                </p>
                <p className="font-mono text-emerald-700 dark:text-emerald-300">
                  Example on $100 new profit: You {formatCurrency(fromCents(exampleSplit.newTraderCents))} ·
                  Pro {formatCurrency(fromCents(exampleSplit.proNetCents))} ·
                  Platform {formatCurrency(fromCents(exampleSplit.platformCommissionCents))}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="req-message"
                className="text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                Short message to the Professional Trader
              </label>
              <textarea
                id="req-message"
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 text-sm bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {formError && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-700 dark:text-red-300">
                {formError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{TEXTS.requests.contactHiddenNote}</span>
              </span>
              <Button type="submit">
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>Send Request to Connect</span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'all', label: `All (${myRequests.length})` },
            {
              id: 'pending',
              label: `Pending (${myRequests.filter((c) => c.status === 'pending').length})`,
            },
            {
              id: 'accepted',
              label: `Accepted / Active (${
                myRequests.filter((c) => ['accepted', 'active', 'paused'].includes(c.status)).length
              })`,
            },
            {
              id: 'closed',
              label: `Closed / Expired (${
                myRequests.filter((c) =>
                  ['rejected', 'cancelled', 'expired', 'completed'].includes(c.status)
                ).length
              })`,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`min-h-[40px] px-4 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
              statusFilter === tab.id
                ? 'bg-emerald-500 text-slate-950 border-emerald-500 dark:bg-emerald-400'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <EmptyState
          title="No connection requests here yet"
          message={
            isPro
              ? 'New Trader requests sent to your profile will appear here.'
              : 'Pick a verified Professional Trader above or from Find Traders to send a Request to Connect.'
          }
          actionLabel={isPro ? 'Open my Pro profile' : 'Find Traders'}
          onAction={() => navigate(isPro ? '/profile-editor' : '/traders')}
        />
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((conn: Connection) => {
            const counterpartyUser = db.users.find((u) =>
              isPro ? u.id === conn.newTraderId : u.id === conn.proTraderId
            );
            const proProfile = db.traderProfiles.find((p) => p.userId === conn.proTraderId);
            const unlocked = canSeeContact(conn.status);

            return (
              <Card key={conn.id} padding="lg" className="space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      src={isPro ? counterpartyUser?.avatarUrl : proProfile?.avatarUrl ?? counterpartyUser?.avatarUrl}
                      name={
                        isPro
                          ? counterpartyUser?.fullName ?? 'New Trader'
                          : proProfile?.displayName ?? counterpartyUser?.fullName ?? 'Professional Trader'
                      }
                      color={proProfile?.avatarColor}
                      size="md"
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-bold text-slate-950 dark:text-white">
                          {isPro
                            ? counterpartyUser?.fullName ?? 'New Trader'
                            : proProfile?.displayName ?? counterpartyUser?.fullName ?? 'Professional Trader'}
                        </h3>
                        <StatusBadge
                          tone={statusTone(conn.status)}
                          label={conn.status.toUpperCase()}
                        />
                      </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Planned deposit:{' '}
                      <strong className="font-mono text-slate-900 dark:text-white">
                        {formatCurrency(conn.plannedAmountUsd)}
                      </strong>{' '}
                      · Split:{' '}
                      <span className="font-mono">
                        {conn.snapshot.newTraderSharePercent}% New /{' '}
                        {conn.snapshot.proTraderSharePercent -
                          conn.snapshot.platformCommissionPercent}
                        % Pro / {conn.snapshot.platformCommissionPercent}% Platform
                      </span>
                    </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <CalendarClock className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                    <span>
                      {conn.status === 'pending'
                        ? `Expires ${formatShortDate(conn.expiresAt)}`
                        : `Sent ${formatShortDate(conn.createdAt)}`}
                    </span>
                  </div>
                </div>

                {/* Request message & risk */}
                {conn.requestMessage && (
                  <p className="text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-3.5 border border-slate-200/80 dark:border-white/8">
                    &ldquo;{conn.requestMessage}&rdquo;
                    {conn.riskComfort && (
                      <span className="block mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Risk comfort: {conn.riskComfort}
                      </span>
                    )}
                  </p>
                )}

                {conn.rejectionReason && (
                  <div className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Reason: {conn.rejectionReason}</span>
                  </div>
                )}

                {/* Contact Visibility Guardrail (Section L) */}
                {unlocked && counterpartyUser ? (
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-medium">
                      <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Contact details unlocked (request accepted)</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-slate-800 dark:text-slate-100 font-mono text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                        {counterpartyUser.email}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                        {counterpartyUser.phone}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{TEXTS.requests.contactHiddenNote}</span>
                  </div>
                )}

                {/* Status Timeline */}
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status timeline
                  </p>
                  <div className="space-y-2 border-l-2 border-emerald-500/30 pl-3.5">
                    {conn.history.map((item, idx) => (
                      <div key={`${conn.id}-h-${idx}`} className="text-xs space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold capitalize text-slate-900 dark:text-white">
                            {item.status}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            by {item.changedByName} · {formatShortDate(item.changedAt)}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                  {proProfile && !isPro ? (
                    <Link
                      to={`/traders/${proProfile.id}`}
                      className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      View trader profile →
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      ID: <span className="font-mono">{conn.id}</span>
                    </span>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {['accepted', 'active', 'paused', 'completed'].includes(conn.status) && (
                      <Link to={`/connections/${conn.id}`}>
                        <Button size="sm" variant="secondary">
                          <span>Open Chat &amp; Agreement</span>
                          <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </Link>
                    )}

                    {!isPro && conn.status === 'pending' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => cancelConnectionRequest(conn.id)}
                      >
                        <XCircle className="w-4 h-4" aria-hidden="true" />
                        <span>Cancel request</span>
                      </Button>
                    )}

                    {isPro && conn.status === 'pending' && (
                      <>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setRejectTargetId(conn.id);
                            setRejectReason('');
                            setRejectError('');
                          }}
                        >
                          <XCircle className="w-4 h-4" aria-hidden="true" />
                          <span>Reject</span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => respondToConnectionRequest(conn.id, 'accepted')}
                        >
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                          <span>Accept request</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject Reason Modal */}
      <Modal
        isOpen={Boolean(rejectTargetId)}
        onClose={() => setRejectTargetId(null)}
        title="Decline Request to Connect"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Write a short, polite reason so the New Trader knows why you declined.
          </p>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Example: Currently at capacity for conservative accounts this month."
            className="w-full rounded-2xl px-4 py-3 text-sm bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15 focus:outline-none focus:border-emerald-500"
          />
          {rejectError && (
            <p className="text-xs text-red-600 dark:text-red-400">{rejectError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setRejectTargetId(null)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit">
              Confirm decline
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
