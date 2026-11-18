import {
  AgreementChangeRequest,
  AgreementRecord,
  AppNotification,
  AuditLogEntry,
  BrokerAccountLink,
  ChatMessage,
  CommissionInvoice,
  Connection,
  ContactTicket,
  DeviceSession,
  DisputeCase,
  FraudSignal,
  KycRecord,
  LaunchChecklistItem,
  LoginHistoryEntry,
  PlatformSettings,
  SavedTraderFilter,
  SettingChange,
  SettlementRecord,
  TraderProfile,
  TraderReport,
  User,
  UserNotificationPreferences,
} from '../types';
import {
  DUMMY_AVATAR_URLS,
  INITIAL_SETTINGS,
  INITIAL_SETTING_CHANGES,
  SEED_AGREEMENTS,
  SEED_AGREEMENT_CHANGES,
  SEED_AUDIT_LOG,
  SEED_BROKER_LINKS,
  SEED_CHAT_MESSAGES,
  SEED_CONNECTIONS,
  SEED_DEMO_PASSWORDS,
  SEED_DEVICE_SESSIONS,
  SEED_DISPUTES,
  SEED_FRAUD_SIGNALS,
  SEED_INVOICES,
  SEED_KYC_RECORDS,
  SEED_LAUNCH_CHECKLIST,
  SEED_LOGIN_HISTORY,
  SEED_NOTIFICATIONS,
  SEED_REPORTS,
  SEED_SETTLEMENTS,
  SEED_TRADER_PROFILES,
  SEED_USERS,
} from './seedData';
import { clearAllAppStorage, readStorage, writeStorage } from './storage';

export interface AppDatabaseState {
  settings: PlatformSettings;
  settingChanges: SettingChange[];
  users: User[];
  traderProfiles: TraderProfile[];
  brokerLinks: BrokerAccountLink[];
  connections: Connection[];
  notifications: AppNotification[];
  auditLog: AuditLogEntry[];
  kycRecords: KycRecord[];
  loginHistory: LoginHistoryEntry[];
  deviceSessions: DeviceSession[];
  passwordsByEmail: Record<string, string>;
  failedAttemptsByEmail: Record<string, number>;
  lockedEmails: Record<string, boolean>;
  favoriteTraderIds: string[];
  savedTraderFilters: SavedTraderFilter[];
  chatMessages: ChatMessage[];
  agreements: AgreementRecord[];
  agreementChangeRequests: AgreementChangeRequest[];
  disputes: DisputeCase[];
  reports: TraderReport[];
  settlements: SettlementRecord[];
  invoices: CommissionInvoice[];
  fraudSignals: FraudSignal[];
  launchChecklist: LaunchChecklistItem[];
  userNotificationPrefs: Record<string, UserNotificationPreferences>;
  contactTickets: ContactTicket[];
  simulatedOffsetDays: number;
  currentUserId: string | null;
}

const DB_KEY = 'database';

export function getInitialDatabaseState(): AppDatabaseState {
  return {
    settings: INITIAL_SETTINGS,
    settingChanges: INITIAL_SETTING_CHANGES,
    users: SEED_USERS,
    traderProfiles: SEED_TRADER_PROFILES,
    brokerLinks: SEED_BROKER_LINKS,
    connections: SEED_CONNECTIONS,
    notifications: SEED_NOTIFICATIONS,
    auditLog: SEED_AUDIT_LOG,
    kycRecords: SEED_KYC_RECORDS,
    loginHistory: SEED_LOGIN_HISTORY,
    deviceSessions: SEED_DEVICE_SESSIONS,
    passwordsByEmail: SEED_DEMO_PASSWORDS,
    failedAttemptsByEmail: {},
    lockedEmails: {},
    favoriteTraderIds: ['tp-1', 'tp-6'],
    savedTraderFilters: [
      {
        id: 'sf-1',
        name: 'Low Risk · Under 12% Drawdown',
        queryString: 'risk=low&maxDd=12&sort=score',
        createdAt: '2026-11-10T10:00:00Z',
      },
    ],
    chatMessages: SEED_CHAT_MESSAGES,
    agreements: SEED_AGREEMENTS,
    agreementChangeRequests: SEED_AGREEMENT_CHANGES,
    disputes: SEED_DISPUTES,
    reports: SEED_REPORTS,
    settlements: SEED_SETTLEMENTS,
    invoices: SEED_INVOICES,
    fraudSignals: SEED_FRAUD_SIGNALS,
    launchChecklist: SEED_LAUNCH_CHECKLIST,
    userNotificationPrefs: {},
    contactTickets: [],
    simulatedOffsetDays: 0,
    currentUserId: null,
  };
}

function resolveAvatarUrl(savedUrl: string | undefined, seedUrl: string | undefined, idx: number): string | undefined {
  if (savedUrl === '') return undefined;
  if (!savedUrl || savedUrl.startsWith('/src/assets/images/')) {
    return seedUrl ?? DUMMY_AVATAR_URLS[idx % DUMMY_AVATAR_URLS.length];
  }
  return savedUrl;
}

export const dataLayer = {
  loadDatabase(): AppDatabaseState {
    const fallback = getInitialDatabaseState();
    const saved = readStorage<Partial<AppDatabaseState>>(DB_KEY, fallback);

    const seedUsersById = new Map(fallback.users.map((u) => [u.id, u]));
    const hydratedUsers = (saved.users && saved.users.length > 0 ? saved.users : fallback.users).map(
      (u, idx) => {
        const seed = seedUsersById.get(u.id);
        return {
          ...u,
          avatarUrl: resolveAvatarUrl(u.avatarUrl, seed?.avatarUrl, idx),
        };
      }
    );

    const seedProfilesById = new Map(fallback.traderProfiles.map((p) => [p.id, p]));
    const hydratedProfiles = (
      saved.traderProfiles && saved.traderProfiles.length > 0
        ? saved.traderProfiles
        : fallback.traderProfiles
    ).map((tp, idx) => {
      const seed = seedProfilesById.get(tp.id);
      return {
        ...tp,
        avatarUrl: resolveAvatarUrl(tp.avatarUrl, seed?.avatarUrl, idx),
        proAccountLink: tp.proAccountLink ?? seed?.proAccountLink,
      };
    });

    const savedRules = saved.settings?.notificationRules ?? [];
    const savedRulesMap = new Map(savedRules.map((r) => [r.eventKey, r]));
    const mergedNotificationRules = fallback.settings.notificationRules.map(
      (rule) => savedRulesMap.get(rule.eventKey) ?? rule
    );

    return {
      ...fallback,
      ...saved,
      users: hydratedUsers,
      traderProfiles: hydratedProfiles,
      fraudSignals:
        saved.fraudSignals && saved.fraudSignals.length > 0
          ? saved.fraudSignals
          : fallback.fraudSignals,
      launchChecklist:
        saved.launchChecklist && saved.launchChecklist.length > 0
          ? saved.launchChecklist
          : fallback.launchChecklist,
      disputes: saved.disputes ?? fallback.disputes,
      reports: saved.reports ?? fallback.reports,
      userNotificationPrefs: saved.userNotificationPrefs ?? {},
      contactTickets: saved.contactTickets ?? [],
      settings: {
        ...fallback.settings,
        ...(saved.settings ?? {}),
        notificationRules: mergedNotificationRules,
      },
      passwordsByEmail: {
        ...fallback.passwordsByEmail,
        ...(saved.passwordsByEmail ?? {}),
      },
    };
  },

  saveDatabase(state: AppDatabaseState): void {
    writeStorage<AppDatabaseState>(DB_KEY, state);
  },

  resetDatabase(): AppDatabaseState {
    clearAllAppStorage();
    const fresh = getInitialDatabaseState();
    writeStorage<AppDatabaseState>(DB_KEY, fresh);
    return fresh;
  },
};
