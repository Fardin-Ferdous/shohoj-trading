import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ExternalLink, ShieldAlert, XCircle } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { computeShohojScore, RISKY_TAGS } from '../../utils/shohojScore';
import { UserAvatar } from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/States';

type QueueTab = 'queue' | 'approved' | 'rejected';

export function AdminVerifyPage() {
  const { db, settings, currentUser, currentRole, switchRole, adminVerifyTrader } = useApp();
  const [tab, setTab] = useState<QueueTab>('queue');
  const [notesByUserId, setNotesByUserId] = useState<Record<string, string>>({});
  const [errorByUserId, setErrorByUserId] = useState<Record<string, string>>({});

  const filteredProfiles = useMemo(() => {
    return db.traderProfiles.filter((p) => {
      if (tab === 'queue') {
        return !p.isApproved && p.proAccountLink?.reviewStatus !== 'rejected';
      }
      if (tab === 'approved') {
        return p.isApproved;
      }
      return p.proAccountLink?.reviewStatus === 'rejected';
    });
  }, [db.traderProfiles, tab]);

  if (!currentUser || currentRole !== 'admin') {
    return (
      <EmptyState
        title="Admin Verifier access only"
        message="Switch to Verifier or Super Admin in Demo Tools to review Professional Traders."
        actionLabel="Switch to Verifier (Demo)"
        onAction={() => switchRole('admin', 'verifier')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">
            Admin · Verifier Queue
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white">
            Verify Professional Traders
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Check KYC, real Exness link, minimum history ({settings.minHistoryMonths} months &{' '}
            {settings.minTradeCount} trades from Settings), risky styles, and cheating warning flags.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              {
                key: 'queue',
                label: `Waiting Queue (${
                  db.traderProfiles.filter(
                    (p) => !p.isApproved && p.proAccountLink?.reviewStatus !== 'rejected'
                  ).length
                })`,
              },
              {
                key: 'approved',
                label: `Approved (${db.traderProfiles.filter((p) => p.isApproved).length})`,
              },
              {
                key: 'rejected',
                label: `Rejected (${
                  db.traderProfiles.filter((p) => p.proAccountLink?.reviewStatus === 'rejected').length
                })`,
              },
            ] as { key: QueueTab; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`min-h-[38px] px-4 rounded-full text-xs font-semibold cursor-pointer ${
                tab === t.key
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-white/6 text-slate-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {filteredProfiles.length === 0 ? (
        <EmptyState
          title="No traders in this list"
          message="Try another tab above to review approved or rejected Professional Traders."
        />
      ) : (
        <div className="space-y-5">
          {filteredProfiles.map((p) => {
            const user = db.users.find((u) => u.id === p.userId);
            const score = computeShohojScore(p, settings.shohojScoreWeights);
            const monthsOk = p.ownAccountStats.historyMonths >= settings.minHistoryMonths;
            const tradesOk = p.ownAccountStats.tradeCount >= settings.minTradeCount;
            const kycOk = user?.kycStatus === 'approved';
            const riskyStyles = p.riskTags.filter((tag) =>
              (RISKY_TAGS as readonly string[]).includes(tag)
            );
            const highWinLowProfit =
              p.ownAccountStats.winRatePercent >= 70 && p.ownAccountStats.profitFactor < 1.3;
            const nearDdLimit = p.ownAccountStats.maxDrawdownPercent > settings.maxDrawdownPercent * 0.8;
            const noteVal = notesByUserId[p.userId] ?? p.proAccountLink?.reviewNote ?? '';
            const errMsg = errorByUserId[p.userId] ?? '';

            return (
              <Card key={p.id} padding="lg" className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3.5">
                    <UserAvatar
                      src={p.avatarUrl}
                      name={p.displayName}
                      color={p.avatarColor}
                      size="md"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-xl font-bold text-white">
                          {p.displayName}
                        </h2>
                        <StatusBadge
                          tone={p.isApproved ? 'success' : p.proAccountLink?.reviewStatus === 'rejected' ? 'danger' : 'info'}
                          label={
                            p.isApproved
                              ? 'Approved & Public'
                              : p.proAccountLink?.reviewStatus === 'rejected'
                              ? 'Rejected'
                              : 'Waiting Review'
                          }
                        />
                        <span className="text-xs font-mono text-emerald-400">
                          Score {score}/100
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {p.tradingStyle} · {p.country} · Exness{' '}
                        {p.proAccountLink?.accountNumberMasked ?? 'MT5-••••verified'} (
                        {p.proAccountLink?.isRealAccount === false ? 'Demo (Blocked)' : 'Real account'})
                      </p>
                    </div>
                  </div>

                  <Link to={`/traders/${p.id}`}>
                    <Button size="sm" variant="secondary">
                      <span>Preview Profile</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>

                {/* Automated Checks vs Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-slate-400">KYC Status</p>
                    <p className={`mt-1 font-semibold ${kycOk ? 'text-emerald-400' : 'text-amber-300'}`}>
                      {user?.kycStatus.replace('_', ' ').toUpperCase() ?? 'UNKNOWN'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-slate-400">History Length (Min {settings.minHistoryMonths}m)</p>
                    <p className={`mt-1 font-mono font-bold ${monthsOk ? 'text-emerald-400' : 'text-red-400'}`}>
                      {p.ownAccountStats.historyMonths} months ({monthsOk ? 'PASS' : 'TOO SHORT'})
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-slate-400">Real Trades (Min {settings.minTradeCount})</p>
                    <p className={`mt-1 font-mono font-bold ${tradesOk ? 'text-emerald-400' : 'text-red-400'}`}>
                      {p.ownAccountStats.tradeCount} trades ({tradesOk ? 'PASS' : 'TOO FEW'})
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-slate-400">Win Rate / Profit Factor / DD</p>
                    <p className="mt-1 font-mono font-semibold text-white">
                      {p.ownAccountStats.winRatePercent}% · PF {p.ownAccountStats.profitFactor} · DD{' '}
                      {p.ownAccountStats.maxDrawdownPercent}%
                    </p>
                  </div>
                </div>

                {/* Cheating & Risk Warning Flags */}
                {(riskyStyles.length > 0 || highWinLowProfit || nearDdLimit || !monthsOk || !tradesOk || !kycOk) && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2 text-xs">
                    <p className="font-semibold text-amber-300 inline-flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Verifier Safety & Anti-Cheating Flags</span>
                    </p>
                    <ul className="space-y-1 text-slate-200 list-disc pl-5">
                      {!kycOk && <li>Identity check (KYC) is not yet approved.</li>}
                      {(!monthsOk || !tradesOk) && (
                        <li>
                          Account history is below Settings minimum ({settings.minHistoryMonths} months,{' '}
                          {settings.minTradeCount} trades). Keep non-public until ready.
                        </li>
                      )}
                      {riskyStyles.length > 0 && (
                        <li>
                          Risky trading style flagged: <strong>{riskyStyles.join(', ')}</strong>. Ensure public red/amber warning badge stays visible.
                        </li>
                      )}
                      {highWinLowProfit && (
                        <li>
                          Suspicious ratio: High win rate ({p.ownAccountStats.winRatePercent}%) with low Profit Factor ({p.ownAccountStats.profitFactor}) — typical of holding losses without stop loss.
                        </li>
                      )}
                      {nearDdLimit && (
                        <li>
                          Max drawdown ({p.ownAccountStats.maxDrawdownPercent}%) is close to the Settings limit ({settings.maxDrawdownPercent}%).
                        </li>
                      )}
                      <li>
                        Best-account check: Compare Own Account ({p.ownAccountStats.accountGrowthPercent}% growth) vs Managed Accounts ({p.managedAccountStats.accountGrowthPercent}% growth) so cherry-picked accounts are caught.
                      </li>
                    </ul>
                  </div>
                )}

                {/* Decision Bar */}
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center pt-2">
                  <input
                    type="text"
                    value={noteVal}
                    onChange={(e) =>
                      setNotesByUserId((prev) => ({ ...prev, [p.userId]: e.target.value }))
                    }
                    placeholder="Verification note or rejection reason..."
                    className="min-h-[44px] flex-1 rounded-full px-4 text-sm bg-white/5 text-white border border-white/15 focus:outline-none focus:border-emerald-400"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const res = adminVerifyTrader(p.userId, 'approved', noteVal);
                        setErrorByUserId((prev) => ({ ...prev, [p.userId]: res.error ?? '' }));
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Publish</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        const res = adminVerifyTrader(p.userId, 'rejected', noteVal);
                        if (!res.ok) {
                          setErrorByUserId((prev) => ({
                            ...prev,
                            [p.userId]: res.error ?? 'Enter a reason.',
                          }));
                        } else {
                          setErrorByUserId((prev) => ({ ...prev, [p.userId]: '' }));
                        }
                      }}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject with Reason</span>
                    </Button>
                  </div>
                </div>
                {errMsg && (
                  <p className="text-xs text-red-400 inline-flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{errMsg}</span>
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
