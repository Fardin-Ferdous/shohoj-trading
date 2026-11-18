import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  CheckCheck,
  CheckCircle2,
  FileSignature,
  FileText,
  Flag,
  KeyRound,
  Lock,
  Paperclip,
  Printer,
  Send,
  ShieldCheck,
  Unplug,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { TEXTS } from '../texts';
import { AgreementRecord, BrokerAccountLink, OpenTradeRule } from '../types';
import { formatCurrency, formatShortDate } from '../utils/formatters';
import { UserAvatar } from '../components/ui/Avatar';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { NoPasswordNotice, RiskWarningNotice } from '../components/ui/RiskBanner';
import { EmptyState } from '../components/ui/States';
import { Tabs } from '../components/ui/Tabs';

const ACCESS_METHODS: BrokerAccountLink['accessMethod'][] = [
  'Exness copy-trading / social trading link',
  'Broker-approved account management option',
  'Read-only (investor) access for checking results only',
];

function describeOpenTradeRule(rule: OpenTradeRule, hours: number): string {
  if (rule === 'close_immediately') {
    return 'Close all open trades immediately when someone cancels.';
  }
  if (rule === 'let_finish') {
    return 'Let current open trades finish safely, while blocking any new trades.';
  }
  return `Close open trades safely within ${hours} hours when someone cancels, with no new trades allowed.`;
}

export function ConnectionsPage() {
  const { connectionId } = useParams<{ connectionId?: string }>();
  const navigate = useNavigate();

  const {
    db,
    settings,
    currentUser,
    currentRole,
    sendChatMessage,
    markChatMessagesSeen,
    reportChatMessage,
    signAgreement,
    completeAccessStep,
    removeBrokerAccess,
    proposeAgreementChange,
    respondToAgreementChange,
    pushToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'chat' | 'agreement' | 'access'>('chat');
  const [selectedConnId, setSelectedConnId] = useState<string>(connectionId ?? '');

  // Chat state
  const [msgText, setMsgText] = useState('');
  const [attachName, setAttachName] = useState('');
  const [chatError, setChatError] = useState('');
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportError, setReportError] = useState('');

  // Signing state
  const [typedSignature, setTypedSignature] = useState(currentUser?.fullName ?? '');
  const [acceptSignBox, setAcceptSignBox] = useState(false);
  const [signError, setSignError] = useState('');

  // Print & Change Request modals
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [propProShare, setPropProShare] = useState(String(settings.defaultProTraderSharePercent));
  const [propMaxDd, setPropMaxDd] = useState(String(settings.maxDrawdownPercent));
  const [propNotice, setPropNotice] = useState(String(settings.cancellationNoticeDays));
  const [propReason, setPropReason] = useState('');
  const [changeError, setChangeError] = useState('');

  // Account Access checklist state
  const [chosenMethod, setChosenMethod] = useState<BrokerAccountLink['accessMethod']>(
    ACCESS_METHODS[0]
  );
  const [chkMinAccess, setChkMinAccess] = useState(false);
  const [chkShortestTime, setChkShortestTime] = useState(false);
  const [chkRealOnly, setChkRealOnly] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [removeModalOpen, setRemoveModalOpen] = useState(false);

  const eligibleConnections = useMemo(() => {
    if (!currentUser) return [];
    return db.connections.filter(
      (c) =>
        (c.newTraderId === currentUser.id || c.proTraderId === currentUser.id) &&
        ['accepted', 'active', 'paused', 'completed'].includes(c.status)
    );
  }, [db.connections, currentUser]);

  useEffect(() => {
    if (connectionId && eligibleConnections.some((c) => c.id === connectionId)) {
      setSelectedConnId(connectionId);
    } else if (
      (!selectedConnId || !eligibleConnections.some((c) => c.id === selectedConnId)) &&
      eligibleConnections.length > 0
    ) {
      setSelectedConnId(eligibleConnections[0].id);
    }
  }, [connectionId, eligibleConnections, selectedConnId]);

  useEffect(() => {
    if (currentUser) {
      setTypedSignature(currentUser.fullName);
    }
    setAcceptSignBox(false);
    setSignError('');
  }, [currentUser?.id, selectedConnId]);

  const activeConn = useMemo(
    () => eligibleConnections.find((c) => c.id === selectedConnId),
    [eligibleConnections, selectedConnId]
  );

  const activeAgreement: AgreementRecord | undefined = useMemo(() => {
    if (!activeConn) return undefined;
    const found = db.agreements.find((a) => a.connectionId === activeConn.id);
    if (found) return found;
    return {
      id: `agr-preview-${activeConn.id}`,
      connectionId: activeConn.id,
      snapshot: activeConn.snapshot,
      openTradeCloseHours: settings.openTradeCloseHours,
      accessChecklistDone: false,
      accessActive: false,
      createdAt: activeConn.createdAt,
    };
  }, [db.agreements, activeConn, settings.openTradeCloseHours]);

  useEffect(() => {
    if (activeConn && currentUser && activeTab === 'chat') {
      markChatMessagesSeen(activeConn.id, currentUser.id);
    }
  }, [activeConn?.id, currentUser?.id, activeTab, db.chatMessages.length]);

  useEffect(() => {
    if (activeAgreement) {
      setPropProShare(String(activeAgreement.snapshot.proTraderSharePercent));
      setPropMaxDd(String(activeAgreement.snapshot.maxDrawdownPercent));
      setPropNotice(String(activeAgreement.snapshot.cancellationNoticeDays));
      if (activeAgreement.accessMethodChosen) {
        setChosenMethod(activeAgreement.accessMethodChosen);
      }
    }
  }, [activeAgreement?.id, activeAgreement?.snapshot.proTraderSharePercent]);

  if (!currentUser) {
    return (
      <EmptyState
        title="Log in to open Chat & Agreements"
        message="Log in or pick a New Trader / Professional Trader in Demo Tools to chat and sign agreements."
        actionLabel="Go to Log in"
        onAction={() => navigate('/login')}
      />
    );
  }

  if (eligibleConnections.length === 0) {
    return (
      <EmptyState
        title="No accepted connections yet"
        message={
          currentRole === 'admin'
            ? 'Switch to a New Trader (like Arif Rahman or Daniel Tan) or Professional Trader in Demo Tools to test Chat and Agreements.'
            : 'Once a Request to Connect is accepted, your safe chat room, digital agreement, and broker access checklist appear here.'
        }
        actionLabel="Open Requests"
        onAction={() => navigate('/requests')}
      />
    );
  }

  const currentConn = activeConn ?? eligibleConnections[0];
  const isNewTraderUser = currentUser.id === currentConn.newTraderId;
  const newUser = db.users.find((u) => u.id === currentConn.newTraderId);
  const proUser = db.users.find((u) => u.id === currentConn.proTraderId);
  const proProfile = db.traderProfiles.find((p) => p.userId === currentConn.proTraderId);
  const snap = activeAgreement?.snapshot ?? currentConn.snapshot;
  const closeHours = activeAgreement?.openTradeCloseHours ?? settings.openTradeCloseHours;

  const threadMessages = db.chatMessages.filter((m) => m.connectionId === currentConn.id);
  const changeRequests = db.agreementChangeRequests.filter(
    (r) => r.connectionId === currentConn.id
  );

  const userAlreadySigned = isNewTraderUser
    ? Boolean(activeAgreement?.newTraderSignature)
    : Boolean(activeAgreement?.proTraderSignature);
  const bothSigned = Boolean(
    activeAgreement?.newTraderSignature && activeAgreement?.proTraderSignature
  );

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext)) {
      pushToast('Only JPG, PNG, or PDF files are allowed in chat.', 'error');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      pushToast('File must be 5 MB or smaller.', 'error');
      return;
    }
    setAttachName(f.name);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    setChatError('');
    const res = sendChatMessage({
      connectionId: currentConn.id,
      senderId: currentUser.id,
      body: msgText,
      attachmentName: attachName || undefined,
    });
    if (!res.ok) {
      setChatError(res.error ?? 'Could not send message.');
      return;
    }
    setMsgText('');
    setAttachName('');
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTargetId) return;
    setReportError('');
    const res = reportChatMessage(reportTargetId, reportReason);
    if (!res.ok) {
      setReportError(res.error ?? 'Please write a short reason.');
      return;
    }
    setReportTargetId(null);
    setReportReason('');
  };

  const handleSignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSignError('');
    const res = signAgreement({
      connectionId: currentConn.id,
      userId: currentUser.id,
      typedName: typedSignature,
      acceptedTerms: acceptSignBox,
    });
    if (!res.ok) {
      setSignError(res.error ?? 'Could not save signature.');
    }
  };

  const handleAccessConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setAccessError('');
    if (!chkMinAccess || !chkShortestTime || !chkRealOnly) {
      setAccessError('Please confirm all three safety checks before continuing.');
      return;
    }
    const res = completeAccessStep({
      connectionId: currentConn.id,
      accessMethod: chosenMethod,
    });
    if (!res.ok) {
      setAccessError(res.error ?? 'Could not complete access step.');
    }
  };

  const handleProposeChange = (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError('');
    const res = proposeAgreementChange({
      connectionId: currentConn.id,
      userId: currentUser.id,
      proposedProSharePercent: Number(propProShare),
      proposedMaxDrawdownPercent: Number(propMaxDd),
      proposedNoticeDays: Number(propNotice),
      reason: propReason,
    });
    if (!res.ok) {
      setChangeError(res.error ?? 'Invalid proposed terms.');
      return;
    }
    setChangeModalOpen(false);
    setPropReason('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Phase 6 · Safe Connection Workspace
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            {TEXTS.connections.title}
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            {TEXTS.connections.subtitle}
          </p>
        </div>

        <Link to="/requests">
          <Button variant="secondary" size="sm">
            View all requests
          </Button>
        </Link>
      </div>

      <RiskWarningNotice />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Conversation List */}
        <Card padding="sm" className="lg:col-span-4 space-y-2">
          <p className="px-2 pt-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Your Connections ({eligibleConnections.length})
          </p>
          <div className="space-y-1.5">
            {eligibleConnections.map((c) => {
              const isNewViewer = currentUser.id === c.newTraderId;
              const counterpartyUser = db.users.find((u) =>
                u.id === (isNewViewer ? c.proTraderId : c.newTraderId)
              );
              const counterpartyPro = isNewViewer
                ? db.traderProfiles.find((p) => p.userId === c.proTraderId)
                : undefined;
              const otherName = isNewViewer
                ? counterpartyPro?.displayName ?? counterpartyUser?.fullName ?? 'Professional Trader'
                : counterpartyUser?.fullName ?? 'New Trader';
              const otherAvatar = isNewViewer
                ? counterpartyPro?.avatarUrl ?? counterpartyUser?.avatarUrl
                : counterpartyUser?.avatarUrl;
              const active = c.id === currentConn.id;
              const unreadChat = db.chatMessages.filter(
                (m) => m.connectionId === c.id && m.senderId !== currentUser.id && !m.seenByRecipient
              ).length;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedConnId(c.id);
                    navigate(`/connections/${c.id}`, { replace: true });
                  }}
                  className={`w-full text-left rounded-2xl p-3 border transition-colors cursor-pointer ${
                    active
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-slate-200/80 dark:border-white/10 hover:bg-slate-100/70 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserAvatar
                        src={otherAvatar}
                        name={otherName}
                        color={counterpartyPro?.avatarColor}
                        size="xs"
                      />
                      <span className="font-semibold text-sm text-slate-950 dark:text-white truncate">
                        {otherName}
                      </span>
                    </div>
                    <StatusBadge
                      tone={
                        c.status === 'active' || c.status === 'completed'
                          ? 'success'
                          : c.status === 'accepted'
                          ? 'info'
                          : 'warning'
                      }
                      label={c.status}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{formatCurrency(c.plannedAmountUsd)}</span>
                    {unreadChat > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {unreadChat} new msg
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Active Connection Workspace */}
        <div className="lg:col-span-8 space-y-4">
          {/* Summary Header + Progress Checklist */}
          <Card padding="md" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <UserAvatar
                  src={isNewTraderUser ? proProfile?.avatarUrl ?? proUser?.avatarUrl : newUser?.avatarUrl}
                  name={isNewTraderUser ? proProfile?.displayName ?? proUser?.fullName ?? 'Pro Trader' : newUser?.fullName ?? 'New Trader'}
                  color={proProfile?.avatarColor}
                  size="md"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
                      {newUser?.fullName ?? 'New Trader'} ↔{' '}
                      {proProfile?.displayName ?? proUser?.fullName ?? 'Pro Trader'}
                    </h2>
                    <StatusBadge
                      tone={currentConn.status === 'active' ? 'success' : 'info'}
                      label={currentConn.status.toUpperCase()}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Agreed split: {snap.newTraderSharePercent}% New /{' '}
                    {snap.proTraderSharePercent - snap.platformCommissionPercent}% Pro /{' '}
                    {snap.platformCommissionPercent}% Platform
                  </p>
                </div>
              </div>

              <Tabs<'chat' | 'agreement' | 'access'>
                value={activeTab}
                onChange={setActiveTab}
                options={[
                  { value: 'chat', label: 'Chat' },
                  { value: 'agreement', label: 'Agreement & Sign' },
                  { value: 'access', label: 'Account Access' },
                ]}
              />
            </div>

            {/* Activation steps strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-slate-50 dark:bg-white/[0.03]">
                {activeAgreement?.newTraderSignature ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <FileSignature className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="text-slate-700 dark:text-slate-200">
                  1. New Trader {activeAgreement?.newTraderSignature ? 'signed' : 'signature needed'}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-slate-50 dark:bg-white/[0.03]">
                {activeAgreement?.proTraderSignature ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <FileSignature className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="text-slate-700 dark:text-slate-200">
                  2. Pro Trader {activeAgreement?.proTraderSignature ? 'signed' : 'signature needed'}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-slate-50 dark:bg-white/[0.03]">
                {activeAgreement?.accessChecklistDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="text-slate-700 dark:text-slate-200">
                  3. Broker access {activeAgreement?.accessActive ? 'active' : activeAgreement?.accessChecklistDone ? 'removed' : 'pending'}
                </span>
              </div>
            </div>
          </Card>

          {/* TAB 1: IN-PLATFORM CHAT */}
          {activeTab === 'chat' && (
            <Card padding="lg" className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-3.5 flex items-start gap-2.5 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  {TEXTS.connections.safeChatPrefix}{' '}
                  <strong>{snap.commissionProtectionMonths} months</strong>.
                </span>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {threadMessages.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
                    No messages yet. Say hello and confirm your risk limits here.
                  </p>
                ) : (
                  threadMessages.map((m) => {
                    const isMine = m.senderId === currentUser.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm space-y-1.5 border ${
                            isMine
                              ? 'bg-emerald-500/12 border-emerald-500/25 text-slate-900 dark:text-white'
                              : 'bg-slate-100/90 border-slate-200 text-slate-900 dark:bg-white/[0.05] dark:border-white/10 dark:text-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-semibold">{m.senderName}</span>
                            <span>{formatShortDate(m.createdAt)}</span>
                          </div>
                          <p className="leading-relaxed">{m.body}</p>
                          {m.attachmentName && (
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/70 dark:bg-white/10 px-2.5 py-1 text-xs font-mono">
                              <Paperclip className="w-3 h-3" />
                              <span>{m.attachmentName}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-3 pt-1 text-[11px]">
                            {isMine ? (
                              <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                {m.seenByRecipient ? (
                                  <>
                                    <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Seen</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Sent</span>
                                  </>
                                )}
                              </span>
                            ) : (
                              <span />
                            )}

                            {!isMine && !m.isReported && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReportTargetId(m.id);
                                  setReportReason('');
                                  setReportError('');
                                }}
                                className="inline-flex items-center gap-1 text-slate-400 hover:text-red-500 cursor-pointer"
                              >
                                <Flag className="w-3 h-3" />
                                <span>Report</span>
                              </button>
                            )}
                            {m.isReported && (
                              <span className="text-amber-600 dark:text-amber-300 font-medium">
                                Reported to Support
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={handleSendChat}
                className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2.5"
              >
                {attachName && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attached: {attachName}</span>
                    <button
                      type="button"
                      onClick={() => setAttachName('')}
                      className="text-red-500 font-semibold ml-1 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    placeholder="Write a clear message inside Shohoj Trading..."
                    className="min-h-[44px] flex-1 rounded-full px-5 py-2 text-sm bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-2">
                    <label className="min-h-[44px] inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer">
                      <Paperclip className="w-4 h-4" />
                      <span>Attach</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="sr-only"
                        onChange={handleFileAttach}
                      />
                    </label>
                    <Button type="submit" size="sm">
                      <Send className="w-4 h-4" />
                      <span>Send</span>
                    </Button>
                  </div>
                </div>
                {chatError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{chatError}</p>
                )}
              </form>
            </Card>
          )}

          {/* TAB 2: AGREEMENT BUILDER, SIGN & CHANGE REQUEST */}
          {activeTab === 'agreement' && (
            <div className="space-y-4">
              <Card padding="lg" className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
                    <h3 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                      Connection Agreement Snapshot
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setChangeModalOpen(true)}
                    >
                      Ask to change terms
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPrintModalOpen(true)}
                    >
                      <Printer className="w-4 h-4" />
                      <span>PDF / Print View</span>
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl px-3.5 py-2.5">
                  {TEXTS.connections.lockedSnapshotNote}
                </p>

                {/* Locked Numbers Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Profit split</span>
                    <span className="font-mono font-bold text-slate-950 dark:text-white">
                      {snap.newTraderSharePercent}% / {snap.proTraderSharePercent - snap.platformCommissionPercent}% / {snap.platformCommissionPercent}%
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Settlement period</span>
                    <span className="font-semibold capitalize text-slate-950 dark:text-white">
                      {snap.settlementPeriod}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Max drawdown limit</span>
                    <span className="font-mono font-bold text-red-600 dark:text-red-400">
                      {snap.maxDrawdownPercent}%
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Max risk per trade</span>
                    <span className="font-mono font-bold text-slate-950 dark:text-white">
                      {snap.maxRiskPerTradePercent}%
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Max lot size</span>
                    <span className="font-mono font-bold text-slate-950 dark:text-white">
                      {snap.maxLotSize.toFixed(2)} lots
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Cancel notice</span>
                    <span className="font-mono font-bold text-slate-950 dark:text-white">
                      {snap.cancellationNoticeDays} days
                    </span>
                  </div>
                </div>

                {/* Plain-English Rules */}
                <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-1">
                    <p className="font-semibold text-slate-950 dark:text-white">
                      1. Who is responsible for losses?
                    </p>
                    <p>{TEXTS.connections.lossResponsibility}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-1">
                    <p className="font-semibold text-slate-950 dark:text-white">
                      2. What happens to open trades if someone cancels?
                    </p>
                    <p>{describeOpenTradeRule(snap.openTradeRule, closeHours)}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-1">
                    <p className="font-semibold text-slate-950 dark:text-white">
                      3. Stopping access & Commission protection
                    </p>
                    <p>
                      The New Trader can stop broker access at any time in the Account Access tab.
                      Commission ({snap.platformCommissionPercent}% of profit, taken from Pro share) applies for{' '}
                      {snap.commissionProtectionMonths} months for connections started here.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-1">
                    <p className="font-semibold text-slate-950 dark:text-white">
                      4. How disputes work
                    </p>
                    <p>{TEXTS.connections.disputeRule}</p>
                    <Link
                      to="/disputes"
                      className="inline-block pt-1 text-xs font-semibold text-emerald-400 hover:underline"
                    >
                      Go to Disputes &amp; Support →
                    </Link>
                  </div>
                </div>

                {/* Signatures Box */}
                <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-4">
                  <h4 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                    Signatures (both users must sign)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3.5">
                      <p className="text-slate-500 dark:text-slate-400">New Trader</p>
                      {activeAgreement?.newTraderSignature ? (
                        <div className="mt-1 space-y-0.5">
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                            Signed: {activeAgreement.newTraderSignature.typedName}
                          </p>
                          <p className="font-mono text-slate-500">
                            {formatShortDate(activeAgreement.newTraderSignature.signedAt)}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-1 text-amber-600 dark:text-amber-300 font-medium">
                          Waiting for signature
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3.5">
                      <p className="text-slate-500 dark:text-slate-400">Professional Trader</p>
                      {activeAgreement?.proTraderSignature ? (
                        <div className="mt-1 space-y-0.5">
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                            Signed: {activeAgreement.proTraderSignature.typedName}
                          </p>
                          <p className="font-mono text-slate-500">
                            {formatShortDate(activeAgreement.proTraderSignature.signedAt)}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-1 text-amber-600 dark:text-amber-300 font-medium">
                          Waiting for signature
                        </p>
                      )}
                    </div>
                  </div>

                  {!userAlreadySigned && (
                    <form onSubmit={handleSignSubmit} className="space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4">
                      <Input
                        label="Type your full name to sign"
                        value={typedSignature}
                        onChange={(e) => setTypedSignature(e.target.value)}
                      />
                      <label className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={acceptSignBox}
                          onChange={(e) => setAcceptSignBox(e.target.checked)}
                          className="mt-1 h-4 w-4 accent-emerald-500"
                        />
                        <span>
                          I read these plain-English terms, understand the{' '}
                          <Link to="/legal/risk" className="text-emerald-400 underline">
                            Risk Warning
                          </Link>
                          ,{' '}
                          <Link to="/legal/terms" className="text-emerald-400 underline">
                            Terms of Use
                          </Link>
                          ,{' '}
                          <Link to="/legal/privacy" className="text-emerald-400 underline">
                            Privacy Policy
                          </Link>
                          , and{' '}
                          <Link to="/legal/advertising" className="text-emerald-400 underline">
                            Advertising Rules
                          </Link>
                          , and sign this agreement.
                        </span>
                      </label>
                      {signError && (
                        <p className="text-xs text-red-600 dark:text-red-400">{signError}</p>
                      )}
                      <Button type="submit">
                        <FileSignature className="w-4 h-4" />
                        <span>Sign agreement</span>
                      </Button>
                    </form>
                  )}
                </div>
              </Card>

              {/* Change Requests list */}
              {changeRequests.length > 0 && (
                <Card padding="lg" className="space-y-3">
                  <h4 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                    Agreement Change Requests
                  </h4>
                  {changeRequests.map((req) => {
                    const needsMyApproval =
                      req.status === 'pending' &&
                      (isNewTraderUser ? !req.newTraderAccepted : !req.proTraderAccepted);

                    return (
                      <div
                        key={req.id}
                        className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-slate-950 dark:text-white">
                            Proposed by {req.requestedByName}
                          </span>
                          <StatusBadge
                            tone={
                              req.status === 'applied'
                                ? 'success'
                                : req.status === 'declined'
                                ? 'danger'
                                : 'info'
                            }
                            label={req.status}
                          />
                        </div>
                        <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
                          Split: {100 - req.proposedProSharePercent}% New / {req.proposedProSharePercent}% Pro ·
                          Max DD: {req.proposedMaxDrawdownPercent}% · Notice: {req.proposedNoticeDays}d
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{req.reason}</p>

                        {needsMyApproval && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              size="sm"
                              onClick={() =>
                                respondToAgreementChange({
                                  changeId: req.id,
                                  userId: currentUser.id,
                                  accept: true,
                                })
                              }
                            >
                              Accept change
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() =>
                                respondToAgreementChange({
                                  changeId: req.id,
                                  userId: currentUser.id,
                                  accept: false,
                                })
                              }
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Card>
              )}
            </div>
          )}

          {/* TAB 3: ACCOUNT ACCESS STEP */}
          {activeTab === 'access' && (
            <Card padding="lg" className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
                <div>
                  <h3 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                    Choose approved access method
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {TEXTS.exnessMethodTag} · {TEXTS.prototypeExampleTag}
                  </p>
                </div>
                <StatusBadge
                  tone={activeAgreement?.accessActive ? 'success' : 'warning'}
                  label={activeAgreement?.accessActive ? 'Access Active' : 'Access Inactive'}
                />
              </div>

              <NoPasswordNotice />

              <div className="rounded-2xl border border-sky-500/25 bg-sky-500/8 p-3.5 text-xs sm:text-sm text-sky-900 dark:text-sky-200">
                Give the <strong>minimum access</strong> for the <strong>shortest time</strong>. Status moves from{' '}
                <strong>Accepted → Active</strong> only when both users sign AND this step is confirmed.
              </div>

              {activeAgreement?.accessActive ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-4 space-y-1 text-sm">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                      Approved method active: {activeAgreement.accessMethodChosen}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {bothSigned
                        ? 'Both signatures and broker access are complete.'
                        : 'Waiting for both users to sign the agreement before trading starts.'}
                    </p>
                  </div>

                  <Button
                    variant="danger"
                    size="lg"
                    onClick={() => setRemoveModalOpen(true)}
                  >
                    <Unplug className="w-4 h-4" />
                    <span>Remove access</span>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleAccessConfirm} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="acc-method-select"
                      className="text-sm font-medium text-slate-800 dark:text-slate-200"
                    >
                      Approved Exness MT5 method
                    </label>
                    <select
                      id="acc-method-select"
                      value={chosenMethod}
                      onChange={(e) =>
                        setChosenMethod(e.target.value as BrokerAccountLink['accessMethod'])
                      }
                      className="min-h-[44px] w-full rounded-full px-4 py-2 text-sm bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
                    >
                      {ACCESS_METHODS.map((m) => (
                        <option
                          key={m}
                          value={m}
                          className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white"
                        >
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2.5 text-sm text-slate-700 dark:text-slate-200">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chkMinAccess}
                        onChange={(e) => setChkMinAccess(e.target.checked)}
                        className="mt-1 h-4 w-4 accent-emerald-500"
                      />
                      <span>I chose the minimum access needed (no withdrawal permission).</span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chkShortestTime}
                        onChange={(e) => setChkShortestTime(e.target.checked)}
                        className="mt-1 h-4 w-4 accent-emerald-500"
                      />
                      <span>I understand access lasts only while the connection is active.</span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chkRealOnly}
                        onChange={(e) => setChkRealOnly(e.target.checked)}
                        className="mt-1 h-4 w-4 accent-emerald-500"
                      />
                      <span>This uses a real Exness MT5 account (demo accounts are not allowed).</span>
                    </label>
                  </div>

                  {accessError && (
                    <p className="text-xs text-red-600 dark:text-red-400">{accessError}</p>
                  )}

                  <Button type="submit" size="lg">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirm approved access</span>
                  </Button>
                </form>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Report Chat Message Modal */}
      <Modal
        isOpen={Boolean(reportTargetId)}
        onClose={() => setReportTargetId(null)}
        title="Report chat message"
      >
        <form onSubmit={handleReportSubmit} className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Tell Shohoj Trading Support why this message breaks our safety rules (for example: asking for MT5 password or asking to pay outside the platform).
          </p>
          <textarea
            rows={3}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Write a short reason..."
            className="w-full rounded-2xl px-4 py-3 text-sm bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
          />
          {reportError && <p className="text-xs text-red-600 dark:text-red-400">{reportError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setReportTargetId(null)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit">
              Submit report
            </Button>
          </div>
        </form>
      </Modal>

      {/* Propose Agreement Change Modal */}
      <Modal
        isOpen={changeModalOpen}
        onClose={() => setChangeModalOpen(false)}
        title="Ask to change agreement terms"
      >
        <form onSubmit={handleProposeChange} className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Both users must accept before any change applies to this agreement snapshot.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label={`Pro share (${settings.minProSharePercent}-${settings.maxProSharePercent}%)`}
              type="number"
              value={propProShare}
              onChange={(e) => setPropProShare(e.target.value)}
            />
            <Input
              label="Max drawdown (%)"
              type="number"
              value={propMaxDd}
              onChange={(e) => setPropMaxDd(e.target.value)}
            />
            <Input
              label="Notice (days)"
              type="number"
              value={propNotice}
              onChange={(e) => setPropNotice(e.target.value)}
            />
          </div>
          <Input
            label="Reason for change"
            value={propReason}
            onChange={(e) => setPropReason(e.target.value)}
            placeholder="Example: Lower max drawdown limit to 20%"
          />
          {changeError && <p className="text-xs text-red-600 dark:text-red-400">{changeError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setChangeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Send proposal</Button>
          </div>
        </form>
      </Modal>

      {/* Remove Access Confirm Modal */}
      <Modal
        isOpen={removeModalOpen}
        onClose={() => setRemoveModalOpen(false)}
        title="Remove Exness broker access?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Removing access pauses this connection immediately so no new trades can be placed.
              Open trades follow the agreed rule: {describeOpenTradeRule(snap.openTradeRule, closeHours)}
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRemoveModalOpen(false)}>
              Keep access
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                removeBrokerAccess(currentConn.id, currentUser.fullName);
                setRemoveModalOpen(false);
              }}
            >
              Confirm remove access
            </Button>
          </div>
        </div>
      </Modal>

      {/* Print / PDF-Look Agreement Snapshot Modal */}
      <Modal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Printable Agreement Sheet"
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-sm text-slate-900 dark:text-slate-100">
          <div className="rounded-2xl border border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.03] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <p className="font-display text-lg font-bold">
                  {TEXTS.brandName} — Connection Agreement
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  Agreement ID: {activeAgreement?.id} · Connection: {currentConn.id}
                </p>
              </div>
              <FileText className="w-6 h-6 text-emerald-500" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">New Trader</span>
                <strong>{newUser?.fullName}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Professional Trader</span>
                <strong>{proProfile?.displayName ?? proUser?.fullName}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Planned Starting Balance</span>
                <strong className="font-mono">{formatCurrency(currentConn.plannedAmountUsd)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Profit Split (New / Pro / Platform)</span>
                <strong className="font-mono">
                  {snap.newTraderSharePercent}% / {snap.proTraderSharePercent - snap.platformCommissionPercent}% / {snap.platformCommissionPercent}%
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Risk Limits</span>
                <strong className="font-mono">
                  Max DD {snap.maxDrawdownPercent}% · Risk/Trade {snap.maxRiskPerTradePercent}% · Max {snap.maxLotSize} lots
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Settlement & Protection</span>
                <strong className="capitalize">
                  {snap.settlementPeriod} · {snap.commissionProtectionMonths} mo protection
                </strong>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-white/10 pt-3">
              <p><strong>Losses:</strong> {TEXTS.connections.lossResponsibility}</p>
              <p><strong>Open Trades on Cancel:</strong> {describeOpenTradeRule(snap.openTradeRule, closeHours)}</p>
              <p><strong>Disputes:</strong> {TEXTS.connections.disputeRule}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-slate-200 dark:border-white/10 pt-3 text-xs">
              <div>
                <span className="text-slate-500 block">New Trader Signature</span>
                <strong>
                  {activeAgreement?.newTraderSignature
                    ? `${activeAgreement.newTraderSignature.typedName} (${formatShortDate(
                        activeAgreement.newTraderSignature.signedAt
                      )})`
                    : 'Not signed yet'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Pro Trader Signature</span>
                <strong>
                  {activeAgreement?.proTraderSignature
                    ? `${activeAgreement.proTraderSignature.typedName} (${formatShortDate(
                        activeAgreement.proTraderSignature.signedAt
                      )})`
                    : 'Not signed yet'}
                </strong>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPrintModalOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (typeof window !== 'undefined' && typeof window.print === 'function') {
                  window.print();
                }
              }}
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
