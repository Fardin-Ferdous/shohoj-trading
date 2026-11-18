import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Link2, PauseCircle, PlayCircle, Scale, Square } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { Connection, DisputeCase } from '../../types';
import { formatCurrency, formatShortDate } from '../../utils/formatters';
import { UserAvatar } from '../../components/ui/Avatar';
import { StatusBadge, StatusTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/States';

function connTone(status: Connection['status']): StatusTone {
  if (status === 'active' || status === 'completed') return 'success';
  if (status === 'paused') return 'warning';
  if (status === 'rejected' || status === 'expired') return 'danger';
  return 'info';
}

export function AdminConnectionsDisputesPage({
  defaultTab = 'connections',
}: {
  defaultTab?: 'connections' | 'disputes';
}) {
  const {
    db,
    currentUser,
    currentRole,
    switchRole,
    adminForceConnectionStatus,
    adminUpdateDispute,
    adminMarkReportChecked,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'connections' | 'disputes'>(defaultTab);
  const [connFilter, setConnFilter] = useState<'all' | Connection['status']>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [reasonByConn, setReasonByConn] = useState<Record<string, string>>({});
  const [disputeNoteById, setDisputeNoteById] = useState<Record<string, string>>({});

  const filteredConns = useMemo(() => {
    if (connFilter === 'all') return db.connections;
    return db.connections.filter((c) => c.status === connFilter);
  }, [db.connections, connFilter]);

  if (!currentUser || currentRole !== 'admin') {
    return (
      <EmptyState
        title="Admin Support access only"
        message="Switch to Support or Super Admin in Demo Tools to monitor connections and handle disputes."
        actionLabel="Switch to Support Admin (Demo)"
        onAction={() => switchRole('admin', 'support')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">
            Admin · Operations & Support
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white">
            {activeTab === 'connections' ? 'All Connections Monitor' : 'Disputes & User Reports'}
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Inspect connection timelines, safely pause or end access if needed, and resolve support disputes.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('connections')}
            className={`min-h-[40px] px-4 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'connections'
                ? 'bg-emerald-400 text-slate-950'
                : 'bg-white/6 text-slate-300 border border-white/10'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Connections ({db.connections.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('disputes')}
            className={`min-h-[40px] px-4 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'disputes'
                ? 'bg-emerald-400 text-slate-950'
                : 'bg-white/6 text-slate-300 border border-white/10'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>
              Disputes & Reports (
              {db.disputes.filter((d) => d.status !== 'resolved').length +
                db.reports.filter((r) => r.status === 'open').length}
              )
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'connections' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['all', 'active', 'paused', 'accepted', 'pending', 'completed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setConnFilter(st)}
                className={`min-h-[36px] px-3.5 rounded-full text-xs font-medium capitalize cursor-pointer ${
                  connFilter === st
                    ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                    : 'bg-white/5 text-slate-300 border border-white/10'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {filteredConns.length === 0 ? (
            <EmptyState
              title="No connections in this status"
              message="Pick another status filter above."
            />
          ) : (
            <div className="space-y-4">
              {filteredConns.map((c) => {
                const nt = db.users.find((u) => u.id === c.newTraderId);
                const pt = db.users.find((u) => u.id === c.proTraderId);
                const reasonVal = reasonByConn[c.id] ?? '';
                const expanded = Boolean(expandedIds[c.id]);

                return (
                  <Card key={c.id} padding="lg" className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <UserAvatar src={nt?.avatarUrl} name={nt?.fullName ?? 'New Trader'} size="xs" />
                        <span className="text-sm font-semibold text-white">
                          {nt?.fullName ?? c.newTraderId}
                        </span>
                        <span className="text-xs text-slate-400">connected with</span>
                        <UserAvatar src={pt?.avatarUrl} name={pt?.fullName ?? 'Pro Trader'} size="xs" />
                        <span className="text-sm font-semibold text-white">
                          {pt?.fullName ?? c.proTraderId}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge tone={connTone(c.status)} label={c.status.toUpperCase()} />
                        <span className="font-mono text-xs text-slate-400">#{c.id}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-slate-400">Balance</p>
                        <p className="font-mono text-sm font-semibold text-white">
                          {formatCurrency(c.currentBalanceUsd)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Locked Split Snapshot</p>
                        <p className="font-mono text-sm font-semibold text-emerald-400">
                          {c.snapshot.newTraderSharePercent}/{c.snapshot.proTraderSharePercent} (
                          {c.snapshot.platformCommissionPercent}% fee)
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Max Drawdown Limit</p>
                        <p className="font-mono text-sm font-semibold text-white">
                          {c.snapshot.maxDrawdownPercent}%
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Notice Period</p>
                        <p className="font-mono text-sm font-semibold text-white">
                          {c.snapshot.cancellationNoticeDays} days
                        </p>
                      </div>
                    </div>

                    {/* Admin Override Actions */}
                    {['active', 'paused'].includes(c.status) && (
                      <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                        <input
                          type="text"
                          value={reasonVal}
                          onChange={(e) =>
                            setReasonByConn((prev) => ({ ...prev, [c.id]: e.target.value }))
                          }
                          placeholder="Reason for Admin action (required)..."
                          className="min-h-[40px] flex-1 rounded-full px-4 text-xs bg-white/5 text-white border border-white/15"
                        />
                        <div className="flex flex-wrap gap-2">
                          {c.status === 'active' ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                adminForceConnectionStatus(
                                  c.id,
                                  'pause',
                                  reasonVal || 'Paused by Support Admin for review.'
                                )
                              }
                            >
                              <PauseCircle className="w-4 h-4" />
                              <span>Force Pause</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() =>
                                adminForceConnectionStatus(
                                  c.id,
                                  'resume',
                                  reasonVal || 'Resumed after Admin review.'
                                )
                              }
                            >
                              <PlayCircle className="w-4 h-4" />
                              <span>Resume</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              adminForceConnectionStatus(
                                c.id,
                                'complete',
                                reasonVal || 'Connection ended by Admin and access removed.'
                              )
                            }
                          >
                            <Square className="w-3.5 h-3.5" />
                            <span>End Connection</span>
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* History Toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedIds((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
                      className="text-xs font-medium text-emerald-400 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Status History ({c.history.length})</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>

                    {expanded && (
                      <div className="space-y-2 border-l-2 border-white/15 pl-3 text-xs">
                        {c.history.map((h, i) => (
                          <div key={i}>
                            <p className="text-white font-medium">
                              {h.status.toUpperCase()} · {h.changedByName} · {formatShortDate(h.changedAt)}
                            </p>
                            <p className="text-slate-400">{h.reason}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Disputes */}
          <div className="space-y-4">
            <h2 className="font-display text-lg font-bold text-white">Support Disputes</h2>
            {db.disputes.length === 0 ? (
              <EmptyState title="No disputes yet" message="User-opened disputes appear here." />
            ) : (
              db.disputes.map((d: DisputeCase) => {
                const noteVal = disputeNoteById[d.id] ?? d.resolutionNote ?? '';
                return (
                  <Card key={d.id} padding="lg" className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-display text-base font-bold text-white">{d.reason}</p>
                        <p className="text-xs text-slate-400">
                          Case #{d.id} · Connection #{d.connectionId} · Opened by{' '}
                          <strong className="text-slate-200">{d.openedByName}</strong> against{' '}
                          <strong className="text-slate-200">{d.againstName}</strong> ·{' '}
                          {formatShortDate(d.createdAt)}
                        </p>
                      </div>
                      <StatusBadge
                        tone={d.status === 'resolved' ? 'success' : d.status === 'under_review' ? 'info' : 'warning'}
                        label={d.status.replace('_', ' ').toUpperCase()}
                      />
                    </div>

                    <p className="text-sm text-slate-200 rounded-xl bg-white/[0.03] border border-white/8 p-3">
                      {d.details}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="text"
                        value={noteVal}
                        onChange={(e) =>
                          setDisputeNoteById((prev) => ({ ...prev, [d.id]: e.target.value }))
                        }
                        placeholder="Support review note / final decision..."
                        className="min-h-[42px] flex-1 rounded-full px-4 text-xs bg-white/5 text-white border border-white/15"
                      />
                      <div className="flex gap-2">
                        {d.status === 'open' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => adminUpdateDispute(d.id, 'under_review', noteVal)}
                          >
                            Mark Under Review
                          </Button>
                        )}
                        {d.status !== 'resolved' && (
                          <Button
                            size="sm"
                            onClick={() =>
                              adminUpdateDispute(
                                d.id,
                                'resolved',
                                noteVal || 'Reviewed connection timeline and High-Water Mark math cleanly.'
                              )
                            }
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Resolve & Close</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* User Reports */}
          <div className="space-y-4">
            <h2 className="font-display text-lg font-bold text-white">Trader & User Reports</h2>
            {db.reports.length === 0 ? (
              <EmptyState title="No user reports" message="Reports submitted against traders or users appear here." />
            ) : (
              db.reports.map((rep) => (
                <Card key={rep.id} padding="sm" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white text-sm">
                        {rep.reporterName} reported {rep.targetName}
                      </p>
                      <StatusBadge
                        tone={rep.status === 'checked' ? 'success' : 'warning'}
                        label={rep.status === 'checked' ? 'Checked' : 'Open'}
                      />
                    </div>
                    <p className="text-xs text-amber-300">{rep.reason}</p>
                    <p className="text-xs text-slate-300">{rep.details}</p>
                  </div>
                  {rep.status === 'open' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => adminMarkReportChecked(rep.id)}
                    >
                      Mark Checked
                    </Button>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
