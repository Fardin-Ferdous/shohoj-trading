import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Lock,
  Mail,
  MessageSquare,
  Save,
  Settings,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { TEXTS } from '../texts';
import { ChannelPreference } from '../types';
import { formatShortDate } from '../utils/formatters';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/States';
import { Tabs } from '../components/ui/Tabs';

type FilterType = 'all' | 'unread' | 'requests' | 'agreements_money' | 'security';
type NotificationTab = 'inbox' | 'preferences' | 'previews';

const AGREEMENT_MONEY_EVENTS = [
  'agreement_ready',
  'agreement_change',
  'connection_active',
  'connection_paused',
  'risk_limit_warning',
  'settlement_ready',
  'payment_due',
  'payment_overdue',
  'new_message',
];

export function NotificationsPage() {
  const navigate = useNavigate();
  const {
    db,
    settings,
    currentUser,
    currentRole,
    markNotificationRead,
    markAllNotificationsRead,
    saveUserNotificationPrefs,
  } = useApp();

  const [activeTab, setActiveTab] = useState<NotificationTab>('inbox');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedPreviewEventKey, setSelectedPreviewEventKey] = useState<string>('new_request');

  const myNotifications = useMemo(
    () => (currentUser ? db.notifications.filter((n) => n.userId === currentUser.id) : []),
    [db.notifications, currentUser]
  );

  const filtered = useMemo(() => {
    return myNotifications.filter((n) => {
      if (filter === 'unread') return !n.isRead;
      if (filter === 'requests')
        return [
          'new_request',
          'request_accepted',
          'request_rejected',
          'request_cancelled',
          'request_expired',
        ].includes(n.eventKey);
      if (filter === 'agreements_money') return AGREEMENT_MONEY_EVENTS.includes(n.eventKey);
      if (filter === 'security') return n.eventKey === 'security_alert';
      return true;
    });
  }, [myNotifications, filter]);

  const initialChannelState = useMemo(() => {
    const savedMap = currentUser
      ? db.userNotificationPrefs[currentUser.id]?.channelsByEvent ?? {}
      : {};
    const merged: Record<string, ChannelPreference> = {};
    for (const rule of settings.notificationRules) {
      const override = savedMap[rule.eventKey];
      merged[rule.eventKey] = rule.lockedSecurity
        ? { inApp: true, email: true, sms: true, push: true }
        : {
            inApp: override?.inApp ?? rule.inApp,
            email: override?.email ?? rule.email,
            sms: override?.sms ?? rule.sms,
            push: override?.push ?? rule.push,
          };
    }
    return merged;
  }, [currentUser, db.userNotificationPrefs, settings.notificationRules]);

  const [channelDraft, setChannelDraft] = useState<Record<string, ChannelPreference>>(
    initialChannelState
  );

  useEffect(() => {
    setChannelDraft(initialChannelState);
  }, [initialChannelState]);

  const previewTargetNotification = useMemo(() => {
    return (
      myNotifications.find((n) => n.eventKey === selectedPreviewEventKey) ??
      myNotifications[0] ??
      null
    );
  }, [myNotifications, selectedPreviewEventKey]);

  const selectedRule = useMemo(() => {
    return (
      settings.notificationRules.find((r) => r.eventKey === selectedPreviewEventKey) ??
      settings.notificationRules[0]
    );
  }, [settings.notificationRules, selectedPreviewEventKey]);

  if (!currentUser) {
    return (
      <EmptyState
        title="Log in to view alerts"
        message="Switch to any user in Demo Tools or log in to see their notifications."
        actionLabel="Go to Log in"
        onAction={() => navigate('/login')}
      />
    );
  }

  const unreadCount = myNotifications.filter((n) => !n.isRead).length;

  const handleToggleChannel = (
    eventKey: string,
    channel: keyof ChannelPreference,
    lockedSecurity?: boolean
  ) => {
    if (lockedSecurity) return;
    setChannelDraft((prev) => {
      const current = prev[eventKey] ?? {
        inApp: true,
        email: false,
        sms: false,
        push: false,
      };
      return {
        ...prev,
        [eventKey]: {
          ...current,
          [channel]: !current[channel],
        },
      };
    });
  };

  const handleSavePrefs = () => {
    saveUserNotificationPrefs(currentUser.id, channelDraft);
  };

  const getNotificationLink = (eventKey: string): { to: string; label: string } | null => {
    if (eventKey.includes('request')) return { to: '/requests', label: 'Open requests' };
    if (eventKey === 'security_alert') return { to: '/security', label: 'Security' };
    if (
      eventKey === 'settlement_ready' ||
      eventKey === 'payment_due' ||
      eventKey === 'payment_overdue'
    ) {
      return { to: '/settlements', label: 'Settlements' };
    }
    if (
      eventKey === 'agreement_ready' ||
      eventKey === 'agreement_change' ||
      eventKey === 'connection_active' ||
      eventKey === 'connection_paused' ||
      eventKey === 'new_message' ||
      eventKey === 'risk_limit_warning'
    ) {
      return { to: '/connections', label: 'Connections' };
    }
    if (eventKey === 'profile_approved' || eventKey === 'verification_failed') {
      return { to: '/dashboard', label: 'Dashboard' };
    }
    return null;
  };

  const previewTitle =
    previewTargetNotification && previewTargetNotification.eventKey === selectedRule?.eventKey
      ? previewTargetNotification.title
      : `${selectedRule?.label ?? 'Platform'} alert`;
  const previewBody =
    previewTargetNotification && previewTargetNotification.eventKey === selectedRule?.eventKey
      ? previewTargetNotification.body
      : `Update for ${currentUser.fullName}: please check your Shohoj Trading dashboard for "${selectedRule?.label ?? 'account activity'}". Remember: we never ask for your MT5 master password.`;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-emerald-400">Notification Center</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white">
            {TEXTS.notifications.title}
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-300">
            {TEXTS.notifications.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentRole === 'admin' && (
            <Link to="/admin/settings">
              <Button variant="secondary" size="sm">
                <Settings className="w-4 h-4" aria-hidden="true" />
                <span>Admin Rules</span>
              </Button>
            </Link>
          )}
          {unreadCount > 0 && activeTab === 'inbox' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => markAllNotificationsRead(currentUser.id)}
            >
              <CheckCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Mark all read ({unreadCount})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main 3 Tabs */}
      <Tabs<NotificationTab>
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { value: 'inbox', label: `Inbox (${myNotifications.length})` },
          { value: 'preferences', label: 'My Channels' },
          { value: 'previews', label: 'Email & SMS Previews' },
        ]}
      />

      {/* TAB 1: INBOX */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'all', label: `All (${myNotifications.length})` },
                { id: 'unread', label: `Unread (${unreadCount})` },
                { id: 'requests', label: 'Requests' },
                { id: 'agreements_money', label: 'Agreements & Money' },
                { id: 'security', label: 'Security Alerts' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`min-h-[40px] px-4 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                  filter === tab.id
                    ? 'bg-emerald-400 text-slate-950 border-emerald-400'
                    : 'border-white/15 text-slate-300 hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="No alerts in this view"
              message="Request updates, agreement steps, settlement alerts, and security logins will appear here."
              actionLabel="View all alerts"
              onAction={() => setFilter('all')}
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((n) => {
                const isSecurity = n.eventKey === 'security_alert';
                const actionLink = getNotificationLink(n.eventKey);
                return (
                  <Card
                    key={n.id}
                    padding="sm"
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      !n.isRead ? 'border-emerald-500/35' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                          isSecurity
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-emerald-500/15 text-emerald-400'
                        }`}
                      >
                        {isSecurity ? (
                          <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <Bell className="w-4 h-4" aria-hidden="true" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white">{n.title}</p>
                          {!n.isRead && <StatusBadge tone="success" label="New" />}
                          {isSecurity && <StatusBadge tone="warning" label="Always ON" />}
                        </div>
                        <p className="text-sm text-slate-300">{n.body}</p>
                        <p className="text-xs text-slate-400 font-mono">
                          {formatShortDate(n.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPreviewEventKey(n.eventKey);
                          setActiveTab('previews');
                        }}
                        className="text-xs font-medium text-sky-400 hover:underline px-2 py-1 cursor-pointer"
                      >
                        Preview SMS/Email
                      </button>
                      {actionLink && (
                        <Link
                          to={actionLink.to}
                          onClick={() => markNotificationRead(n.id)}
                          className="text-xs font-semibold text-emerald-400 hover:underline px-2 py-1"
                        >
                          {actionLink.label} →
                        </Link>
                      )}
                      {!n.isRead && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => markNotificationRead(n.id)}
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CHANNEL PREFERENCES */}
      {activeTab === 'preferences' && (
        <Card padding="lg" className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                How you want to receive alerts
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Choose In-App, Email, SMS, or Push for each event. Security alerts stay ON for your safety.
              </p>
            </div>
            <Button size="sm" onClick={handleSavePrefs}>
              <Save className="w-4 h-4" aria-hidden="true" />
              <span>Save preferences</span>
            </Button>
          </div>

          <div className="space-y-2.5">
            {settings.notificationRules.map((rule) => {
              const pref = channelDraft[rule.eventKey] ?? {
                inApp: rule.inApp,
                email: rule.email,
                sms: rule.sms,
                push: rule.push,
              };
              const isLocked = Boolean(rule.lockedSecurity);

              return (
                <div
                  key={rule.eventKey}
                  className={`rounded-2xl border p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isLocked
                      ? 'border-amber-400/30 bg-amber-400/[0.06]'
                      : 'border-white/10 bg-white/[0.02]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{rule.label}</span>
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-400/15 px-2.5 py-0.5 rounded-full">
                          <Lock className="w-3 h-3" aria-hidden="true" />
                          <span>Locked ON for safety</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono">{rule.eventKey}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        { key: 'inApp', label: 'In-app' },
                        { key: 'email', label: 'Email' },
                        { key: 'sms', label: 'SMS' },
                        { key: 'push', label: 'Push' },
                      ] as const
                    ).map((ch) => {
                      const active = isLocked ? true : Boolean(pref[ch.key]);
                      return (
                        <button
                          key={ch.key}
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleToggleChannel(rule.eventKey, ch.key, isLocked)}
                          aria-pressed={active}
                          className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            isLocked
                              ? 'border-amber-400/40 bg-amber-400/15 text-amber-200 cursor-not-allowed'
                              : active
                              ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-300 cursor-pointer'
                              : 'border-white/15 bg-white/[0.03] text-slate-400 hover:text-white cursor-pointer'
                          }`}
                        >
                          {ch.label}: {active ? 'ON' : 'OFF'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* TAB 3: SIMULATED EMAIL & SMS PREVIEWS */}
      {activeTab === 'previews' && (
        <div className="space-y-4">
          <Card padding="lg" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Simulated Email &amp; SMS Previews
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Preview how Shohoj Trading sends clear alerts in simple words without asking for passwords.
                </p>
              </div>
              <StatusBadge tone="info" label={TEXTS.prototypeExampleTag} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="preview-event-select" className="text-xs font-medium text-slate-300">
                Choose alert event to preview
              </label>
              <select
                id="preview-event-select"
                value={selectedPreviewEventKey}
                onChange={(e) => setSelectedPreviewEventKey(e.target.value)}
                className="min-h-[44px] w-full sm:max-w-sm rounded-full px-4 py-2 text-sm bg-white/5 border border-white/15 text-white"
              >
                {settings.notificationRules.map((r) => (
                  <option key={r.eventKey} value={r.eventKey} className="bg-[#0d1612]">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Simulated Email Preview */}
            <Card padding="lg" className="space-y-3 border-emerald-500/20">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <Mail className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <span>Email Alert Preview</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">Simulated Email</span>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-slate-400">
                  To: <span className="text-white font-mono">{currentUser.email}</span>
                </p>
                <p className="text-slate-400">
                  Subject:{' '}
                  <span className="text-white font-semibold">
                    [Shohoj Trading] {previewTitle}
                  </span>
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#070e0b] p-4 space-y-2.5 text-sm text-slate-200 leading-relaxed">
                <p>Hello {currentUser.fullName},</p>
                <p>{previewBody}</p>
                <p className="text-xs text-slate-400 pt-2 border-t border-white/10">
                  Safety reminder: {TEXTS.noPasswordRule} Only log in at the official Shohoj Trading app.
                </p>
              </div>
            </Card>

            {/* Simulated SMS & Push Preview */}
            <Card padding="lg" className="space-y-3 border-sky-500/20">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <Smartphone className="w-4 h-4 text-sky-400" aria-hidden="true" />
                  <span>SMS &amp; Push Preview</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">Simulated SMS</span>
              </div>

              <div className="text-xs text-slate-400">
                Phone: <span className="text-white font-mono">{currentUser.phone || '+880 17XX-XXXXXX'}</span>
              </div>

              <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
                  <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Shohoj SMS</span>
                </div>
                <p className="text-sm text-white leading-relaxed">
                  Shohoj Trading: {previewTitle}. {previewBody} (We never ask for MT5 master passwords.)
                </p>
              </div>

              <p className="text-xs text-slate-400">
                Enabled for you:{' '}
                <span className="font-mono text-slate-200">
                  {channelDraft[selectedRule?.eventKey ?? '']?.email ? 'Email ON' : 'Email OFF'} ·{' '}
                  {channelDraft[selectedRule?.eventKey ?? '']?.sms ? 'SMS ON' : 'SMS OFF'} ·{' '}
                  {channelDraft[selectedRule?.eventKey ?? '']?.push ? 'Push ON' : 'Push OFF'}
                </span>
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
