import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Flag,
  HelpCircle,
  MessageSquareWarning,
  Paperclip,
  Scale,
  Send,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { DisputeCase } from '../types';
import { formatShortDate } from '../utils/formatters';
import { UserAvatar } from '../components/ui/Avatar';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { HelpTip } from '../components/ui/HelpTip';
import { Modal } from '../components/ui/Modal';
import { RiskWarningNotice } from '../components/ui/RiskBanner';
import { EmptyState } from '../components/ui/States';

const DISPUTE_REASONS = [
  'Profit or fee calculation disagreement',
  'Risk limit not respected',
  'Open-trade cancellation rule disagreement',
  'Broker access or stopping issue',
  'Other connection issue',
];

const REPORT_REASONS = [
  'Asked for MT5 master password',
  'Asked to pay or chat outside Shohoj Trading',
  'Promised guaranteed or sure profit',
  'Misleading profile or fake claims',
  'Risk limit or trading rule concern',
];

export function DisputesPage() {
  const navigate = useNavigate();
  const {
    db,
    currentUser,
    currentRole,
    openDispute,
    requestDisputeReview,
    reportTraderOrUser,
    pushToast,
  } = useApp();

  const [tab, setTab] = useState<'disputes' | 'reports' | 'new'>('disputes');
  const [statusFilter, setStatusFilter] = useState<'all' | DisputeCase['status']>('all');

  // Open Dispute form state
  const myConnections = useMemo(() => {
    if (!currentUser) return [];
    return db.connections.filter(
      (c) => c.newTraderId === currentUser.id || c.proTraderId === currentUser.id
    );
  }, [db.connections, currentUser]);

  const [disputeConnId, setDisputeConnId] = useState<string>(myConnections[0]?.id ?? '');
  const [disputeReason, setDisputeReason] = useState(DISPUTE_REASONS[0]);
  const [disputeDetails, setDisputeDetails] = useState('');
  const [evidenceFileName, setEvidenceFileName] = useState('');
  const [disputeError, setDisputeError] = useState('');

  // Report Trader/User form state
  const reportableUsers = useMemo(() => {
    if (!currentUser) return [];
    return db.users.filter((u) => u.id !== currentUser.id && u.role !== 'admin');
  }, [db.users, currentUser]);

  const [reportUserId, setReportUserId] = useState<string>(reportableUsers[0]?.id ?? '');
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [reportError, setReportError] = useState('');

  // Ask for review modal state
  const [reviewTarget, setReviewTarget] = useState<DisputeCase | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewError, setReviewError] = useState('');

  const myDisputes = useMemo(() => {
    if (!currentUser) return [];
    return db.disputes.filter(
      (d) => d.openedByUserId === currentUser.id || d.againstUserId === currentUser.id
    );
  }, [db.disputes, currentUser]);

  const filteredDisputes = useMemo(() => {
    if (statusFilter === 'all') return myDisputes;
    return myDisputes.filter((d) => d.status === statusFilter);
  }, [myDisputes, statusFilter]);

  const myReports = useMemo(() => {
    if (!currentUser) return [];
    return db.reports.filter((r) => r.reporterUserId === currentUser.id);
  }, [db.reports, currentUser]);

  if (!currentUser) {
    return (
      <EmptyState
        title="Log in to open Disputes & Support"
        message="Log in or choose a trader in Demo Tools to open a dispute, upload evidence, or report a user."
        actionLabel="Go to Log in"
        onAction={() => navigate('/login')}
      />
    );
  }

  if (currentRole === 'admin') {
    return (
      <EmptyState
        title="Admin Support Queue"
        message="Admins handle all platform disputes and user reports from the Admin Disputes & Reports page."
        actionLabel="Open Admin Disputes Queue"
        onAction={() => navigate('/admin/disputes')}
      />
    );
  }

  const handleEvidencePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext)) {
      pushToast('Please upload a JPG, PNG, or PDF file only.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      pushToast('File must be 5 MB or smaller.', 'error');
      return;
    }
    setEvidenceFileName(file.name);
  };

  const handleOpenDispute = (e: React.FormEvent) => {
    e.preventDefault();
    setDisputeError('');
    const chosenConn = disputeConnId || myConnections[0]?.id;
    if (!chosenConn) {
      setDisputeError('You need at least one connection before opening a connection dispute.');
      return;
    }
    const res = openDispute({
      connectionId: chosenConn,
      userId: currentUser.id,
      reason: disputeReason,
      details: disputeDetails,
      evidenceFileName: evidenceFileName || undefined,
    });
    if (!res.ok) {
      setDisputeError(res.error ?? 'Could not open dispute.');
      return;
    }
    setDisputeDetails('');
    setEvidenceFileName('');
    setTab('disputes');
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    setReportError('');
    const targetId = reportUserId || reportableUsers[0]?.id;
    if (!targetId) {
      setReportError('Please select a trader or user.');
      return;
    }
    const res = reportTraderOrUser({
      reporterId: currentUser.id,
      targetUserId: targetId,
      reason: reportReason,
      details: reportDetails,
    });
    if (!res.ok) {
      setReportError(res.error ?? 'Could not submit report.');
      return;
    }
    setReportDetails('');
    setTab('reports');
  };

  const handleConfirmReviewRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;
    setReviewError('');
    const res = requestDisputeReview(reviewTarget.id, currentUser.id, reviewNote);
    if (!res.ok) {
      setReviewError(res.error ?? 'Please write a short reason.');
      return;
    }
    setReviewTarget(null);
    setReviewNote('');
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-emerald-400">Support &amp; Safety Hub</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white inline-flex items-center gap-2">
            <span>Disputes &amp; User Reports</span>
            <HelpTip
              term="Disputes vs. Reports"
              explanation="Open a dispute for a connection math or trade disagreement. Report a trader or user anytime someone breaks safety rules."
            />
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-300">
            Track open cases, attach supporting files, report rule breaks, or ask Support for a review.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setTab('new')}
        >
          <MessageSquareWarning className="w-4 h-4" aria-hidden="true" />
          <span>Open Dispute / Report</span>
        </Button>
      </div>

      <RiskWarningNotice />

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'disputes', label: `My Disputes (${myDisputes.length})` },
            { id: 'reports', label: `My Reports (${myReports.length})` },
            { id: 'new', label: 'New Dispute or Report' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`min-h-[40px] px-4 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-colors ${
              tab === item.id
                ? 'bg-emerald-400 text-slate-950 border-emerald-400'
                : 'border-white/15 text-slate-300 hover:bg-white/10'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* TAB 1: DISPUTES LIST */}
      {tab === 'disputes' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'open', 'under_review', 'resolved'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`min-h-[36px] px-3.5 rounded-full text-xs font-medium capitalize cursor-pointer ${
                  statusFilter === st
                    ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                    : 'bg-white/5 text-slate-300 border border-white/10'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {filteredDisputes.length === 0 ? (
            <EmptyState
              title="No disputes in this status"
              message="If you ever disagree about a profit split, drawdown limit, or open-trade rule, open a dispute with your full connection record."
              actionLabel="Open a Dispute"
              onAction={() => setTab('new')}
            />
          ) : (
            <div className="space-y-4">
              {filteredDisputes.map((d) => {
                const otherId =
                  d.openedByUserId === currentUser.id ? d.againstUserId : d.openedByUserId;
                const otherUser = db.users.find((u) => u.id === otherId);

                return (
                  <Card key={d.id} padding="lg" className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={otherUser?.avatarUrl}
                          name={otherUser?.fullName ?? d.againstName}
                          size="sm"
                        />
                        <div>
                          <p className="font-display text-base font-bold text-white">{d.reason}</p>
                          <p className="text-xs text-slate-400">
                            Case <span className="font-mono">#{d.id}</span> · Connection{' '}
                            <span className="font-mono">#{d.connectionId}</span> ·{' '}
                            {formatShortDate(d.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {d.reviewRequested && (
                          <StatusBadge tone="info" label="Review Requested" />
                        )}
                        <StatusBadge
                          tone={
                            d.status === 'resolved'
                              ? 'success'
                              : d.status === 'under_review'
                              ? 'info'
                              : 'warning'
                          }
                          label={d.status.replace('_', ' ').toUpperCase()}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl bg-white/[0.03] border border-white/8 p-3">
                        <span className="text-slate-400 block">Opened by</span>
                        <strong className="text-white">{d.openedByName}</strong>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] border border-white/8 p-3">
                        <span className="text-slate-400 block">Regarding</span>
                        <strong className="text-white">{d.againstName}</strong>
                      </div>
                    </div>

                    <p className="text-sm text-slate-200 leading-relaxed">{d.details}</p>

                    {d.evidenceFileName && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200">
                        <Paperclip className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                        <span>Evidence file: {d.evidenceFileName}</span>
                      </div>
                    )}

                    {d.resolutionNote && (
                      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-3.5 text-xs sm:text-sm text-emerald-200">
                        <p className="font-semibold inline-flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>Support Decision / Note</span>
                        </p>
                        <p className="mt-1 text-slate-200">{d.resolutionNote}</p>
                      </div>
                    )}

                    {d.reviewRequested && d.reviewRequestNote && (
                      <div className="rounded-2xl border border-sky-500/25 bg-sky-500/8 p-3 text-xs text-sky-200">
                        <strong>Your review note:</strong> {d.reviewRequestNote}
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                      <Link
                        to={`/connections/${d.connectionId}`}
                        className="text-xs font-medium text-emerald-400 hover:underline"
                      >
                        View connection &amp; agreement →
                      </Link>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setReviewTarget(d);
                          setReviewNote('');
                          setReviewError('');
                        }}
                      >
                        <Scale className="w-4 h-4" aria-hidden="true" />
                        <span>Ask for review</span>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY REPORTS */}
      {tab === 'reports' && (
        <div className="space-y-4">
          {myReports.length === 0 ? (
            <EmptyState
              title="No reports sent"
              message="You have not reported any trader or user yet. Use the button above if anyone breaks safety rules."
              actionLabel="Report a Trader / User"
              onAction={() => setTab('new')}
            />
          ) : (
            myReports.map((r) => {
              const targetUser = db.users.find((u) => u.id === r.targetUserId);
              return (
                <Card key={r.id} padding="md" className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={targetUser?.avatarUrl}
                        name={targetUser?.fullName ?? r.targetName}
                        size="sm"
                      />
                      <div>
                        <p className="font-semibold text-white text-sm">
                          Report against {r.targetName}
                        </p>
                        <p className="text-xs text-amber-300">{r.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        tone={r.status === 'checked' ? 'success' : 'warning'}
                        label={r.status === 'checked' ? 'Checked by Support' : 'Open'}
                      />
                      <span className="text-xs text-slate-400 font-mono">
                        {formatShortDate(r.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300">{r.details}</p>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: NEW DISPUTE + NEW REPORT FORMS */}
      {tab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Form A: Open a Dispute */}
          <Card padding="lg" className="space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                <span>Open a Connection Dispute</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Attaches your signed agreement snapshot, High-Water Mark history, and evidence file for Support.
              </p>
            </div>

            <form onSubmit={handleOpenDispute} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="disp-conn" className="text-sm font-medium text-slate-200">
                  Select connection
                </label>
                <select
                  id="disp-conn"
                  value={disputeConnId || myConnections[0]?.id || ''}
                  onChange={(e) => setDisputeConnId(e.target.value)}
                  className="min-h-[44px] rounded-full px-4 bg-white/5 text-white border border-white/15 text-sm"
                >
                  {myConnections.length === 0 ? (
                    <option value="" className="bg-[#0d1612]">
                      No connections available
                    </option>
                  ) : (
                    myConnections.map((c) => {
                      const otherId =
                        c.newTraderId === currentUser.id ? c.proTraderId : c.newTraderId;
                      const other = db.users.find((u) => u.id === otherId);
                      return (
                        <option key={c.id} value={c.id} className="bg-[#0d1612]">
                          #{c.id} · {other?.fullName ?? 'Trader'} ({c.status})
                        </option>
                      );
                    })
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="disp-reason" className="text-sm font-medium text-slate-200">
                  Reason
                </label>
                <select
                  id="disp-reason"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="min-h-[44px] rounded-full px-4 bg-white/5 text-white border border-white/15 text-sm"
                >
                  {DISPUTE_REASONS.map((r) => (
                    <option key={r} value={r} className="bg-[#0d1612]">
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="disp-details" className="text-sm font-medium text-slate-200">
                  Explain what happened
                </label>
                <textarea
                  id="disp-details"
                  rows={3}
                  value={disputeDetails}
                  onChange={(e) => setDisputeDetails(e.target.value)}
                  placeholder="Write clear dates, dollar amounts, or rule concerns..."
                  className="w-full rounded-2xl px-4 py-3 text-sm bg-white/5 text-white border border-white/15 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="space-y-2">
                <span className="block text-sm font-medium text-slate-200">
                  Evidence file (optional · JPG, PNG, PDF up to 5 MB)
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="min-h-[42px] inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 cursor-pointer">
                    <FileUp className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                    <span>Choose file</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="sr-only"
                      onChange={handleEvidencePick}
                    />
                  </label>
                  {evidenceFileName && (
                    <span className="text-xs text-emerald-300 font-mono">{evidenceFileName}</span>
                  )}
                </div>
              </div>

              {disputeError && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  {disputeError}
                </div>
              )}

              <Button type="submit" fullWidth disabled={myConnections.length === 0}>
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>Submit dispute</span>
              </Button>
            </form>
          </Card>

          {/* Form B: Report a Trader or User */}
          <Card padding="lg" className="space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-400" aria-hidden="true" />
                <span>Report a Trader or User</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Tell Support right away if anyone asks for an MT5 master password, off-platform payments, or promises guaranteed profit.
              </p>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rep-user" className="text-sm font-medium text-slate-200">
                  Select trader or user
                </label>
                <select
                  id="rep-user"
                  value={reportUserId || reportableUsers[0]?.id || ''}
                  onChange={(e) => setReportUserId(e.target.value)}
                  className="min-h-[44px] rounded-full px-4 bg-white/5 text-white border border-white/15 text-sm"
                >
                  {reportableUsers.map((u) => (
                    <option key={u.id} value={u.id} className="bg-[#0d1612]">
                      {u.fullName} ({u.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="rep-reason" className="text-sm font-medium text-slate-200">
                  Safety rule broken
                </label>
                <select
                  id="rep-reason"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="min-h-[44px] rounded-full px-4 bg-white/5 text-white border border-white/15 text-sm"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r} className="bg-[#0d1612]">
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="rep-details" className="text-sm font-medium text-slate-200">
                  Short details
                </label>
                <textarea
                  id="rep-details"
                  rows={4}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Describe what they said or showed so Support can review..."
                  className="w-full rounded-2xl px-4 py-3 text-sm bg-white/5 text-white border border-white/15 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {reportError && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  {reportError}
                </div>
              )}

              <Button type="submit" variant="danger" fullWidth>
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                <span>Send safety report</span>
              </Button>
            </form>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-xs text-slate-400 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Need general help instead? Visit our{' '}
                <Link to="/help" className="text-emerald-400 underline">
                  Help Center
                </Link>{' '}
                or{' '}
                <Link to="/contact" className="text-emerald-400 underline">
                  Contact Support
                </Link>
                .
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Ask For Review Modal */}
      <Modal
        isOpen={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title={`Ask Support for review · #${reviewTarget?.id ?? ''}`}
      >
        <form onSubmit={handleConfirmReviewRequest} className="space-y-4">
          <p className="text-sm text-slate-300">
            Tell the Shohoj Support team what you want them to double-check on this dispute.
          </p>
          <textarea
            rows={3}
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Example: Please re-check the High-Water Mark calculation after my partial withdrawal."
            className="w-full rounded-2xl px-4 py-3 text-sm bg-white/5 text-white border border-white/15 focus:outline-none focus:border-emerald-400"
          />
          {reviewError && <p className="text-xs text-red-400">{reviewError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setReviewTarget(null)}>
              Cancel
            </Button>
            <Button type="submit">Send review request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
