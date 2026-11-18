import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppDatabaseState, dataLayer } from '../data/dataLayer';
import { DUMMY_AVATAR_URLS } from '../data/seedData';
import {
  AdminLevel,
  AgreementRecord,
  BrokerAccountLink,
  ChannelPreference,
  CommissionInvoice,
  Connection,
  ContactTicket,
  DisputeCase,
  KycRecord,
  KycStatus,
  LaunchItemStatus,
  NewTraderPreferences,
  PlatformSettings,
  RiskTag,
  SettingChange,
  SettlementRecord,
  TraderProfile,
  TraderReport,
  User,
  UserRole,
} from '../types';
import { calculateProfitSplit, fromCents } from '../utils/profitEngine';
import { computeShohojScore } from '../utils/shohojScore';
import { getDeviceLabel } from '../utils/validators';

export type ThemeMode = 'dark';

export interface ToastMessage {
  id: string;
  title: string;
  tone: 'success' | 'info' | 'warning' | 'error';
}

export interface LoginResult {
  status: 'success' | 'needs_2fa' | 'locked' | 'error';
  message?: string;
  pendingUserId?: string;
  demoCode?: string;
}

export interface SignupPayload {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  ageYears: number;
  role: 'new_trader' | 'pro_trader';
  password: string;
  enableTwoFactor: boolean;
}

interface AppContextValue {
  db: AppDatabaseState;
  settings: PlatformSettings;
  currentUser: User | null;
  currentRole: UserRole;
  currentAdminLevel: AdminLevel | null;
  theme: ThemeMode;
  simulatedNow: Date;
  toasts: ToastMessage[];
  publicApprovedTraders: TraderProfile[];
  sessionExpiredNotice: boolean;
  switchRole: (role: UserRole, adminLevel?: AdminLevel) => void;
  switchUser: (userId: string | null) => void;
  advanceTimeDays: (days: number) => void;
  resetDemoData: () => void;
  pushToast: (title: string, tone?: ToastMessage['tone']) => void;
  dismissToast: (id: string) => void;

  // Phase 2 Actions
  loginWithCredentials: (email: string, password: string) => LoginResult;
  verifyTwoFactorLogin: (userId: string, code: string, expectedCode: string) => boolean;
  unlockDemoAccount: (email: string) => void;
  signupUser: (payload: SignupPayload) => { ok: boolean; error?: string; needs2fa?: boolean; userId?: string; demoCode?: string };
  completePasswordReset: (email: string, newPassword: string) => { ok: boolean; error?: string };
  logout: () => void;
  simulateSessionTimeout: () => void;
  dismissSessionExpiredNotice: () => void;
  submitKyc: (userId: string, record: Omit<KycRecord, 'userId' | 'status' | 'submittedAt'>) => void;
  simulateKycDecision: (userId: string, status: KycStatus, reason?: string) => void;
  updateNewTraderProfile: (
    userId: string,
    updates: { fullName: string; country: string; avatarUrl?: string; prefs: NewTraderPreferences }
  ) => void;
  saveBrokerLink: (
    userId: string,
    input: {
      accountType: BrokerAccountLink['accountType'];
      accountNumber: string;
      isRealAccount: boolean;
      balanceUsd: number;
      accessMethod: BrokerAccountLink['accessMethod'];
    }
  ) => { ok: boolean; error?: string };
  changePassword: (userId: string, currentPassword: string, newPassword: string) => { ok: boolean; error?: string };
  toggleTwoFactor: (userId: string, enabled: boolean) => { ok: boolean; error?: string };
  revokeDeviceSession: (sessionId: string) => void;

  // Phase 3 Actions
  submitProOnboarding: (
    userId: string,
    input: {
      accountNumber: string;
      isRealAccount: boolean;
      accessMethod: BrokerAccountLink['accessMethod'];
      simulatedHistoryMonths?: number;
      simulatedTradeCount?: number;
    }
  ) => { ok: boolean; error?: string };
  updateProTraderProfile: (
    userId: string,
    updates: {
      displayName: string;
      bio: string;
      avatarColor: string;
      avatarPhotoName?: string;
      avatarUrl?: string;
      tradingStyle: string;
      instruments: string[];
      riskTags: RiskTag[];
      askedProfitSharePercent: number;
      isOpenForRequests: boolean;
      maxConnections: number;
    }
  ) => { ok: boolean; error?: string };
  simulateProReviewDecision: (userId: string, decision: 'approved' | 'rejected', note?: string) => void;

  // Phase 4 Actions
  toggleFavoriteTrader: (traderId: string) => void;
  saveTraderFilter: (name: string, queryString: string) => void;
  deleteSavedTraderFilter: (filterId: string) => void;

  // Phase 5 Actions
  unreadNotificationsCount: number;
  sendConnectionRequest: (input: {
    newTraderId: string;
    proTraderProfileId: string;
    plannedAmountUsd: number;
    riskComfort: 'Low' | 'Medium' | 'Higher';
    message: string;
  }) => { ok: boolean; error?: string; connectionId?: string };
  cancelConnectionRequest: (connectionId: string, reason?: string) => { ok: boolean; error?: string };
  respondToConnectionRequest: (
    connectionId: string,
    decision: 'accepted' | 'rejected',
    reason?: string
  ) => { ok: boolean; error?: string };
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: (userId: string) => void;

  // Phase 6 Actions
  sendChatMessage: (input: {
    connectionId: string;
    senderId: string;
    body: string;
    attachmentName?: string;
  }) => { ok: boolean; error?: string };
  markChatMessagesSeen: (connectionId: string, viewerId: string) => void;
  reportChatMessage: (messageId: string, reason: string) => { ok: boolean; error?: string };
  signAgreement: (input: {
    connectionId: string;
    userId: string;
    typedName: string;
    acceptedTerms: boolean;
  }) => { ok: boolean; error?: string };
  completeAccessStep: (input: {
    connectionId: string;
    accessMethod: BrokerAccountLink['accessMethod'];
  }) => { ok: boolean; error?: string };
  removeBrokerAccess: (connectionId: string, actorName: string) => void;
  proposeAgreementChange: (input: {
    connectionId: string;
    userId: string;
    proposedProSharePercent: number;
    proposedMaxDrawdownPercent: number;
    proposedNoticeDays: number;
    reason: string;
  }) => { ok: boolean; error?: string };
  respondToAgreementChange: (input: {
    changeId: string;
    userId: string;
    accept: boolean;
  }) => { ok: boolean; error?: string };

  // Phase 7 Actions
  pauseConnection: (
    connectionId: string,
    actorName: string,
    reason?: string
  ) => { ok: boolean; error?: string };
  resumeConnection: (connectionId: string, actorName: string) => { ok: boolean; error?: string };
  completeConnection: (connectionId: string, actorName: string) => { ok: boolean; error?: string };
  stopConnection: (
    connectionId: string,
    actorName: string,
    reason?: string
  ) => { ok: boolean; error?: string };
  simulateRuleBreak: () => void;
  openDispute: (input: {
    connectionId: string;
    userId: string;
    reason: string;
    details: string;
    evidenceFileName?: string;
  }) => { ok: boolean; error?: string };
  requestDisputeReview: (
    disputeId: string,
    userId: string,
    note: string
  ) => { ok: boolean; error?: string };
  reportTraderOrUser: (input: {
    reporterId: string;
    targetUserId: string;
    reason: string;
    details: string;
  }) => { ok: boolean; error?: string };
  saveUserNotificationPrefs: (
    userId: string,
    channelsByEvent: Record<string, ChannelPreference>
  ) => { ok: boolean; error?: string };
  submitContactTicket: (input: {
    userId?: string;
    name: string;
    email: string;
    topic: string;
    message: string;
  }) => { ok: boolean; error?: string; ticketId?: string };

  // Phase 8 Actions
  runSettlementSimulation: (input: {
    connectionId: string;
    periodLabel: string;
    endingBalanceUsd: number;
    depositsUsd: number;
    withdrawalsUsd: number;
  }) => { ok: boolean; error?: string; settlementId?: string };
  payCommissionInvoice: (input: {
    invoiceId: string;
    actorName: string;
    providerLabel?: string;
  }) => { ok: boolean; error?: string };
  advanceUnpaidInvoiceStep: (invoiceId: string) => { ok: boolean; error?: string };

  // Phase 9 Admin Actions
  adminChangeUserRole: (
    userId: string,
    role: Exclude<UserRole, 'visitor'>,
    adminLevel?: AdminLevel
  ) => { ok: boolean; error?: string };
  adminSetUserSuspension: (
    userId: string,
    suspend: boolean,
    reason?: string
  ) => { ok: boolean; error?: string };
  adminVerifyTrader: (
    userId: string,
    decision: 'approved' | 'rejected',
    note: string
  ) => { ok: boolean; error?: string };
  adminForceConnectionStatus: (
    connectionId: string,
    action: 'pause' | 'resume' | 'complete',
    reason: string
  ) => { ok: boolean; error?: string };
  adminUpdateDispute: (
    disputeId: string,
    status: DisputeCase['status'],
    resolutionNote: string
  ) => { ok: boolean; error?: string };
  adminMarkReportChecked: (reportId: string) => void;
  adminMarkFraudChecked: (signalId: string) => void;
  adminUpdateLaunchItem: (itemId: string, status: LaunchItemStatus, notes: string) => void;
  adminProposeOrApplySetting: (input: {
    settingKey: keyof PlatformSettings;
    settingLabel: string;
    newValue: PlatformSettings[keyof PlatformSettings];
    displayOldValue: string;
    displayNewValue: string;
    reason: string;
    requiresSecondApproval: boolean;
  }) => { ok: boolean; error?: string; pending?: boolean };
  adminDecideSettingChange: (
    changeId: string,
    decision: 'approved' | 'rejected',
    secondAdminOverrideName?: string
  ) => { ok: boolean; error?: string };
  adminSaveNotificationRules: (
    rules: PlatformSettings['notificationRules'],
    reason: string
  ) => { ok: boolean; error?: string };
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<AppDatabaseState>(() => dataLayer.loadDatabase());
  const theme: ThemeMode = 'dark';
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);

  useEffect(() => {
    dataLayer.saveDatabase(db);
  }, [db]);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const currentUser = useMemo(
    () => db.users.find((u) => u.id === db.currentUserId) ?? null,
    [db.users, db.currentUserId]
  );

  const currentRole: UserRole = currentUser ? currentUser.role : 'visitor';
  const currentAdminLevel: AdminLevel | null =
    currentUser?.role === 'admin' ? currentUser.adminLevel ?? 'super_admin' : null;

  const simulatedNow = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + db.simulatedOffsetDays);
    return now;
  }, [db.simulatedOffsetDays]);

  const publicApprovedTraders = useMemo(() => {
    return db.traderProfiles
      .filter(
        (t) =>
          t.isApproved &&
          t.isPublic &&
          t.ownAccountStats.historyMonths >= db.settings.minHistoryMonths &&
          t.ownAccountStats.tradeCount >= db.settings.minTradeCount
      )
      .map((t) => ({
        ...t,
        shohojScore: computeShohojScore(t, db.settings.shohojScoreWeights),
      }));
  }, [
    db.traderProfiles,
    db.settings.minHistoryMonths,
    db.settings.minTradeCount,
    db.settings.shohojScoreWeights,
  ]);

  const pushToast = (title: string, tone: ToastMessage['tone'] = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, title, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3800);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  // Real inactivity session timeout tied to settings.sessionTimeoutMinutes
  useEffect(() => {
    if (!db.currentUserId) return;
    const timeoutMs = Math.max(1, db.settings.sessionTimeoutMinutes) * 60 * 1000;
    let timer = window.setTimeout(() => {
      setDb((prev) => ({ ...prev, currentUserId: null }));
      setSessionExpiredNotice(true);
      pushToast('Session timed out for your safety. Please log in again.', 'warning');
    }, timeoutMs);

    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setDb((prev) => ({ ...prev, currentUserId: null }));
        setSessionExpiredNotice(true);
        pushToast('Session timed out for your safety. Please log in again.', 'warning');
      }, timeoutMs);
    };

    window.addEventListener('pointerdown', resetTimer);
    window.addEventListener('keydown', resetTimer);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [db.currentUserId, db.settings.sessionTimeoutMinutes]);

  const switchUser = (userId: string | null) => {
    setSessionExpiredNotice(false);
    setDb((prev) => ({ ...prev, currentUserId: userId }));
    const target = db.users.find((u) => u.id === userId);
    pushToast(target ? `Switched to ${target.fullName}` : 'Viewing as visitor', 'info');
  };

  const switchRole = (role: UserRole, adminLevel?: AdminLevel) => {
    if (role === 'visitor') {
      switchUser(null);
      return;
    }
    const match =
      role === 'admin'
        ? db.users.find((u) => u.role === 'admin' && u.adminLevel === (adminLevel ?? 'super_admin'))
        : db.users.find((u) => u.role === role);
    if (match) switchUser(match.id);
  };

  const advanceTimeDays = (days: number) => {
    const nextNow = new Date();
    nextNow.setDate(nextNow.getDate() + db.simulatedOffsetDays + days);
    const nextNowIso = nextNow.toISOString();
    let expiredCount = 0;
    let overdueInvoicesCount = 0;

    setDb((prev) => {
      const nextOffset = prev.simulatedOffsetDays + days;
      const calcNow = new Date();
      calcNow.setDate(calcNow.getDate() + nextOffset);
      const calcNowMs = calcNow.getTime();
      const newNotifications = [...prev.notifications];
      const newAuditEntries = [...prev.auditLog];

      const updatedConnections = prev.connections.map((conn) => {
        if (conn.status === 'pending' && new Date(conn.expiresAt).getTime() <= calcNowMs) {
          expiredCount += 1;
          const newUser = prev.users.find((u) => u.id === conn.newTraderId);
          const proUser = prev.users.find((u) => u.id === conn.proTraderId);

          newNotifications.unshift(
            {
              id: `notif-exp-nt-${conn.id}-${Date.now()}`,
              userId: conn.newTraderId,
              title: 'Request expired',
              body: `Your Request to Connect with ${proUser?.fullName ?? 'Professional Trader'} expired after ${prev.settings.requestExpiryDays} days.`,
              eventKey: 'request_expired',
              createdAt: nextNowIso,
              isRead: false,
            },
            {
              id: `notif-exp-pt-${conn.id}-${Date.now()}`,
              userId: conn.proTraderId,
              title: 'Incoming request expired',
              body: `The Request to Connect from ${newUser?.fullName ?? 'New Trader'} expired automatically.`,
              eventKey: 'request_expired',
              createdAt: nextNowIso,
              isRead: false,
            }
          );

          newAuditEntries.unshift({
            id: `audit-exp-${conn.id}-${Date.now()}`,
            actorName: 'System Clock',
            actorRole: 'Automated',
            action: 'Connection request expired after expiry limit',
            target: conn.id,
            createdAt: nextNowIso,
          });

          return {
            ...conn,
            status: 'expired' as const,
            history: [
              ...conn.history,
              {
                status: 'expired' as const,
                changedAt: nextNowIso,
                changedByName: 'System',
                reason: `No response within ${prev.settings.requestExpiryDays} days (Settings limit).`,
              },
            ],
          };
        }
        return conn;
      });

      const updatedInvoices = prev.invoices.map((inv) => {
        if (inv.status === 'due' && new Date(inv.dueAt).getTime() <= calcNowMs) {
          overdueInvoicesCount += 1;
          newNotifications.unshift({
            id: `notif-inv-ov-${inv.id}-${Date.now()}`,
            userId: inv.proTraderId,
            title: 'Commission invoice overdue',
            body: `Invoice ${inv.id} ($${inv.amountUsd.toFixed(2)}) is now overdue. Reminder logged.`,
            eventKey: 'payment_overdue',
            createdAt: nextNowIso,
            isRead: false,
          });
          newAuditEntries.unshift({
            id: `audit-inv-ov-${inv.id}-${Date.now()}`,
            actorName: 'Finance Clock',
            actorRole: 'Automated',
            action: 'Commission invoice marked overdue',
            target: inv.id,
            createdAt: nextNowIso,
          });
          return {
            ...inv,
            status: 'overdue' as const,
            unpaidStage: inv.unpaidStage === 'none' ? ('reminder_sent' as const) : inv.unpaidStage,
            history: [
              ...inv.history,
              {
                step: 'Overdue Reminder',
                note: 'Invoice passed due date after clock advance.',
                at: nextNowIso,
              },
            ],
          };
        }
        return inv;
      });

      return {
        ...prev,
        simulatedOffsetDays: nextOffset,
        connections: updatedConnections,
        invoices: updatedInvoices,
        notifications: newNotifications,
        auditLog: newAuditEntries,
      };
    });

    const parts: string[] = [];
    if (expiredCount > 0) parts.push(`${expiredCount} pending request(s) expired`);
    if (overdueInvoicesCount > 0) parts.push(`${overdueInvoicesCount} invoice(s) marked overdue`);

    pushToast(
      parts.length > 0
        ? `Clock moved +${days} days. ${parts.join(', ')}.`
        : `Simulated clock moved forward +${days} days`,
      parts.length > 0 ? 'warning' : 'info'
    );
  };

  const resetDemoData = () => {
    const fresh = dataLayer.resetDatabase();
    setDb(fresh);
    setSessionExpiredNotice(false);
    pushToast('Demo data reset to starting state.', 'success');
  };

  const recordSuccessfulSession = (user: User) => {
    const nowIso = simulatedNow.toISOString();
    const deviceName = getDeviceLabel();
    const entryId = `lh-${Date.now()}`;
    const sessionId = `dev-${Date.now()}`;
    const notifId = `notif-${Date.now()}`;

    setDb((prev) => ({
      ...prev,
      currentUserId: user.id,
      failedAttemptsByEmail: { ...prev.failedAttemptsByEmail, [user.email.toLowerCase()]: 0 },
      loginHistory: [
        {
          id: entryId,
          userId: user.id,
          deviceName,
          location: `${user.country} (Demo)`,
          loggedInAt: nowIso,
          isNewDevice: true,
          status: 'Success',
        },
        ...prev.loginHistory,
      ],
      deviceSessions: [
        {
          id: sessionId,
          userId: user.id,
          deviceName: 'Current Session',
          browser: deviceName,
          lastActiveAt: nowIso,
          isCurrent: true,
        },
        ...prev.deviceSessions.map((d) => (d.userId === user.id ? { ...d, isCurrent: false } : d)),
      ],
      notifications: [
        {
          id: notifId,
          userId: user.id,
          title: 'New login alert',
          body: `Your account was accessed from ${deviceName}.`,
          eventKey: 'security_alert',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
    }));

    pushToast('New login detected. Security alert added to your history.', 'info');
  };

  const loginWithCredentials = (email: string, password: string): LoginResult => {
    const cleanEmail = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (db.lockedEmails[cleanEmail]) {
      return {
        status: 'locked',
        message: `Account locked after ${db.settings.maxFailedLoginAttempts} failed tries. Reset your password or unlock for demo testing.`,
      };
    }

    if (!user) {
      return {
        status: 'error',
        message: 'No account found with that email. Try a demo account or sign up.',
      };
    }

    if (user.isSuspended) {
      return {
        status: 'error',
        message: `This account is suspended. ${user.suspendReason ?? 'Please contact Support.'}`,
      };
    }

    const expectedPw = db.passwordsByEmail[cleanEmail] ?? 'DemoPass123!';
    if (password !== expectedPw) {
      const nextCount = (db.failedAttemptsByEmail[cleanEmail] ?? 0) + 1;
      const maxTries = db.settings.maxFailedLoginAttempts;
      const shouldLock = nextCount >= maxTries;

      setDb((prev) => ({
        ...prev,
        failedAttemptsByEmail: { ...prev.failedAttemptsByEmail, [cleanEmail]: nextCount },
        lockedEmails: shouldLock ? { ...prev.lockedEmails, [cleanEmail]: true } : prev.lockedEmails,
        loginHistory: [
          {
            id: `lh-${Date.now()}`,
            userId: user.id,
            deviceName: getDeviceLabel(),
            location: `${user.country} (Demo)`,
            loggedInAt: simulatedNow.toISOString(),
            isNewDevice: false,
            status: shouldLock ? 'Locked' : 'Failed attempt',
          },
          ...prev.loginHistory,
        ],
      }));

      if (shouldLock) {
        return {
          status: 'locked',
          message: `Account locked after ${maxTries} wrong passwords.`,
        };
      }

      return {
        status: 'error',
        message: `Wrong password. ${maxTries - nextCount} tries left before lock.`,
      };
    }

    setSessionExpiredNotice(false);

    const requires2fa = user.role === 'pro_trader' || user.role === 'admin' || user.twoFactorEnabled;
    if (requires2fa) {
      const demoCode = String(Math.floor(100000 + Math.random() * 900000));
      return {
        status: 'needs_2fa',
        pendingUserId: user.id,
        demoCode,
      };
    }

    recordSuccessfulSession(user);
    return { status: 'success' };
  };

  const verifyTwoFactorLogin = (userId: string, code: string, expectedCode: string): boolean => {
    if (code.trim() !== expectedCode.trim()) {
      return false;
    }
    const user = db.users.find((u) => u.id === userId);
    if (!user) return false;
    recordSuccessfulSession(user);
    return true;
  };

  const unlockDemoAccount = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    setDb((prev) => ({
      ...prev,
      failedAttemptsByEmail: { ...prev.failedAttemptsByEmail, [cleanEmail]: 0 },
      lockedEmails: { ...prev.lockedEmails, [cleanEmail]: false },
    }));
    pushToast('Demo account unlocked.', 'success');
  };

  const signupUser = (payload: SignupPayload) => {
    const cleanEmail = payload.email.trim().toLowerCase();
    if (payload.ageYears < db.settings.minAgeYears) {
      return {
        ok: false,
        error: `You must be at least ${db.settings.minAgeYears} years old to join.`,
      };
    }
    if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return {
        ok: false,
        error: 'An account with this email already exists. Try logging in instead.',
      };
    }

    const parts = payload.fullName.trim().split(/\s+/);
    const initials = parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');

    const newUserId = `${payload.role === 'pro_trader' ? 'pt' : 'nt'}-${Date.now()}`;
    const mustEnable2fa = payload.role === 'pro_trader' ? true : payload.enableTwoFactor;

    const newUser: User = {
      id: newUserId,
      fullName: payload.fullName.trim(),
      email: cleanEmail,
      phone: payload.phone.trim() || '+880 1700-000999',
      country: payload.country,
      ageYears: payload.ageYears,
      role: payload.role,
      kycStatus: 'not_started',
      twoFactorEnabled: mustEnable2fa,
      createdAt: simulatedNow.toISOString(),
      avatarInitials: initials || 'ST',
      avatarUrl: DUMMY_AVATAR_URLS[db.users.length % DUMMY_AVATAR_URLS.length],
      newTraderPrefs:
        payload.role === 'new_trader'
          ? {
              experienceLevel: 'Complete beginner',
              tradingGoal: 'Steady growth with low drawdown',
              riskComfort: 'Low',
            }
          : undefined,
    };

    setDb((prev) => ({
      ...prev,
      users: [newUser, ...prev.users],
      passwordsByEmail: { ...prev.passwordsByEmail, [cleanEmail]: payload.password },
      auditLog: [
        {
          id: `audit-${Date.now()}`,
          actorName: newUser.fullName,
          actorRole: payload.role === 'pro_trader' ? 'Professional Trader' : 'New Trader',
          action: 'Created new account',
          target: cleanEmail,
          createdAt: simulatedNow.toISOString(),
        },
        ...prev.auditLog,
      ],
    }));

    if (mustEnable2fa) {
      const demoCode = String(Math.floor(100000 + Math.random() * 900000));
      return { ok: true, needs2fa: true, userId: newUserId, demoCode };
    }

    recordSuccessfulSession(newUser);
    return { ok: true, needs2fa: false, userId: newUserId };
  };

  const completePasswordReset = (email: string, newPassword: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { ok: false, error: 'We could not find an account with that email.' };
    }
    setDb((prev) => ({
      ...prev,
      passwordsByEmail: { ...prev.passwordsByEmail, [cleanEmail]: newPassword },
      failedAttemptsByEmail: { ...prev.failedAttemptsByEmail, [cleanEmail]: 0 },
      lockedEmails: { ...prev.lockedEmails, [cleanEmail]: false },
    }));
    pushToast('Password updated. You can log in now.', 'success');
    return { ok: true };
  };

  const logout = () => {
    setDb((prev) => ({ ...prev, currentUserId: null }));
    pushToast('You logged out safely.', 'info');
  };

  const simulateSessionTimeout = () => {
    setDb((prev) => ({ ...prev, currentUserId: null }));
    setSessionExpiredNotice(true);
    pushToast(
      `Session closed after ${db.settings.sessionTimeoutMinutes} min inactivity (simulated).`,
      'warning'
    );
  };

  const dismissSessionExpiredNotice = () => setSessionExpiredNotice(false);

  const submitKyc = (
    userId: string,
    record: Omit<KycRecord, 'userId' | 'status' | 'submittedAt'>
  ) => {
    const nowIso = simulatedNow.toISOString();
    setDb((prev) => {
      const others = prev.kycRecords.filter((k) => k.userId !== userId);
      return {
        ...prev,
        users: prev.users.map((u) =>
          u.id === userId ? { ...u, kycStatus: 'in_review', kycNote: undefined } : u
        ),
        kycRecords: [
          {
            ...record,
            userId,
            status: 'in_review',
            submittedAt: nowIso,
          },
          ...others,
        ],
      };
    });
    pushToast('KYC documents sent for review.', 'success');
  };

  const simulateKycDecision = (userId: string, status: KycStatus, reason?: string) => {
    const nowIso = simulatedNow.toISOString();
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === userId ? { ...u, kycStatus: status, kycNote: reason } : u
      ),
      kycRecords: prev.kycRecords.map((k) =>
        k.userId === userId
          ? {
              ...k,
              status,
              reviewedAt: nowIso,
              rejectionReason: reason,
            }
          : k
      ),
    }));
    pushToast(`KYC status updated to ${status.replace('_', ' ')}.`, 'info');
  };

  const updateNewTraderProfile = (
    userId: string,
    updates: { fullName: string; country: string; avatarUrl?: string; prefs: NewTraderPreferences }
  ) => {
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              fullName: updates.fullName.trim(),
              country: updates.country,
              avatarUrl:
                updates.avatarUrl !== undefined ? updates.avatarUrl || undefined : u.avatarUrl,
              newTraderPrefs: updates.prefs,
            }
          : u
      ),
    }));
    pushToast('Profile saved.', 'success');
  };

  const saveBrokerLink = (
    userId: string,
    input: {
      accountType: BrokerAccountLink['accountType'];
      accountNumber: string;
      isRealAccount: boolean;
      balanceUsd: number;
      accessMethod: BrokerAccountLink['accessMethod'];
    }
  ) => {
    if (!input.isRealAccount) {
      return {
        ok: false,
        error: 'Only real Exness accounts are allowed. Demo accounts cannot be linked.',
      };
    }
    if (input.balanceUsd < db.settings.minDepositUsd) {
      return {
        ok: false,
        error: `Account balance must be at least $${db.settings.minDepositUsd} (from Settings).`,
      };
    }
    const cleanNum = input.accountNumber.replace(/\D/g, '');
    if (cleanNum.length < 4) {
      return {
        ok: false,
        error: 'Please enter at least 4 digits of your Exness MT5 account number.',
      };
    }

    const masked = `MT5-••••${cleanNum.slice(-4)}`;
    const link: BrokerAccountLink = {
      id: `bl-${Date.now()}`,
      userId,
      brokerName: 'Exness',
      platform: 'MT5',
      accountType: input.accountType,
      accountNumberMasked: masked,
      isRealAccount: true,
      balanceUsd: input.balanceUsd,
      accessMethod: input.accessMethod,
      connectedAt: simulatedNow.toISOString(),
    };

    setDb((prev) => ({
      ...prev,
      brokerLinks: [link, ...prev.brokerLinks.filter((b) => b.userId !== userId)],
    }));
    pushToast('Exness MT5 account linked (prototype example).', 'success');
    return { ok: true };
  };

  const changePassword = (userId: string, currentPassword: string, newPassword: string) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: 'User not found.' };
    const cleanEmail = user.email.toLowerCase();
    const expected = db.passwordsByEmail[cleanEmail] ?? 'DemoPass123!';
    if (currentPassword !== expected) {
      return { ok: false, error: 'Your current password does not match.' };
    }
    setDb((prev) => ({
      ...prev,
      passwordsByEmail: { ...prev.passwordsByEmail, [cleanEmail]: newPassword },
      notifications: [
        {
          id: `notif-${Date.now()}`,
          userId,
          title: 'Password changed',
          body: 'Your account password was just updated.',
          eventKey: 'security_alert',
          createdAt: simulatedNow.toISOString(),
          isRead: false,
        },
        ...prev.notifications,
      ],
    }));
    pushToast('Password changed successfully.', 'success');
    return { ok: true };
  };

  const toggleTwoFactor = (userId: string, enabled: boolean) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: 'User not found.' };
    if ((user.role === 'pro_trader' || user.role === 'admin') && !enabled) {
      return {
        ok: false,
        error: 'Two-step login is required for Professional Traders and Admins.',
      };
    }
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === userId ? { ...u, twoFactorEnabled: enabled } : u)),
    }));
    pushToast(enabled ? 'Two-step login turned on.' : 'Two-step login turned off.', 'success');
    return { ok: true };
  };

  const revokeDeviceSession = (sessionId: string) => {
    setDb((prev) => ({
      ...prev,
      deviceSessions: prev.deviceSessions.filter((d) => d.id !== sessionId),
    }));
    pushToast('Device signed out.', 'info');
  };

  const submitProOnboarding = (
    userId: string,
    input: {
      accountNumber: string;
      isRealAccount: boolean;
      accessMethod: BrokerAccountLink['accessMethod'];
      simulatedHistoryMonths?: number;
      simulatedTradeCount?: number;
    }
  ) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: 'User not found.' };
    if (!input.isRealAccount) {
      return {
        ok: false,
        error: 'Only real Exness accounts are allowed. Demo accounts are rejected.',
      };
    }
    const cleanNum = input.accountNumber.replace(/\D/g, '');
    if (cleanNum.length < 4) {
      return {
        ok: false,
        error: 'Please enter at least 4 digits of your Exness MT5 account number.',
      };
    }

    const existing = db.traderProfiles.find((p) => p.userId === userId);
    const historyMonths =
      input.simulatedHistoryMonths ?? existing?.ownAccountStats.historyMonths ?? 6;
    const tradeCount =
      input.simulatedTradeCount ?? existing?.ownAccountStats.tradeCount ?? 85;

    if (
      historyMonths < db.settings.minHistoryMonths ||
      tradeCount < db.settings.minTradeCount
    ) {
      return {
        ok: false,
        error: `History too short. Minimum required by Settings: ${db.settings.minHistoryMonths} months and ${db.settings.minTradeCount} real trades.`,
      };
    }

    const masked = `MT5-••••${cleanNum.slice(-4)}`;

    setDb((prev) => {
      if (existing) {
        return {
          ...prev,
          traderProfiles: prev.traderProfiles.map((p) =>
            p.userId === userId
              ? {
                  ...p,
                  ownAccountStats: {
                    ...p.ownAccountStats,
                    historyMonths,
                    tradeCount,
                  },
                  proAccountLink: {
                    accountNumberMasked: masked,
                    accessMethod: input.accessMethod,
                    isRealAccount: true,
                    reviewStatus: 'waiting_review',
                  },
                }
              : p
          ),
        };
      }

      const newProfile: TraderProfile = {
        id: `tp-${Date.now()}`,
        userId,
        displayName: user.fullName,
        country: user.country,
        bio: 'Verified Exness MT5 trader waiting for review.',
        avatarColor: '#10b981',
        tradingStyle: 'Swing Trading',
        instruments: ['EUR/USD', 'XAU/USD'],
        riskTags: ['Balanced'],
        askedProfitSharePercent: db.settings.defaultProTraderSharePercent,
        isOpenForRequests: true,
        maxConnections: 5,
        activeConnectionsCount: 0,
        isApproved: false,
        isPublic: false,
        shohojScore: 72,
        proAccountLink: {
          accountNumberMasked: masked,
          accessMethod: input.accessMethod,
          isRealAccount: true,
          reviewStatus: 'waiting_review',
        },
        ownAccountStats: {
          winRatePercent: 54.0,
          totalProfitUsd: 2200,
          totalLossUsd: 1050,
          tradeCount,
          avgWinUsd: 40,
          avgLossUsd: 21,
          profitFactor: 1.65,
          maxDrawdownPercent: 11.4,
          accountGrowthPercent: 19.5,
          avgHoldingHours: 14,
          historyMonths,
          leverageUsed: '1:100',
          dataSource: 'Verified read-only Exness MT5 feed',
        },
        managedAccountStats: {
          winRatePercent: 0,
          totalProfitUsd: 0,
          totalLossUsd: 0,
          tradeCount: 0,
          avgWinUsd: 0,
          avgLossUsd: 0,
          profitFactor: 0,
          maxDrawdownPercent: 0,
          accountGrowthPercent: 0,
          avgHoldingHours: 0,
          historyMonths: 0,
          leverageUsed: '1:100',
          dataSource: 'No managed accounts yet',
        },
        monthlyReturns: [
          { month: 'Jun', returnPercent: 2.1 },
          { month: 'Jul', returnPercent: 1.8 },
          { month: 'Aug', returnPercent: -0.9 },
          { month: 'Sep', returnPercent: 3.1 },
          { month: 'Oct', returnPercent: 2.4 },
          { month: 'Nov', returnPercent: 1.9 },
        ],
        equityCurve: [
          { label: 'M1', ownEquity: 5100, managedEquity: 5000 },
          { label: 'M2', ownEquity: 5190, managedEquity: 5000 },
          { label: 'M3', ownEquity: 5145, managedEquity: 5000 },
          { label: 'M4', ownEquity: 5305, managedEquity: 5000 },
          { label: 'M5', ownEquity: 5432, managedEquity: 5000 },
          { label: 'M6', ownEquity: 5535, managedEquity: 5000 },
        ],
      };

      return {
        ...prev,
        traderProfiles: [newProfile, ...prev.traderProfiles],
      };
    });

    pushToast('Account linked and sent for admin review.', 'success');
    return { ok: true };
  };

  const updateProTraderProfile = (
    userId: string,
    updates: {
      displayName: string;
      bio: string;
      avatarColor: string;
      avatarPhotoName?: string;
      avatarUrl?: string;
      tradingStyle: string;
      instruments: string[];
      riskTags: RiskTag[];
      askedProfitSharePercent: number;
      isOpenForRequests: boolean;
      maxConnections: number;
    }
  ) => {
    if (
      updates.askedProfitSharePercent < db.settings.minProSharePercent ||
      updates.askedProfitSharePercent > db.settings.maxProSharePercent
    ) {
      return {
        ok: false,
        error: `Profit share must stay between ${db.settings.minProSharePercent}% and ${db.settings.maxProSharePercent}% (from Settings).`,
      };
    }

    if (updates.askedProfitSharePercent <= db.settings.platformCommissionPercent) {
      return {
        ok: false,
        error: `Profit share must be greater than the ${db.settings.platformCommissionPercent}% platform commission.`,
      };
    }

    setDb((prev) => ({
      ...prev,
      users:
        updates.avatarUrl !== undefined
          ? prev.users.map((u) =>
              u.id === userId ? { ...u, avatarUrl: updates.avatarUrl || undefined } : u
            )
          : prev.users,
      traderProfiles: prev.traderProfiles.map((p) => {
        if (p.userId !== userId) return p;
        const nextProfile: TraderProfile = {
          ...p,
          displayName: updates.displayName.trim() || p.displayName,
          bio: updates.bio.trim(),
          avatarColor: updates.avatarColor,
          avatarPhotoName: updates.avatarPhotoName,
          avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl || undefined : p.avatarUrl,
          tradingStyle: updates.tradingStyle,
          instruments: updates.instruments.length > 0 ? updates.instruments : p.instruments,
          riskTags: updates.riskTags.length > 0 ? updates.riskTags : ['Balanced'],
          askedProfitSharePercent: updates.askedProfitSharePercent,
          isOpenForRequests: updates.isOpenForRequests,
          maxConnections: Math.max(1, Math.min(50, updates.maxConnections)),
        };
        nextProfile.shohojScore = computeShohojScore(
          nextProfile,
          prev.settings.shohojScoreWeights
        );
        return nextProfile;
      }),
    }));

    pushToast('Trader profile saved.', 'success');
    return { ok: true };
  };

  const simulateProReviewDecision = (
    userId: string,
    decision: 'approved' | 'rejected',
    note?: string
  ) => {
    setDb((prev) => ({
      ...prev,
      traderProfiles: prev.traderProfiles.map((p) =>
        p.userId === userId
          ? {
              ...p,
              isApproved: decision === 'approved',
              isPublic: decision === 'approved',
              proAccountLink: {
                accountNumberMasked: p.proAccountLink?.accountNumberMasked ?? 'MT5-••••4410',
                accessMethod:
                  p.proAccountLink?.accessMethod ??
                  'Read-only (investor) access for checking results only',
                isRealAccount: true,
                reviewStatus: decision,
                reviewNote: note,
              },
            }
          : p
      ),
    }));
    pushToast(
      decision === 'approved'
        ? 'Trader profile approved and now public.'
        : 'Trader profile marked rejected for testing.',
      decision === 'approved' ? 'success' : 'warning'
    );
  };

  const toggleFavoriteTrader = (traderId: string) => {
    const exists = db.favoriteTraderIds.includes(traderId);
    setDb((prev) => ({
      ...prev,
      favoriteTraderIds: exists
        ? prev.favoriteTraderIds.filter((id) => id !== traderId)
        : [...prev.favoriteTraderIds, traderId],
    }));
    pushToast(exists ? 'Removed from favorites.' : 'Saved to favorites.', 'info');
  };

  const saveTraderFilter = (name: string, queryString: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    setDb((prev) => ({
      ...prev,
      savedTraderFilters: [
        {
          id: `sf-${Date.now()}`,
          name: cleanName,
          queryString,
          createdAt: simulatedNow.toISOString(),
        },
        ...prev.savedTraderFilters,
      ],
    }));
    pushToast(`Saved filter "${cleanName}".`, 'success');
  };

  const deleteSavedTraderFilter = (filterId: string) => {
    setDb((prev) => ({
      ...prev,
      savedTraderFilters: prev.savedTraderFilters.filter((f) => f.id !== filterId),
    }));
    pushToast('Saved filter removed.', 'info');
  };

  const unreadNotificationsCount = useMemo(() => {
    if (!currentUser) return 0;
    return db.notifications.filter((n) => n.userId === currentUser.id && !n.isRead).length;
  }, [db.notifications, currentUser]);

  const sendConnectionRequest = (input: {
    newTraderId: string;
    proTraderProfileId: string;
    plannedAmountUsd: number;
    riskComfort: 'Low' | 'Medium' | 'Higher';
    message: string;
  }): { ok: boolean; error?: string; connectionId?: string } => {
    const newTrader = db.users.find((u) => u.id === input.newTraderId);
    const proProfile = db.traderProfiles.find(
      (p) => p.id === input.proTraderProfileId || p.userId === input.proTraderProfileId
    );
    if (!newTrader || !proProfile) {
      return { ok: false, error: 'Could not find the selected trader account.' };
    }
    if (newTrader.id === proProfile.userId) {
      return { ok: false, error: 'You cannot send a Request to Connect to yourself.' };
    }
    if (!proProfile.isApproved || !proProfile.isPublic) {
      return { ok: false, error: 'This trader is not approved for public requests yet.' };
    }
    if (!proProfile.isOpenForRequests) {
      return { ok: false, error: 'This trader is currently closed to new requests.' };
    }
    if (proProfile.activeConnectionsCount >= proProfile.maxConnections) {
      return { ok: false, error: 'This trader has reached their maximum active connections.' };
    }
    if (
      !Number.isFinite(input.plannedAmountUsd) ||
      input.plannedAmountUsd < db.settings.minDepositUsd
    ) {
      return {
        ok: false,
        error: `Minimum planned starting amount is $${db.settings.minDepositUsd} (from Settings).`,
      };
    }

    const existingOpen = db.connections.find(
      (c) =>
        c.newTraderId === newTrader.id &&
        c.proTraderId === proProfile.userId &&
        ['pending', 'accepted', 'active', 'paused'].includes(c.status)
    );
    if (existingOpen) {
      return {
        ok: false,
        error: `You already have an open connection (${existingOpen.status}) with ${proProfile.displayName}.`,
      };
    }

    const nowIso = simulatedNow.toISOString();
    const expDate = new Date(simulatedNow.getTime());
    expDate.setDate(expDate.getDate() + db.settings.requestExpiryDays);
    const expIso = expDate.toISOString();
    const connId = `conn-${Date.now()}`;

    const proShare = proProfile.askedProfitSharePercent;
    const newShare = 100 - proShare;

    const newConn: Connection = {
      id: connId,
      newTraderId: newTrader.id,
      proTraderId: proProfile.userId,
      status: 'pending',
      plannedAmountUsd: Math.round(input.plannedAmountUsd),
      currentBalanceUsd: Math.round(input.plannedAmountUsd),
      realizedProfitUsd: 0,
      highWaterMarkUsd: Math.round(input.plannedAmountUsd),
      requestMessage: input.message.trim() || 'Hello, I would like to connect under these terms.',
      riskComfort: input.riskComfort,
      createdAt: nowIso,
      expiresAt: expIso,
      snapshot: {
        newTraderSharePercent: newShare,
        proTraderSharePercent: proShare,
        platformCommissionPercent: db.settings.platformCommissionPercent,
        settlementPeriod: db.settings.settlementPeriod,
        maxDrawdownPercent: db.settings.maxDrawdownPercent,
        maxRiskPerTradePercent: db.settings.maxRiskPerTradePercent,
        maxLotSize: db.settings.maxLotSize,
        cancellationNoticeDays: db.settings.cancellationNoticeDays,
        commissionProtectionMonths: db.settings.commissionProtectionMonths,
        openTradeRule: db.settings.openTradeRule,
      },
      history: [
        {
          status: 'pending',
          changedAt: nowIso,
          changedByName: newTrader.fullName,
          reason: 'Sent Request to Connect.',
        },
      ],
    };

    setDb((prev) => ({
      ...prev,
      connections: [newConn, ...prev.connections],
      notifications: [
        {
          id: `notif-req-${Date.now()}`,
          userId: proProfile.userId,
          title: 'New Request to Connect',
          body: `${newTrader.fullName} sent a Request to Connect with $${newConn.plannedAmountUsd} planned deposit.`,
          eventKey: 'new_request',
          createdAt: nowIso,
          isRead: false,
        },
        {
          id: `notif-req-sent-${Date.now()}`,
          userId: newTrader.id,
          title: 'Request to Connect sent',
          body: `Sent to ${proProfile.displayName}. Expires in ${prev.settings.requestExpiryDays} days if no reply.`,
          eventKey: 'new_request',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
      auditLog: [
        {
          id: `audit-req-${Date.now()}`,
          actorName: newTrader.fullName,
          actorRole: 'New Trader',
          action: `Sent Request to Connect ($${newConn.plannedAmountUsd})`,
          target: proProfile.displayName,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));

    pushToast(`Request sent to ${proProfile.displayName}.`, 'success');
    return { ok: true, connectionId: connId };
  };

  const cancelConnectionRequest = (
    connectionId: string,
    reason = 'Cancelled by New Trader before acceptance.'
  ): { ok: boolean; error?: string } => {
    const conn = db.connections.find((c) => c.id === connectionId);
    if (!conn) return { ok: false, error: 'Request not found.' };
    if (conn.status !== 'pending') {
      return { ok: false, error: 'Only pending requests can be cancelled here.' };
    }

    const nowIso = simulatedNow.toISOString();
    const newUser = db.users.find((u) => u.id === conn.newTraderId);

    setDb((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.id === connectionId
          ? {
              ...c,
              status: 'cancelled',
              history: [
                ...c.history,
                {
                  status: 'cancelled',
                  changedAt: nowIso,
                  changedByName: newUser?.fullName ?? 'New Trader',
                  reason: reason.trim() || 'Cancelled by New Trader.',
                },
              ],
            }
          : c
      ),
      notifications: [
        {
          id: `notif-cancel-${Date.now()}`,
          userId: conn.proTraderId,
          title: 'Request cancelled',
          body: `${newUser?.fullName ?? 'New Trader'} cancelled their Request to Connect.`,
          eventKey: 'request_cancelled',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
      auditLog: [
        {
          id: `audit-cancel-${Date.now()}`,
          actorName: newUser?.fullName ?? 'New Trader',
          actorRole: 'New Trader',
          action: 'Cancelled pending Request to Connect',
          target: connectionId,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));

    pushToast('Request cancelled.', 'info');
    return { ok: true };
  };

  const respondToConnectionRequest = (
    connectionId: string,
    decision: 'accepted' | 'rejected',
    reason?: string
  ): { ok: boolean; error?: string } => {
    const conn = db.connections.find((c) => c.id === connectionId);
    if (!conn) return { ok: false, error: 'Request not found.' };
    if (conn.status !== 'pending') {
      return { ok: false, error: 'This request has already been handled.' };
    }
    if (decision === 'rejected' && (!reason || reason.trim().length < 4)) {
      return { ok: false, error: 'Please write a short reason for rejecting this request.' };
    }

    const nowIso = simulatedNow.toISOString();
    const proUser = db.users.find((u) => u.id === conn.proTraderId);
    const cleanReason =
      decision === 'accepted'
        ? reason?.trim() || 'Accepted. Ready to chat and sign agreement.'
        : reason!.trim();

    setDb((prev) => {
      const hasAgreement = prev.agreements.some((a) => a.connectionId === connectionId);
      const createdAgreement: AgreementRecord[] =
        decision === 'accepted' && !hasAgreement
          ? [
              {
                id: `agr-${Date.now()}`,
                connectionId,
                snapshot: { ...conn.snapshot },
                openTradeCloseHours: prev.settings.openTradeCloseHours,
                accessChecklistDone: false,
                accessActive: false,
                createdAt: nowIso,
              },
            ]
          : [];

      return {
        ...prev,
        connections: prev.connections.map((c) =>
          c.id === connectionId
            ? {
                ...c,
                status: decision,
                rejectionReason: decision === 'rejected' ? cleanReason : undefined,
                history: [
                  ...c.history,
                  {
                    status: decision,
                    changedAt: nowIso,
                    changedByName: proUser?.fullName ?? 'Professional Trader',
                    reason: cleanReason,
                  },
                ],
              }
            : c
        ),
        agreements: [...createdAgreement, ...prev.agreements],
        notifications: [
          {
            id: `notif-resp-${Date.now()}`,
            userId: conn.newTraderId,
            title: decision === 'accepted' ? 'Request accepted!' : 'Request declined',
            body:
              decision === 'accepted'
                ? `${proUser?.fullName ?? 'Professional Trader'} accepted your Request to Connect. You can now chat and sign your agreement.`
                : `${proUser?.fullName ?? 'Professional Trader'} declined your request: ${cleanReason}`,
            eventKey: decision === 'accepted' ? 'request_accepted' : 'request_rejected',
            createdAt: nowIso,
            isRead: false,
          },
          ...prev.notifications,
        ],
        auditLog: [
          {
            id: `audit-resp-${Date.now()}`,
            actorName: proUser?.fullName ?? 'Professional Trader',
            actorRole: 'Professional Trader',
            action:
              decision === 'accepted' ? 'Accepted Request to Connect' : 'Rejected Request to Connect',
            target: connectionId,
            createdAt: nowIso,
          },
          ...prev.auditLog,
        ],
      };
    });

    pushToast(
      decision === 'accepted' ? 'Request accepted. Contact details unlocked.' : 'Request declined.',
      decision === 'accepted' ? 'success' : 'info'
    );
    return { ok: true };
  };

  const markNotificationRead = (notificationId: string) => {
    setDb((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ),
    }));
  };

  const markAllNotificationsRead = (userId: string) => {
    setDb((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.userId === userId ? { ...n, isRead: true } : n
      ),
    }));
    pushToast('All alerts marked as read.', 'info');
  };

  const sendChatMessage = (input: {
    connectionId: string;
    senderId: string;
    body: string;
    attachmentName?: string;
  }): { ok: boolean; error?: string } => {
    const cleanBody = input.body.trim();
    if (!cleanBody && !input.attachmentName) {
      return { ok: false, error: 'Please write a message or attach a file.' };
    }
    const conn = db.connections.find((c) => c.id === input.connectionId);
    const sender = db.users.find((u) => u.id === input.senderId);
    if (!conn || !sender) return { ok: false, error: 'Conversation not found.' };

    const recipientId = sender.id === conn.newTraderId ? conn.proTraderId : conn.newTraderId;
    const nowIso = simulatedNow.toISOString();

    setDb((prev) => ({
      ...prev,
      chatMessages: [
        ...prev.chatMessages,
        {
          id: `msg-${Date.now()}`,
          connectionId: input.connectionId,
          senderId: sender.id,
          senderName: sender.fullName,
          body: cleanBody || '(File attached)',
          attachmentName: input.attachmentName,
          createdAt: nowIso,
          seenByRecipient: false,
        },
      ],
      notifications: [
        {
          id: `notif-msg-${Date.now()}`,
          userId: recipientId,
          title: `New message from ${sender.fullName}`,
          body: cleanBody ? cleanBody.slice(0, 90) : `Attached file: ${input.attachmentName}`,
          eventKey: 'new_message',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
    }));
    return { ok: true };
  };

  const markChatMessagesSeen = (connectionId: string, viewerId: string) => {
    setDb((prev) => {
      const hasUnread = prev.chatMessages.some(
        (m) => m.connectionId === connectionId && m.senderId !== viewerId && !m.seenByRecipient
      );
      if (!hasUnread) return prev;
      return {
        ...prev,
        chatMessages: prev.chatMessages.map((m) =>
          m.connectionId === connectionId && m.senderId !== viewerId
            ? { ...m, seenByRecipient: true }
            : m
        ),
      };
    });
  };

  const reportChatMessage = (
    messageId: string,
    reason: string
  ): { ok: boolean; error?: string } => {
    if (!reason.trim() || reason.trim().length < 4) {
      return { ok: false, error: 'Please write a short reason for reporting this message.' };
    }
    const nowIso = simulatedNow.toISOString();
    setDb((prev) => ({
      ...prev,
      chatMessages: prev.chatMessages.map((m) =>
        m.id === messageId ? { ...m, isReported: true, reportReason: reason.trim() } : m
      ),
      auditLog: [
        {
          id: `audit-rep-${Date.now()}`,
          actorName: currentUser?.fullName ?? 'User',
          actorRole: currentUser?.role ?? 'user',
          action: 'Reported chat message to Support',
          target: messageId,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));
    pushToast('Message reported to Shohoj Trading Support.', 'warning');
    return { ok: true };
  };

  const signAgreement = (input: {
    connectionId: string;
    userId: string;
    typedName: string;
    acceptedTerms: boolean;
  }): { ok: boolean; error?: string } => {
    const cleanName = input.typedName.trim();
    if (cleanName.length < 2) {
      return { ok: false, error: 'Please type your full name to sign.' };
    }
    if (!input.acceptedTerms) {
      return { ok: false, error: 'Please tick the box confirming you read and accept the terms.' };
    }

    const conn = db.connections.find((c) => c.id === input.connectionId);
    const signer = db.users.find((u) => u.id === input.userId);
    if (!conn || !signer) return { ok: false, error: 'Connection not found.' };

    const isNewTrader = signer.id === conn.newTraderId;
    const otherUserId = isNewTrader ? conn.proTraderId : conn.newTraderId;
    const nowIso = simulatedNow.toISOString();

    let becameActive = false;

    setDb((prev) => {
      let agreement = prev.agreements.find((a) => a.connectionId === input.connectionId);
      const sig = {
        signedByUserId: signer.id,
        typedName: cleanName,
        acceptedTerms: true,
        signedAt: nowIso,
      };

      const baseAgreement: AgreementRecord = agreement ?? {
        id: `agr-${Date.now()}`,
        connectionId: input.connectionId,
        snapshot: { ...conn.snapshot },
        openTradeCloseHours: prev.settings.openTradeCloseHours,
        accessChecklistDone: false,
        accessActive: false,
        createdAt: nowIso,
      };

      const updatedAgreement: AgreementRecord = {
        ...baseAgreement,
        newTraderSignature: isNewTrader ? sig : baseAgreement.newTraderSignature,
        proTraderSignature: !isNewTrader ? sig : baseAgreement.proTraderSignature,
      };

      const bothSigned = Boolean(
        updatedAgreement.newTraderSignature && updatedAgreement.proTraderSignature
      );
      if (bothSigned && updatedAgreement.accessChecklistDone && conn.status === 'accepted') {
        becameActive = true;
        updatedAgreement.activatedAt = nowIso;
      }

      const nextAgreements = agreement
        ? prev.agreements.map((a) => (a.connectionId === input.connectionId ? updatedAgreement : a))
        : [updatedAgreement, ...prev.agreements];

      const nextConnections = becameActive
        ? prev.connections.map((c) =>
            c.id === input.connectionId
              ? {
                  ...c,
                  status: 'active' as const,
                  history: [
                    ...c.history,
                    {
                      status: 'active' as const,
                      changedAt: nowIso,
                      changedByName: signer.fullName,
                      reason: 'Both users signed agreement and account access is verified.',
                    },
                  ],
                }
              : c
          )
        : prev.connections;

      const nextProfiles = becameActive
        ? prev.traderProfiles.map((p) =>
            p.userId === conn.proTraderId
              ? {
                  ...p,
                  activeConnectionsCount: Math.min(
                    p.maxConnections,
                    p.activeConnectionsCount + 1
                  ),
                }
              : p
          )
        : prev.traderProfiles;

      return {
        ...prev,
        agreements: nextAgreements,
        connections: nextConnections,
        traderProfiles: nextProfiles,
        notifications: [
          {
            id: `notif-sign-${Date.now()}`,
            userId: otherUserId,
            title: becameActive ? 'Connection is now Active' : 'Agreement signed by partner',
            body: becameActive
              ? `${signer.fullName} signed and all setup steps are done. Connection is now Active.`
              : `${signer.fullName} signed the agreement. Please review and add your signature.`,
            eventKey: becameActive ? 'connection_active' : 'agreement_ready',
            createdAt: nowIso,
            isRead: false,
          },
          ...prev.notifications,
        ],
        auditLog: [
          {
            id: `audit-sign-${Date.now()}`,
            actorName: signer.fullName,
            actorRole: isNewTrader ? 'New Trader' : 'Professional Trader',
            action: becameActive ? 'Signed agreement & activated connection' : 'Signed agreement',
            target: input.connectionId,
            createdAt: nowIso,
          },
          ...prev.auditLog,
        ],
      };
    });

    pushToast(
      becameActive ? 'Both signed & access ready — Connection is now Active!' : 'Signature saved.',
      'success'
    );
    return { ok: true };
  };

  const completeAccessStep = (input: {
    connectionId: string;
    accessMethod: BrokerAccountLink['accessMethod'];
  }): { ok: boolean; error?: string } => {
    const conn = db.connections.find((c) => c.id === input.connectionId);
    if (!conn) return { ok: false, error: 'Connection not found.' };
    const nowIso = simulatedNow.toISOString();
    const actorName = currentUser?.fullName ?? 'New Trader';
    let becameActive = false;

    setDb((prev) => {
      const agreement = prev.agreements.find((a) => a.connectionId === input.connectionId);
      const baseAgreement: AgreementRecord = agreement ?? {
        id: `agr-${Date.now()}`,
        connectionId: input.connectionId,
        snapshot: { ...conn.snapshot },
        openTradeCloseHours: prev.settings.openTradeCloseHours,
        accessChecklistDone: false,
        accessActive: false,
        createdAt: nowIso,
      };

      const bothSigned = Boolean(baseAgreement.newTraderSignature && baseAgreement.proTraderSignature);
      if (bothSigned && conn.status === 'accepted') {
        becameActive = true;
      }

      const updatedAgreement: AgreementRecord = {
        ...baseAgreement,
        accessMethodChosen: input.accessMethod,
        accessChecklistDone: true,
        accessActive: true,
        accessRemovedAt: undefined,
        activatedAt: becameActive ? nowIso : baseAgreement.activatedAt,
      };

      const nextAgreements = agreement
        ? prev.agreements.map((a) => (a.connectionId === input.connectionId ? updatedAgreement : a))
        : [updatedAgreement, ...prev.agreements];

      const nextConnections = becameActive
        ? prev.connections.map((c) =>
            c.id === input.connectionId
              ? {
                  ...c,
                  status: 'active' as const,
                  history: [
                    ...c.history,
                    {
                      status: 'active' as const,
                      changedAt: nowIso,
                      changedByName: actorName,
                      reason: `Completed approved access (${input.accessMethod}) with both signatures.`,
                    },
                  ],
                }
              : c
          )
        : prev.connections;

      const nextProfiles = becameActive
        ? prev.traderProfiles.map((p) =>
            p.userId === conn.proTraderId
              ? {
                  ...p,
                  activeConnectionsCount: Math.min(
                    p.maxConnections,
                    p.activeConnectionsCount + 1
                  ),
                }
              : p
          )
        : prev.traderProfiles;

      return {
        ...prev,
        agreements: nextAgreements,
        connections: nextConnections,
        traderProfiles: nextProfiles,
        notifications: becameActive
          ? [
              {
                id: `notif-act-${Date.now()}`,
                userId: conn.proTraderId,
                title: 'Connection is now Active',
                body: `${actorName} linked approved Exness access (${input.accessMethod}).`,
                eventKey: 'connection_active',
                createdAt: nowIso,
                isRead: false,
              },
              ...prev.notifications,
            ]
          : prev.notifications,
      };
    });

    pushToast(
      becameActive
        ? 'Approved access connected & Connection is now Active!'
        : 'Approved access saved. Connection activates once both users sign.',
      'success'
    );
    return { ok: true };
  };

  const removeBrokerAccess = (connectionId: string, actorName: string) => {
    const conn = db.connections.find((c) => c.id === connectionId);
    if (!conn) return;
    const nowIso = simulatedNow.toISOString();

    setDb((prev) => ({
      ...prev,
      agreements: prev.agreements.map((a) =>
        a.connectionId === connectionId
          ? { ...a, accessActive: false, accessRemovedAt: nowIso }
          : a
      ),
      connections: prev.connections.map((c) =>
        c.id === connectionId && c.status === 'active'
          ? {
              ...c,
              status: 'paused',
              history: [
                ...c.history,
                {
                  status: 'paused',
                  changedAt: nowIso,
                  changedByName: actorName,
                  reason: 'Broker access removed using one-click Remove Access button.',
                },
              ],
            }
          : c
      ),
      notifications: [
        {
          id: `notif-rem-${Date.now()}`,
          userId: conn.proTraderId,
          title: 'Broker access removed',
          body: `${actorName} removed Exness account access. Connection moved to Paused.`,
          eventKey: 'connection_paused',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
      auditLog: [
        {
          id: `audit-rem-${Date.now()}`,
          actorName,
          actorRole: 'New Trader',
          action: 'Removed Exness broker access',
          target: connectionId,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));

    pushToast('Broker access removed safely.', 'warning');
  };

  const proposeAgreementChange = (input: {
    connectionId: string;
    userId: string;
    proposedProSharePercent: number;
    proposedMaxDrawdownPercent: number;
    proposedNoticeDays: number;
    reason: string;
  }): { ok: boolean; error?: string } => {
    const conn = db.connections.find((c) => c.id === input.connectionId);
    const proposer = db.users.find((u) => u.id === input.userId);
    if (!conn || !proposer) return { ok: false, error: 'Connection not found.' };

    if (
      input.proposedProSharePercent < db.settings.minProSharePercent ||
      input.proposedProSharePercent > db.settings.maxProSharePercent
    ) {
      return {
        ok: false,
        error: `Pro share must stay between ${db.settings.minProSharePercent}% and ${db.settings.maxProSharePercent}%.`,
      };
    }
    if (input.proposedProSharePercent <= db.settings.platformCommissionPercent) {
      return {
        ok: false,
        error: `Pro share must exceed ${db.settings.platformCommissionPercent}% platform commission.`,
      };
    }
    if (!input.reason.trim()) {
      return { ok: false, error: 'Please explain why you are asking for this change.' };
    }

    const isNewTrader = proposer.id === conn.newTraderId;
    const otherUserId = isNewTrader ? conn.proTraderId : conn.newTraderId;
    const nowIso = simulatedNow.toISOString();

    setDb((prev) => ({
      ...prev,
      agreementChangeRequests: [
        {
          id: `acr-${Date.now()}`,
          connectionId: input.connectionId,
          requestedByUserId: proposer.id,
          requestedByName: proposer.fullName,
          proposedProSharePercent: input.proposedProSharePercent,
          proposedMaxDrawdownPercent: input.proposedMaxDrawdownPercent,
          proposedNoticeDays: input.proposedNoticeDays,
          reason: input.reason.trim(),
          newTraderAccepted: isNewTrader,
          proTraderAccepted: !isNewTrader,
          status: 'pending',
          createdAt: nowIso,
        },
        ...prev.agreementChangeRequests,
      ],
      notifications: [
        {
          id: `notif-acr-${Date.now()}`,
          userId: otherUserId,
          title: 'Agreement change requested',
          body: `${proposer.fullName} proposed new terms (${100 - input.proposedProSharePercent}/${input.proposedProSharePercent} split). Both must accept.`,
          eventKey: 'agreement_change',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
    }));

    pushToast('Change request sent. Waiting for partner approval.', 'success');
    return { ok: true };
  };

  const respondToAgreementChange = (input: {
    changeId: string;
    userId: string;
    accept: boolean;
  }): { ok: boolean; error?: string } => {
    const req = db.agreementChangeRequests.find((r) => r.id === input.changeId);
    if (!req) return { ok: false, error: 'Change request not found.' };
    if (req.status !== 'pending') return { ok: false, error: 'Already handled.' };
    const conn = db.connections.find((c) => c.id === req.connectionId);
    const responder = db.users.find((u) => u.id === input.userId);
    if (!conn || !responder) return { ok: false, error: 'Connection not found.' };

    const isNewTrader = responder.id === conn.newTraderId;
    const otherUserId = isNewTrader ? conn.proTraderId : conn.newTraderId;
    const nowIso = simulatedNow.toISOString();

    setDb((prev) => {
      const nextChanges = prev.agreementChangeRequests.map((r) => {
        if (r.id !== input.changeId) return r;
        if (!input.accept) {
          return { ...r, status: 'declined' as const };
        }
        const ntAcc = isNewTrader ? true : r.newTraderAccepted;
        const ptAcc = !isNewTrader ? true : r.proTraderAccepted;
        const bothAccepted = ntAcc && ptAcc;
        return {
          ...r,
          newTraderAccepted: ntAcc,
          proTraderAccepted: ptAcc,
          status: bothAccepted ? ('applied' as const) : ('pending' as const),
        };
      });

      const appliedReq = nextChanges.find((r) => r.id === input.changeId);
      const didApply = appliedReq?.status === 'applied';

      const applySnapshot = (snap: Connection['snapshot']): Connection['snapshot'] => ({
        ...snap,
        newTraderSharePercent: 100 - req.proposedProSharePercent,
        proTraderSharePercent: req.proposedProSharePercent,
        maxDrawdownPercent: req.proposedMaxDrawdownPercent,
        cancellationNoticeDays: req.proposedNoticeDays,
      });

      return {
        ...prev,
        agreementChangeRequests: nextChanges,
        agreements: didApply
          ? prev.agreements.map((a) =>
              a.connectionId === req.connectionId
                ? { ...a, snapshot: applySnapshot(a.snapshot) }
                : a
            )
          : prev.agreements,
        connections: didApply
          ? prev.connections.map((c) =>
              c.id === req.connectionId
                ? {
                    ...c,
                    snapshot: applySnapshot(c.snapshot),
                    history: [
                      ...c.history,
                      {
                        status: c.status,
                        changedAt: nowIso,
                        changedByName: responder.fullName,
                        reason: `Both users accepted agreement change: ${req.reason}`,
                      },
                    ],
                  }
                : c
            )
          : prev.connections,
        notifications: [
          {
            id: `notif-acr-resp-${Date.now()}`,
            userId: otherUserId,
            title: input.accept ? 'Agreement change accepted' : 'Agreement change declined',
            body: input.accept
              ? `${responder.fullName} accepted the proposed agreement update.`
              : `${responder.fullName} declined the agreement change. Existing terms stay locked.`,
            eventKey: 'agreement_change',
            createdAt: nowIso,
            isRead: false,
          },
          ...prev.notifications,
        ],
      };
    });

    pushToast(
      input.accept ? 'Agreement updated with mutual approval.' : 'Change request declined.',
      input.accept ? 'success' : 'info'
    );
    return { ok: true };
  };

  const pauseConnection = (
    connectionId: string,
    actorName: string,
    reason?: string
  ): { ok: boolean; error?: string } => {
    const conn = db.connections.find((c) => c.id === connectionId);
    if (!conn) return { ok: false, error: 'Connection not found.' };
    if (conn.status !== 'active') {
      return { ok: false, error: 'Only active connections can be paused.' };
    }
    const nowIso = simulatedNow.toISOString();
    const cleanReason = reason?.trim() || 'Paused temporarily from Connection Dashboard.';
    const partnerId =
      currentUser?.id === conn.newTraderId ? conn.proTraderId : conn.newTraderId;

    setDb((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.id === connectionId
          ? {
              ...c,
              status: 'paused',
              history: [
                ...c.history,
                {
                  status: 'paused',
                  changedAt: nowIso,
                  changedByName: actorName,
                  reason: cleanReason,
                },
              ],
            }
          : c
      ),
      agreements: prev.agreements.map((a) =>
        a.connectionId === connectionId ? { ...a, accessActive: false } : a
      ),
      notifications: [
        {
          id: `notif-pause-${Date.now()}`,
          userId: partnerId,
          title: 'Connection paused',
          body: `${actorName} paused connection ${connectionId}: ${cleanReason}`,
          eventKey: 'connection_paused',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
      auditLog: [
        {
          id: `audit-pause-${Date.now()}`,
          actorName,
          actorRole: currentRole === 'pro_trader' ? 'Professional Trader' : 'New Trader',
          action: 'Paused active connection',
          target: connectionId,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));

    pushToast('Connection paused.', 'warning');
    return { ok: true };
  };

  const resumeConnection = (
    connectionId: string,
    actorName: string
  ): { ok: boolean; error?: string } => {
    const conn = db.connections.find((c) => c.id === connectionId);
    if (!conn) return { ok: false, error: 'Connection not found.' };
    if (conn.status !== 'paused') {
      return { ok: false, error: 'Only paused connections can be resumed.' };
    }
    const nowIso = simulatedNow.toISOString();
    const partnerId =
      currentUser?.id === conn.newTraderId ? conn.proTraderId : conn.newTraderId;

    setDb((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.id === connectionId
          ? {
              ...c,
              status: 'active',
              riskWarningMessage: undefined,
              currentDrawdownPercent: Math.min(
                c.currentDrawdownPercent ?? 4.2,
                Math.max(1.5, c.snapshot.maxDrawdownPercent - 5)
              ),
              history: [
                ...c.history,
                {
                  status: 'active',
                  changedAt: nowIso,
                  changedByName: actorName,
                  reason: 'Resumed connection after review.',
                },
              ],
            }
          : c
      ),
      agreements: prev.agreements.map((a) =>
        a.connectionId === connectionId ? { ...a, accessActive: true } : a
      ),
      notifications: [
        {
          id: `notif-res-${Date.now()}`,
          userId: partnerId,
          title: 'Connection resumed',
          body: `${actorName} resumed connection ${connectionId}.`,
          eventKey: 'connection_active',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
      auditLog: [
        {
          id: `audit-res-${Date.now()}`,
          actorName,
          actorRole: currentRole === 'pro_trader' ? 'Professional Trader' : 'New Trader',
          action: 'Resumed paused connection',
          target: connectionId,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));

    pushToast('Connection is active again.', 'success');
    return { ok: true };
  };

  const completeConnection = (
    connectionId: string,
    actorName: string
  ): { ok: boolean; error?: string } => {
    const conn = db.connections.find((c) => c.id === connectionId);
    if (!conn) return { ok: false, error: 'Connection not found.' };
    if (!['active', 'paused'].includes(conn.status)) {
      return { ok: false, error: 'Only active or paused connections can be completed.' };
    }
    const nowIso = simulatedNow.toISOString();
    const wasActive = conn.status === 'active';

    setDb((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.id === connectionId
          ? {
              ...c,
              status: 'completed',
              periodProgressPercent: 100,
              history: [
                ...c.history,
                {
                  status: 'completed',
                  changedAt: nowIso,
                  changedByName: actorName,
                  reason: 'Marked period complete cleanly.',
                },
              ],
            }
          : c
      ),
      agreements: prev.agreements.map((a) =>
        a.connectionId === connectionId
          ? { ...a, accessActive: false, accessRemovedAt: nowIso }
          : a
      ),
      traderProfiles: wasActive
        ? prev.traderProfiles.map((p) =>
            p.userId === conn.proTraderId
              ? { ...p, activeConnectionsCount: Math.max(0, p.activeConnectionsCount - 1) }
              : p
          )
        : prev.traderProfiles,
      notifications: [
        {
          id: `notif-comp-nt-${Date.now()}`,
          userId: conn.newTraderId,
          title: 'Connection completed',
          body: `Connection ${connectionId} was marked complete by ${actorName}.`,
          eventKey: 'connection_completed',
          createdAt: nowIso,
          isRead: false,
        },
        {
          id: `notif-comp-pt-${Date.now()}`,
          userId: conn.proTraderId,
          title: 'Connection completed',
          body: `Connection ${connectionId} was marked complete by ${actorName}.`,
          eventKey: 'connection_completed',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
      auditLog: [
        {
          id: `audit-comp-${Date.now()}`,
          actorName,
          actorRole: currentRole === 'pro_trader' ? 'Professional Trader' : 'New Trader',
          action: 'Completed connection',
          target: connectionId,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));

    pushToast('Connection marked as completed.', 'success');
    return { ok: true };
  };

  const stopConnection = (
    connectionId: string,
    actorName: string,
    reason?: string
  ): { ok: boolean; error?: string } => {
    const conn = db.connections.find((c) => c.id === connectionId);
    if (!conn) return { ok: false, error: 'Connection not found.' };
    if (!['active', 'paused', 'accepted'].includes(conn.status)) {
      return { ok: false, error: 'This connection is already closed.' };
    }

    const nowIso = simulatedNow.toISOString();
    const wasActive = conn.status === 'active';
    const openTradeNote =
      conn.snapshot.openTradeRule === 'close_immediately'
        ? 'close open trades immediately'
        : conn.snapshot.openTradeRule === 'let_finish'
        ? 'let open trades finish without new trades'
        : `close open trades within ${db.settings.openTradeCloseHours} hours`;
    const fullReason = `${reason?.trim() || 'Stopped by New Trader.'} (${conn.snapshot.cancellationNoticeDays}-day notice rule · ${openTradeNote})`;

    setDb((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.id === connectionId
          ? {
              ...c,
              status: 'completed',
              history: [
                ...c.history,
                {
                  status: 'completed',
                  changedAt: nowIso,
                  changedByName: actorName,
                  reason: fullReason,
                },
              ],
            }
          : c
      ),
      agreements: prev.agreements.map((a) =>
        a.connectionId === connectionId
          ? { ...a, accessActive: false, accessRemovedAt: nowIso }
          : a
      ),
      traderProfiles: wasActive
        ? prev.traderProfiles.map((p) =>
            p.userId === conn.proTraderId
              ? { ...p, activeConnectionsCount: Math.max(0, p.activeConnectionsCount - 1) }
              : p
          )
        : prev.traderProfiles,
      notifications: [
        {
          id: `notif-stop-${Date.now()}`,
          userId: conn.proTraderId,
          title: 'Connection stopped by New Trader',
          body: `${actorName} stopped connection ${connectionId}. Access removed under ${conn.snapshot.cancellationNoticeDays}-day notice rule.`,
          eventKey: 'connection_stopped',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
      auditLog: [
        {
          id: `audit-stop-${Date.now()}`,
          actorName,
          actorRole: 'New Trader',
          action: 'Stopped connection & removed access',
          target: connectionId,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));

    pushToast('Connection stopped and broker access removed.', 'warning');
    return { ok: true };
  };

  const simulateRuleBreak = () => {
    const targetConn =
      db.connections.find((c) => c.status === 'active') ??
      db.connections.find((c) => c.status === 'paused');

    if (!targetConn) {
      pushToast('No active or paused connection available to simulate a rule break.', 'info');
      return;
    }

    const nowIso = simulatedNow.toISOString();
    const breachedDrawdown = Number((targetConn.snapshot.maxDrawdownPercent + 2.4).toFixed(1));
    const breachedRisk = Number((targetConn.snapshot.maxRiskPerTradePercent + 0.8).toFixed(1));
    const warningMsg = `Safety limit passed: Drawdown reached ${breachedDrawdown}% (limit ${targetConn.snapshot.maxDrawdownPercent}%). Connection auto-paused.`;

    setDb((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.id === targetConn.id
          ? {
              ...c,
              status: 'paused',
              currentDrawdownPercent: breachedDrawdown,
              lastRiskPerTradePercent: breachedRisk,
              riskWarningMessage: warningMsg,
              history: [
                ...c.history,
                {
                  status: 'paused',
                  changedAt: nowIso,
                  changedByName: 'Risk Monitor',
                  reason: warningMsg,
                },
              ],
            }
          : c
      ),
      agreements: prev.agreements.map((a) =>
        a.connectionId === targetConn.id ? { ...a, accessActive: false } : a
      ),
      notifications: [
        {
          id: `notif-rb-nt-${Date.now()}`,
          userId: targetConn.newTraderId,
          title: 'Risk limit warning — Connection auto-paused',
          body: warningMsg,
          eventKey: 'risk_limit_warning',
          createdAt: nowIso,
          isRead: false,
        },
        {
          id: `notif-rb-pt-${Date.now()}`,
          userId: targetConn.proTraderId,
          title: 'Risk limit warning — Connection auto-paused',
          body: warningMsg,
          eventKey: 'risk_limit_warning',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
      auditLog: [
        {
          id: `audit-rb-${Date.now()}`,
          actorName: 'Risk Monitor (Demo)',
          actorRole: 'Automated',
          action: `Simulated rule break (${breachedDrawdown}% drawdown) — auto-paused`,
          target: targetConn.id,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));

    pushToast('Rule break simulated! Connection paused and alerts sent to both traders.', 'error');
  };

  const openDispute = (input: {
    connectionId: string;
    userId: string;
    reason: string;
    details: string;
    evidenceFileName?: string;
  }): { ok: boolean; error?: string } => {
    if (!input.reason.trim()) {
      return { ok: false, error: 'Please choose or enter a dispute reason.' };
    }
    if (input.details.trim().length < 8) {
      return { ok: false, error: 'Please explain what happened (at least 8 characters).' };
    }
    const conn = db.connections.find((c) => c.id === input.connectionId);
    const opener = db.users.find((u) => u.id === input.userId);
    if (!conn || !opener) return { ok: false, error: 'Connection or user not found.' };

    const partnerId = opener.id === conn.newTraderId ? conn.proTraderId : conn.newTraderId;
    const partner = db.users.find((u) => u.id === partnerId);
    const nowIso = simulatedNow.toISOString();

    const newCase: DisputeCase = {
      id: `disp-${Date.now()}`,
      connectionId: conn.id,
      openedByUserId: opener.id,
      openedByName: opener.fullName,
      againstUserId: partnerId,
      againstName: partner?.fullName ?? 'Partner Trader',
      reason: input.reason.trim(),
      details: input.details.trim(),
      evidenceFileName: input.evidenceFileName?.trim() || undefined,
      status: 'open',
      createdAt: nowIso,
    };

    setDb((prev) => ({
      ...prev,
      disputes: [newCase, ...prev.disputes],
      notifications: [
        {
          id: `notif-disp-p-${Date.now()}`,
          userId: partnerId,
          title: 'Dispute opened on connection',
          body: `${opener.fullName} opened a Support dispute on ${conn.id}: ${newCase.reason}`,
          eventKey: 'dispute_opened',
          createdAt: nowIso,
          isRead: false,
        },
        {
          id: `notif-disp-adm-${Date.now()}`,
          userId: 'admin-3',
          title: 'New Support Dispute',
          body: `${opener.fullName} opened dispute ${newCase.id} (${newCase.reason}).`,
          eventKey: 'dispute_opened',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
      auditLog: [
        {
          id: `audit-disp-${Date.now()}`,
          actorName: opener.fullName,
          actorRole: opener.role === 'pro_trader' ? 'Professional Trader' : 'New Trader',
          action: `Opened dispute (${newCase.reason})`,
          target: conn.id,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));

    pushToast('Dispute opened. Support team has received the full connection record.', 'warning');
    return { ok: true };
  };

  const requestDisputeReview = (
    disputeId: string,
    userId: string,
    note: string
  ): { ok: boolean; error?: string } => {
    const existing = db.disputes.find((d) => d.id === disputeId);
    const requester = db.users.find((u) => u.id === userId);
    if (!existing || !requester) return { ok: false, error: 'Dispute case not found.' };
    if (note.trim().length < 5) {
      return { ok: false, error: 'Please write a short reason why you are asking for review.' };
    }
    const nowIso = simulatedNow.toISOString();

    setDb((prev) => ({
      ...prev,
      disputes: prev.disputes.map((d) =>
        d.id === disputeId
          ? {
              ...d,
              status: 'under_review' as const,
              reviewRequested: true,
              reviewRequestedAt: nowIso,
              reviewRequestNote: note.trim(),
            }
          : d
      ),
      notifications: [
        {
          id: `notif-disp-rev-${Date.now()}`,
          userId: 'admin-3',
          title: `Review requested on dispute #${disputeId}`,
          body: `${requester.fullName} asked Support to review case ${disputeId}: ${note.trim()}`,
          eventKey: 'important_update',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
      auditLog: [
        {
          id: `audit-disp-rev-${Date.now()}`,
          actorName: requester.fullName,
          actorRole: requester.role === 'pro_trader' ? 'Professional Trader' : 'New Trader',
          action: `Requested extra Support review on dispute #${disputeId}`,
          target: existing.connectionId,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));

    pushToast('Review request sent to Shohoj Support.', 'success');
    return { ok: true };
  };

  const reportTraderOrUser = (input: {
    reporterId: string;
    targetUserId: string;
    reason: string;
    details: string;
  }): { ok: boolean; error?: string } => {
    if (!input.reason.trim()) {
      return { ok: false, error: 'Please select a reason for this report.' };
    }
    if (input.details.trim().length < 8) {
      return { ok: false, error: 'Please add short details (at least 8 characters).' };
    }
    const reporter = db.users.find((u) => u.id === input.reporterId);
    const target = db.users.find((u) => u.id === input.targetUserId);
    if (!reporter || !target) return { ok: false, error: 'User not found.' };

    const nowIso = simulatedNow.toISOString();
    const newReport: TraderReport = {
      id: `rep-${Date.now()}`,
      reporterUserId: reporter.id,
      reporterName: reporter.fullName,
      targetUserId: target.id,
      targetName: target.fullName,
      reason: input.reason.trim(),
      details: input.details.trim(),
      status: 'open',
      createdAt: nowIso,
    };

    setDb((prev) => ({
      ...prev,
      reports: [newReport, ...prev.reports],
      notifications: [
        {
          id: `notif-rep-adm-${Date.now()}`,
          userId: 'admin-3',
          title: 'New trader report submitted',
          body: `${reporter.fullName} reported ${target.fullName}: ${newReport.reason}`,
          eventKey: 'trader_reported',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
      auditLog: [
        {
          id: `audit-tr-rep-${Date.now()}`,
          actorName: reporter.fullName,
          actorRole: reporter.role === 'pro_trader' ? 'Professional Trader' : 'New Trader',
          action: `Reported ${target.fullName} (${newReport.reason})`,
          target: target.id,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));

    pushToast(`Report against ${target.fullName} sent to Shohoj Support.`, 'warning');
    return { ok: true };
  };

  const runSettlementSimulation = (input: {
    connectionId: string;
    periodLabel: string;
    endingBalanceUsd: number;
    depositsUsd: number;
    withdrawalsUsd: number;
  }): { ok: boolean; error?: string; settlementId?: string } => {
    const conn = db.connections.find((c) => c.id === input.connectionId);
    if (!conn) return { ok: false, error: 'Connection not found.' };
    if (
      !Number.isFinite(input.endingBalanceUsd) ||
      input.endingBalanceUsd < 0 ||
      input.depositsUsd < 0 ||
      input.withdrawalsUsd < 0
    ) {
      return { ok: false, error: 'Please enter valid non-negative dollar amounts.' };
    }

    const split = calculateProfitSplit({
      startingBalanceUsd: conn.currentBalanceUsd,
      endingBalanceUsd: input.endingBalanceUsd,
      depositsDuringPeriodUsd: input.depositsUsd,
      withdrawalsDuringPeriodUsd: input.withdrawalsUsd,
      highWaterMarkUsd: conn.highWaterMarkUsd,
      proSharePercent: conn.snapshot.proTraderSharePercent,
      platformCommissionPercent: conn.snapshot.platformCommissionPercent,
    });

    if (!split.valid) {
      return { ok: false, error: split.error ?? 'Could not run profit split calculation.' };
    }

    const nowIso = simulatedNow.toISOString();
    const dueDate = new Date(simulatedNow.getTime());
    dueDate.setDate(dueDate.getDate() + 7);
    const dueIso = dueDate.toISOString();

    const stlId = `stl-${Date.now()}`;
    const invId = `inv-${String(Date.now()).slice(-4)}`;
    const verificationCode = `SHJ-${simulatedNow.getFullYear()}-${String(Date.now()).slice(-4)}`;

    const newStl: SettlementRecord = {
      id: stlId,
      connectionId: conn.id,
      newTraderId: conn.newTraderId,
      proTraderId: conn.proTraderId,
      periodLabel: input.periodLabel.trim() || `Period ${db.settlements.length + 1}`,
      createdAt: nowIso,
      startingBalanceUsd: conn.currentBalanceUsd,
      endingBalanceUsd: Number(input.endingBalanceUsd.toFixed(2)),
      depositsUsd: Number(input.depositsUsd.toFixed(2)),
      withdrawalsUsd: Number(input.withdrawalsUsd.toFixed(2)),
      previousHwmUsd: conn.highWaterMarkUsd,
      adjustedEndingUsd: fromCents(split.adjustedEndingCents),
      realizedNetProfitUsd: fromCents(split.realizedNetProfitCents),
      eligibleProfitUsd: fromCents(split.eligibleProfitCents),
      recoveryAppliedUsd: fromCents(split.recoveryAppliedCents),
      newHwmUsd: fromCents(split.nextHighWaterMarkCents),
      lossCarryForwardUsd: fromCents(split.lossCarryForwardCents),
      newTraderSharePercent: split.newTraderSharePercent,
      proNetSharePercent: split.proNetSharePercent,
      platformCommissionPercent: split.platformCommissionPercent,
      newTraderAmountUsd: fromCents(split.newTraderCents),
      proNetAmountUsd: fromCents(split.proNetCents),
      platformCommissionUsd: fromCents(split.platformCommissionCents),
      centsSumCheck: split.centsSumCheck,
      commissionProtectionMonths: conn.snapshot.commissionProtectionMonths,
      verificationCode,
    };

    const commissionAmount = fromCents(split.platformCommissionCents);
    const createdInvoice: CommissionInvoice[] =
      commissionAmount > 0
        ? [
            {
              id: invId,
              settlementId: stlId,
              connectionId: conn.id,
              proTraderId: conn.proTraderId,
              newTraderId: conn.newTraderId,
              amountUsd: commissionAmount,
              status: 'due',
              unpaidStage: 'none',
              issuedAt: nowIso,
              dueAt: dueIso,
              history: [
                {
                  step: 'Issued',
                  note: `Commission invoice created for ${newStl.periodLabel}.`,
                  at: nowIso,
                },
              ],
            },
          ]
        : [];

    setDb((prev) => ({
      ...prev,
      settlements: [newStl, ...prev.settlements],
      invoices: [...createdInvoice, ...prev.invoices],
      connections: prev.connections.map((c) =>
        c.id === conn.id
          ? {
              ...c,
              currentBalanceUsd: Number(input.endingBalanceUsd.toFixed(2)),
              highWaterMarkUsd: fromCents(split.nextHighWaterMarkCents),
              realizedProfitUsd: Number(
                (c.realizedProfitUsd + fromCents(split.realizedNetProfitCents)).toFixed(2)
              ),
              feesPaidUsd: Number(
                ((c.feesPaidUsd ?? 0) +
                  fromCents(split.proNetCents) +
                  fromCents(split.platformCommissionCents)).toFixed(2)
              ),
              periodProgressPercent: 100,
              nextSettlementAt: dueIso,
            }
          : c
      ),
      notifications: [
        {
          id: `notif-stl-nt-${Date.now()}`,
          userId: conn.newTraderId,
          title: 'Settlement statement ready',
          body: `${newStl.periodLabel}: Eligible new profit $${newStl.eligibleProfitUsd.toFixed(2)}.`,
          eventKey: 'settlement_ready',
          createdAt: nowIso,
          isRead: false,
        },
        {
          id: `notif-stl-pt-${Date.now()}`,
          userId: conn.proTraderId,
          title: commissionAmount > 0 ? 'Settlement ready & invoice due' : 'Settlement statement ready',
          body:
            commissionAmount > 0
              ? `${newStl.periodLabel}: Your net share $${newStl.proNetAmountUsd.toFixed(2)}. Commission invoice $${commissionAmount.toFixed(2)} due.`
              : `${newStl.periodLabel}: No new profit above High-Water Mark — $0.00 fee charged.`,
          eventKey: commissionAmount > 0 ? 'payment_due' : 'settlement_ready',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
      auditLog: [
        {
          id: `audit-stl-${Date.now()}`,
          actorName: currentUser?.fullName ?? 'System Settlement',
          actorRole: currentRole,
          action: `Ran settlement (${newStl.periodLabel}) · Eligible $${newStl.eligibleProfitUsd.toFixed(2)}`,
          target: conn.id,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));

    pushToast(
      commissionAmount > 0
        ? `Settlement saved (${verificationCode}). Commission invoice $${commissionAmount.toFixed(2)} issued.`
        : `Settlement saved (${verificationCode}). Below High-Water Mark — $0.00 fee.`,
      'success'
    );
    return { ok: true, settlementId: stlId };
  };

  const payCommissionInvoice = (input: {
    invoiceId: string;
    actorName: string;
    providerLabel?: string;
  }): { ok: boolean; error?: string } => {
    const inv = db.invoices.find((i) => i.id === input.invoiceId);
    if (!inv) return { ok: false, error: 'Invoice not found.' };
    if (inv.status === 'paid') return { ok: false, error: 'This invoice is already paid.' };

    const nowIso = simulatedNow.toISOString();
    const method = input.providerLabel ?? 'Licensed Payment Provider (Prototype example)';

    setDb((prev) => {
      const nextInvoices = prev.invoices.map((i) =>
        i.id === inv.id
          ? {
              ...i,
              status: 'paid' as const,
              unpaidStage: 'none' as const,
              paidAt: nowIso,
              paymentMethodLabel: method,
              history: [
                ...i.history,
                {
                  step: 'Paid',
                  note: `Paid $${inv.amountUsd.toFixed(2)} via ${method}.`,
                  at: nowIso,
                },
              ],
            }
          : i
      );

      const hasOtherSuspension = nextInvoices.some(
        (i) => i.proTraderId === inv.proTraderId && i.id !== inv.id && i.unpaidStage === 'suspended'
      );

      return {
        ...prev,
        invoices: nextInvoices,
        users: prev.users.map((u) =>
          u.id === inv.proTraderId && u.isSuspended && !hasOtherSuspension
            ? { ...u, isSuspended: false, suspendReason: undefined }
            : u
        ),
        notifications: [
          {
            id: `notif-paid-${Date.now()}`,
            userId: inv.proTraderId,
            title: 'Commission invoice paid',
            body: `Payment of $${inv.amountUsd.toFixed(2)} for ${inv.id} is confirmed.`,
            eventKey: 'settlement_ready',
            createdAt: nowIso,
            isRead: false,
          },
          ...prev.notifications,
        ],
        auditLog: [
          {
            id: `audit-paid-${Date.now()}`,
            actorName: input.actorName,
            actorRole: 'Professional Trader',
            action: `Paid commission invoice ($${inv.amountUsd.toFixed(2)})`,
            target: inv.id,
            createdAt: nowIso,
          },
          ...prev.auditLog,
        ],
      };
    });

    pushToast(`Invoice ${inv.id} paid via licensed payment provider (demo).`, 'success');
    return { ok: true };
  };

  const advanceUnpaidInvoiceStep = (
    invoiceId: string
  ): { ok: boolean; error?: string } => {
    const inv = db.invoices.find((i) => i.id === invoiceId);
    if (!inv) return { ok: false, error: 'Invoice not found.' };
    if (inv.status === 'paid') return { ok: false, error: 'Invoice is already paid.' };

    const nowIso = simulatedNow.toISOString();
    let nextStage: CommissionInvoice['unpaidStage'] = 'reminder_sent';
    let stepTitle = 'Reminder Sent';
    let stepNote = 'Polite commission payment reminder sent to Professional Trader.';
    let notifTitle = 'Commission payment reminder';
    let eventKey = 'payment_due';
    let suspendUser = false;

    if (inv.unpaidStage === 'reminder_sent') {
      nextStage = 'warning_sent';
      stepTitle = 'Formal Warning Sent';
      stepNote = 'Invoice is overdue. Final warning sent before account pause.';
      notifTitle = 'Overdue warning: Commission unpaid';
      eventKey = 'payment_overdue';
    } else if (inv.unpaidStage === 'warning_sent') {
      nextStage = 'suspended';
      stepTitle = 'Account Suspended';
      stepNote = 'Account suspended due to repeated unpaid commission.';
      notifTitle = 'Account suspended for unpaid commission';
      eventKey = 'payment_overdue';
      suspendUser = true;
    } else if (inv.unpaidStage === 'suspended') {
      return { ok: false, error: 'Account is already at the final suspension step.' };
    }

    setDb((prev) => ({
      ...prev,
      invoices: prev.invoices.map((i) =>
        i.id === invoiceId
          ? {
              ...i,
              status: nextStage === 'reminder_sent' ? i.status : ('overdue' as const),
              unpaidStage: nextStage,
              history: [...i.history, { step: stepTitle, note: stepNote, at: nowIso }],
            }
          : i
      ),
      users: suspendUser
        ? prev.users.map((u) =>
            u.id === inv.proTraderId
              ? {
                  ...u,
                  isSuspended: true,
                  suspendReason: `Unpaid commission invoice ${inv.id} ($${inv.amountUsd.toFixed(2)}). Pay invoice to restore access.`,
                }
              : u
          )
        : prev.users,
      notifications: [
        {
          id: `notif-unpaid-${Date.now()}`,
          userId: inv.proTraderId,
          title: notifTitle,
          body: `${stepNote} (Invoice ${inv.id} · $${inv.amountUsd.toFixed(2)})`,
          eventKey,
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
      auditLog: [
        {
          id: `audit-unpaid-${Date.now()}`,
          actorName: currentUser?.fullName ?? 'Finance Team',
          actorRole: 'Finance Flow',
          action: `Unpaid invoice step: ${stepTitle}`,
          target: inv.id,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));

    pushToast(`${stepTitle} recorded for invoice ${inv.id}.`, 'warning');
    return { ok: true };
  };

  // ================= PHASE 9 ADMIN ACTIONS =================

  const adminChangeUserRole = (
    userId: string,
    role: Exclude<UserRole, 'visitor'>,
    adminLevel?: AdminLevel
  ): { ok: boolean; error?: string } => {
    const target = db.users.find((u) => u.id === userId);
    if (!target) return { ok: false, error: 'User not found.' };
    const nowIso = simulatedNow.toISOString();
    const actorName = currentUser?.fullName ?? 'Super Admin';
    const nextAdminLevel = role === 'admin' ? adminLevel ?? 'support' : undefined;

    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === userId ? { ...u, role, adminLevel: nextAdminLevel } : u
      ),
      auditLog: [
        {
          id: `audit-role-${Date.now()}`,
          actorName,
          actorRole: `Admin (${currentAdminLevel ?? 'super_admin'})`,
          action: `Changed role of ${target.fullName} to ${role}${
            nextAdminLevel ? ` (${nextAdminLevel})` : ''
          }`,
          target: target.id,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));

    pushToast(`Updated role for ${target.fullName}.`, 'success');
    return { ok: true };
  };

  const adminSetUserSuspension = (
    userId: string,
    suspend: boolean,
    reason?: string
  ): { ok: boolean; error?: string } => {
    const target = db.users.find((u) => u.id === userId);
    if (!target) return { ok: false, error: 'User not found.' };
    if (suspend && (!reason || reason.trim().length < 4)) {
      return { ok: false, error: 'Please write a short reason before suspending a user.' };
    }
    const nowIso = simulatedNow.toISOString();
    const actorName = currentUser?.fullName ?? 'Admin';
    const cleanReason = reason?.trim() || 'Restored after admin review.';

    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              isSuspended: suspend,
              suspendReason: suspend ? cleanReason : undefined,
            }
          : u
      ),
      notifications: [
        {
          id: `notif-susp-${Date.now()}`,
          userId,
          title: suspend ? 'Account suspended by Admin' : 'Account access restored',
          body: suspend ? `Reason: ${cleanReason}` : 'Your account is active again.',
          eventKey: 'important_update',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
      auditLog: [
        {
          id: `audit-susp-${Date.now()}`,
          actorName,
          actorRole: `Admin (${currentAdminLevel ?? 'super_admin'})`,
          action: suspend
            ? `Suspended user ${target.fullName} (${cleanReason})`
            : `Unsuspended user ${target.fullName}`,
          target: target.id,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));

    pushToast(
      suspend ? `${target.fullName} suspended.` : `${target.fullName} access restored.`,
      suspend ? 'warning' : 'success'
    );
    return { ok: true };
  };

  const adminVerifyTrader = (
    userId: string,
    decision: 'approved' | 'rejected',
    note: string
  ): { ok: boolean; error?: string } => {
    const profile = db.traderProfiles.find((p) => p.userId === userId);
    if (!profile) return { ok: false, error: 'Trader profile not found.' };
    if (decision === 'rejected' && note.trim().length < 5) {
      return { ok: false, error: 'Please provide a clear rejection reason.' };
    }
    const nowIso = simulatedNow.toISOString();
    const actorName = currentUser?.fullName ?? 'Verifier';
    const cleanNote =
      note.trim() ||
      (decision === 'approved'
        ? 'Verified KYC, real Exness MT5 history, and risk checks.'
        : 'Did not pass verification check.');

    setDb((prev) => ({
      ...prev,
      traderProfiles: prev.traderProfiles.map((p) =>
        p.userId === userId
          ? {
              ...p,
              isApproved: decision === 'approved',
              isPublic: decision === 'approved',
              proAccountLink: {
                accountNumberMasked: p.proAccountLink?.accountNumberMasked ?? 'MT5-••••4410',
                accessMethod:
                  p.proAccountLink?.accessMethod ??
                  'Read-only (investor) access for checking results only',
                isRealAccount: p.proAccountLink?.isRealAccount ?? true,
                reviewStatus: decision,
                reviewNote: cleanNote,
              },
            }
          : p
      ),
      notifications: [
        {
          id: `notif-ver-${Date.now()}`,
          userId,
          title: decision === 'approved' ? 'Trader profile approved' : 'Verification failed',
          body:
            decision === 'approved'
              ? `Your Professional Trader profile is now public. Note: ${cleanNote}`
              : `Your trader verification was rejected: ${cleanNote}`,
          eventKey: decision === 'approved' ? 'profile_approved' : 'verification_failed',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
      auditLog: [
        {
          id: `audit-ver-${Date.now()}`,
          actorName,
          actorRole: `Admin (${currentAdminLevel ?? 'verifier'})`,
          action: `${
            decision === 'approved' ? 'Approved' : 'Rejected'
          } trader verification (${cleanNote})`,
          target: profile.displayName,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));

    pushToast(
      decision === 'approved'
        ? `${profile.displayName} approved and published.`
        : `${profile.displayName} rejected.`,
      decision === 'approved' ? 'success' : 'warning'
    );
    return { ok: true };
  };

  const adminForceConnectionStatus = (
    connectionId: string,
    action: 'pause' | 'resume' | 'complete',
    reason: string
  ): { ok: boolean; error?: string } => {
    const conn = db.connections.find((c) => c.id === connectionId);
    if (!conn) return { ok: false, error: 'Connection not found.' };
    if (!reason.trim()) return { ok: false, error: 'Please enter a short admin reason.' };
    const nowIso = simulatedNow.toISOString();
    const actorName = currentUser?.fullName ?? 'Admin';
    const nextStatus = action === 'pause' ? 'paused' : action === 'resume' ? 'active' : 'completed';
    const wasActive = conn.status === 'active';

    setDb((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.id === connectionId
          ? {
              ...c,
              status: nextStatus,
              history: [
                ...c.history,
                {
                  status: nextStatus,
                  changedAt: nowIso,
                  changedByName: `${actorName} (Admin)`,
                  reason: reason.trim(),
                },
              ],
            }
          : c
      ),
      agreements: prev.agreements.map((a) =>
        a.connectionId === connectionId
          ? {
              ...a,
              accessActive: nextStatus === 'active',
              accessRemovedAt: nextStatus === 'completed' ? nowIso : a.accessRemovedAt,
            }
          : a
      ),
      traderProfiles:
        wasActive && nextStatus === 'completed'
          ? prev.traderProfiles.map((p) =>
              p.userId === conn.proTraderId
                ? { ...p, activeConnectionsCount: Math.max(0, p.activeConnectionsCount - 1) }
                : p
            )
          : prev.traderProfiles,
      notifications: [
        {
          id: `notif-adm-c1-${Date.now()}`,
          userId: conn.newTraderId,
          title: `Connection ${nextStatus} by Admin`,
          body: `${connectionId} moved to ${nextStatus}: ${reason.trim()}`,
          eventKey: 'important_update',
          createdAt: nowIso,
          isRead: false,
        },
        {
          id: `notif-adm-c2-${Date.now()}`,
          userId: conn.proTraderId,
          title: `Connection ${nextStatus} by Admin`,
          body: `${connectionId} moved to ${nextStatus}: ${reason.trim()}`,
          eventKey: 'important_update',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
      auditLog: [
        {
          id: `audit-adm-conn-${Date.now()}`,
          actorName,
          actorRole: `Admin (${currentAdminLevel ?? 'support'})`,
          action: `Forced connection ${nextStatus} (${reason.trim()})`,
          target: connectionId,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));

    pushToast(`Connection ${connectionId} updated to ${nextStatus}.`, 'info');
    return { ok: true };
  };

  const adminUpdateDispute = (
    disputeId: string,
    status: DisputeCase['status'],
    resolutionNote: string
  ): { ok: boolean; error?: string } => {
    const existing = db.disputes.find((d) => d.id === disputeId);
    if (!existing) return { ok: false, error: 'Dispute not found.' };
    if (status === 'resolved' && resolutionNote.trim().length < 5) {
      return { ok: false, error: 'Please write a short decision note before resolving.' };
    }
    const nowIso = simulatedNow.toISOString();
    const actorName = currentUser?.fullName ?? 'Support Admin';

    setDb((prev) => ({
      ...prev,
      disputes: prev.disputes.map((d) =>
        d.id === disputeId
          ? {
              ...d,
              status,
              resolutionNote: resolutionNote.trim() || d.resolutionNote,
            }
          : d
      ),
      notifications: [
        {
          id: `notif-disp-u1-${Date.now()}`,
          userId: existing.openedByUserId,
          title: `Dispute ${existing.id} updated (${status.replace('_', ' ')})`,
          body: resolutionNote.trim() || 'Support updated your dispute case.',
          eventKey: 'important_update',
          createdAt: nowIso,
          isRead: false,
        },
        ...prev.notifications,
      ],
      auditLog: [
        {
          id: `audit-disp-adm-${Date.now()}`,
          actorName,
          actorRole: `Admin (${currentAdminLevel ?? 'support'})`,
          action: `Updated dispute ${disputeId} to ${status}`,
          target: existing.connectionId,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));

    pushToast(`Dispute ${disputeId} marked ${status.replace('_', ' ')}.`, 'success');
    return { ok: true };
  };

  const adminMarkReportChecked = (reportId: string) => {
    const rep = db.reports.find((r) => r.id === reportId);
    if (!rep) return;
    const nowIso = simulatedNow.toISOString();
    setDb((prev) => ({
      ...prev,
      reports: prev.reports.map((r) => (r.id === reportId ? { ...r, status: 'checked' } : r)),
      auditLog: [
        {
          id: `audit-rep-chk-${Date.now()}`,
          actorName: currentUser?.fullName ?? 'Support Admin',
          actorRole: `Admin (${currentAdminLevel ?? 'support'})`,
          action: `Marked user report checked (${rep.targetName})`,
          target: reportId,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));
    pushToast('Report marked as checked.', 'success');
  };

  const adminMarkFraudChecked = (signalId: string) => {
    const sig = db.fraudSignals.find((f) => f.id === signalId);
    if (!sig) return;
    const actorName = currentUser?.fullName ?? 'Admin';
    const nowIso = simulatedNow.toISOString();
    setDb((prev) => ({
      ...prev,
      fraudSignals: prev.fraudSignals.map((f) =>
        f.id === signalId ? { ...f, status: 'checked', checkedBy: actorName } : f
      ),
      auditLog: [
        {
          id: `audit-fraud-${Date.now()}`,
          actorName,
          actorRole: `Admin (${currentAdminLevel ?? 'super_admin'})`,
          action: `Marked fraud signal checked (${sig.signalType})`,
          target: sig.userName,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));
    pushToast('Fraud signal marked checked.', 'success');
  };

  const adminUpdateLaunchItem = (
    itemId: string,
    status: LaunchItemStatus,
    notes: string
  ) => {
    const item = db.launchChecklist.find((l) => l.id === itemId);
    if (!item) return;
    const nowIso = simulatedNow.toISOString();
    setDb((prev) => ({
      ...prev,
      launchChecklist: prev.launchChecklist.map((l) =>
        l.id === itemId ? { ...l, status, notes } : l
      ),
      auditLog: [
        {
          id: `audit-lc-${Date.now()}`,
          actorName: currentUser?.fullName ?? 'Super Admin',
          actorRole: `Admin (${currentAdminLevel ?? 'super_admin'})`,
          action: `Updated launch checklist item to ${status.replace('_', ' ')}`,
          target: item.id,
          createdAt: nowIso,
        },
        ...prev.auditLog,
      ],
    }));
    pushToast('Launch checklist item saved.', 'success');
  };

  const adminProposeOrApplySetting = (input: {
    settingKey: keyof PlatformSettings;
    settingLabel: string;
    newValue: PlatformSettings[keyof PlatformSettings];
    displayOldValue: string;
    displayNewValue: string;
    reason: string;
    requiresSecondApproval: boolean;
  }): { ok: boolean; error?: string; pending?: boolean } => {
    if (input.reason.trim().length < 4) {
      return { ok: false, error: 'Please write a short reason for this setting change.' };
    }
    const nowIso = simulatedNow.toISOString();
    const actorName = currentUser?.fullName ?? 'Tariq Hasan';
    const actorId = currentUser?.id ?? 'admin-1';

    const changeEntry: SettingChange = {
      id: `sc-${Date.now()}`,
      settingKey: input.settingKey,
      settingLabel: input.settingLabel,
      oldValue: input.displayOldValue,
      newValue: input.displayNewValue,
      newRawValue: input.newValue,
      changedByUserId: actorId,
      changedByName: actorName,
      changedAt: nowIso,
      reason: input.reason.trim(),
      status: input.requiresSecondApproval ? 'pending_approval' : 'applied',
      approvedByUserId: input.requiresSecondApproval ? undefined : actorId,
      approvedByName: input.requiresSecondApproval ? undefined : 'Direct Save',
    };

    setDb((prev) => {
      const nextSettings: PlatformSettings = input.requiresSecondApproval
        ? prev.settings
        : {
            ...prev.settings,
            [input.settingKey]: input.newValue,
          };

      const nextProfiles =
        !input.requiresSecondApproval && input.settingKey === 'shohojScoreWeights'
          ? prev.traderProfiles.map((tp) => ({
              ...tp,
              shohojScore: computeShohojScore(tp, nextSettings.shohojScoreWeights),
            }))
          : prev.traderProfiles;

      return {
        ...prev,
        settings: nextSettings,
        traderProfiles: nextProfiles,
        settingChanges: [changeEntry, ...prev.settingChanges],
        auditLog: [
          {
            id: `audit-set-${Date.now()}`,
            actorName,
            actorRole: `Admin (${currentAdminLevel ?? 'super_admin'})`,
            action: input.requiresSecondApproval
              ? `Proposed setting change (Pending 2nd Approval): ${input.settingLabel} -> ${input.displayNewValue}`
              : `Updated setting: ${input.settingLabel} -> ${input.displayNewValue}`,
            target: String(input.settingKey),
            createdAt: nowIso,
          },
          ...prev.auditLog,
        ],
      };
    });

    pushToast(
      input.requiresSecondApproval
        ? `${input.settingLabel} queued as Pending Approval (needs 2nd Admin review).`
        : `${input.settingLabel} saved. Active agreement snapshots remain unchanged.`,
      input.requiresSecondApproval ? 'info' : 'success'
    );
    return { ok: true, pending: input.requiresSecondApproval };
  };

  const adminDecideSettingChange = (
    changeId: string,
    decision: 'approved' | 'rejected',
    secondAdminOverrideName?: string
  ): { ok: boolean; error?: string } => {
    const change = db.settingChanges.find((c) => c.id === changeId);
    if (!change) return { ok: false, error: 'Setting change not found.' };
    if (change.status !== 'pending_approval') {
      return { ok: false, error: 'This setting change was already decided.' };
    }

    const nowIso = simulatedNow.toISOString();
    const reviewerName =
      secondAdminOverrideName ??
      (currentUser && currentUser.id !== change.changedByUserId
        ? currentUser.fullName
        : 'Nadia Karim (2nd Approver Demo)');
    const reviewerId =
      currentUser && currentUser.id !== change.changedByUserId ? currentUser.id : 'admin-2';

    setDb((prev) => {
      const nextSettings: PlatformSettings =
        decision === 'approved' && change.newRawValue !== undefined
          ? {
              ...prev.settings,
              [change.settingKey]: change.newRawValue as PlatformSettings[keyof PlatformSettings],
            }
          : prev.settings;

      const nextProfiles =
        decision === 'approved' && change.settingKey === 'shohojScoreWeights'
          ? prev.traderProfiles.map((tp) => ({
              ...tp,
              shohojScore: computeShohojScore(tp, nextSettings.shohojScoreWeights),
            }))
          : prev.traderProfiles;

      return {
        ...prev,
        settings: nextSettings,
        traderProfiles: nextProfiles,
        settingChanges: prev.settingChanges.map((c) =>
          c.id === changeId
            ? {
                ...c,
                status: decision === 'approved' ? 'applied' : 'rejected',
                approvedByUserId: reviewerId,
                approvedByName: reviewerName,
              }
            : c
        ),
        auditLog: [
          {
            id: `audit-sc-dec-${Date.now()}`,
            actorName: reviewerName,
            actorRole: '2nd Admin Approver',
            action: `${decision === 'approved' ? 'Approved' : 'Rejected'} setting change: ${
              change.settingLabel
            } (${change.oldValue} -> ${change.newValue})`,
            target: String(change.settingKey),
            createdAt: nowIso,
          },
          ...prev.auditLog,
        ],
      };
    });

    pushToast(
      decision === 'approved'
        ? `Approved & applied: ${change.settingLabel}. Old agreement snapshots unchanged.`
        : `Rejected pending change for ${change.settingLabel}.`,
      decision === 'approved' ? 'success' : 'warning'
    );
    return { ok: true };
  };

  const adminSaveNotificationRules = (
    rules: PlatformSettings['notificationRules'],
    reason: string
  ): { ok: boolean; error?: string } => {
    const safeRules = rules.map((r) =>
      r.lockedSecurity ? { ...r, inApp: true, email: true, sms: true, push: true } : r
    );
    return adminProposeOrApplySetting({
      settingKey: 'notificationRules',
      settingLabel: 'Notification rules',
      newValue: safeRules,
      displayOldValue: `${db.settings.notificationRules.length} rules`,
      displayNewValue: `${safeRules.length} rules updated`,
      reason: reason.trim() || 'Updated platform notification channels.',
      requiresSecondApproval: false,
    });
  };

  const saveUserNotificationPrefs = (
    userId: string,
    channelsByEvent: Record<string, ChannelPreference>
  ): { ok: boolean; error?: string } => {
    const safeChannels: Record<string, ChannelPreference> = {
      ...channelsByEvent,
      security_alert: { inApp: true, email: true, sms: true, push: true },
    };

    setDb((prev) => ({
      ...prev,
      userNotificationPrefs: {
        ...prev.userNotificationPrefs,
        [userId]: {
          userId,
          channelsByEvent: safeChannels,
        },
      },
    }));

    pushToast('Notification settings saved. Security alerts stay ON for your safety.', 'success');
    return { ok: true };
  };

  const submitContactTicket = (input: {
    userId?: string;
    name: string;
    email: string;
    topic: string;
    message: string;
  }): { ok: boolean; error?: string; ticketId?: string } => {
    if (input.name.trim().length < 2) {
      return { ok: false, error: 'Please enter your name.' };
    }
    if (!input.email.includes('@')) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    if (input.message.trim().length < 10) {
      return { ok: false, error: 'Please write a short message (at least 10 characters).' };
    }

    const nowIso = simulatedNow.toISOString();
    const ticket: ContactTicket = {
      id: `tkt-${String(Date.now()).slice(-5)}`,
      userId: input.userId,
      name: input.name.trim(),
      email: input.email.trim(),
      topic: input.topic.trim() || 'General Question',
      message: input.message.trim(),
      status: 'sent',
      createdAt: nowIso,
    };

    setDb((prev) => ({
      ...prev,
      contactTickets: [ticket, ...prev.contactTickets],
      notifications: input.userId
        ? [
            {
              id: `notif-tkt-${Date.now()}`,
              userId: input.userId,
              title: `Support ticket ${ticket.id} received`,
              body: `Topic: ${ticket.topic}. Our Support team will reply inside Shohoj Trading (simulated).`,
              eventKey: 'important_update',
              createdAt: nowIso,
              isRead: false,
            },
            ...prev.notifications,
          ]
        : prev.notifications,
    }));

    pushToast(`Message sent (${ticket.id}). Support preview saved.`, 'success');
    return { ok: true, ticketId: ticket.id };
  };

  const value: AppContextValue = {
    db,
    settings: db.settings,
    currentUser,
    currentRole,
    currentAdminLevel,
    theme,
    simulatedNow,
    toasts,
    publicApprovedTraders,
    sessionExpiredNotice,
    switchRole,
    switchUser,
    advanceTimeDays,
    resetDemoData,
    pushToast,
    dismissToast,
    loginWithCredentials,
    verifyTwoFactorLogin,
    unlockDemoAccount,
    signupUser,
    completePasswordReset,
    logout,
    simulateSessionTimeout,
    dismissSessionExpiredNotice,
    submitKyc,
    simulateKycDecision,
    updateNewTraderProfile,
    saveBrokerLink,
    changePassword,
    toggleTwoFactor,
    revokeDeviceSession,
    submitProOnboarding,
    updateProTraderProfile,
    simulateProReviewDecision,
    toggleFavoriteTrader,
    saveTraderFilter,
    deleteSavedTraderFilter,
    unreadNotificationsCount,
    sendConnectionRequest,
    cancelConnectionRequest,
    respondToConnectionRequest,
    markNotificationRead,
    markAllNotificationsRead,
    sendChatMessage,
    markChatMessagesSeen,
    reportChatMessage,
    signAgreement,
    completeAccessStep,
    removeBrokerAccess,
    proposeAgreementChange,
    respondToAgreementChange,
    pauseConnection,
    resumeConnection,
    completeConnection,
    stopConnection,
    simulateRuleBreak,
    openDispute,
    requestDisputeReview,
    reportTraderOrUser,
    saveUserNotificationPrefs,
    submitContactTicket,
    runSettlementSimulation,
    payCommissionInvoice,
    advanceUnpaidInvoiceStep,
    adminChangeUserRole,
    adminSetUserSuspension,
    adminVerifyTrader,
    adminForceConnectionStatus,
    adminUpdateDispute,
    adminMarkReportChecked,
    adminMarkFraudChecked,
    adminUpdateLaunchItem,
    adminProposeOrApplySetting,
    adminDecideSettingChange,
    adminSaveNotificationRules,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
