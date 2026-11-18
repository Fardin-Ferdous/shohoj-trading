export type UserRole = 'visitor' | 'new_trader' | 'pro_trader' | 'admin';

export type AdminLevel = 'super_admin' | 'verifier' | 'support' | 'finance';

export type KycStatus = 'not_started' | 'in_review' | 'approved' | 'rejected';

export type ConnectionStatus =
  | 'pending'
  | 'accepted'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'expired';

export type SettlementPeriod = 'weekly' | 'monthly' | 'quarterly';

export type OpenTradeRule = 'close_immediately' | 'close_within_hours' | 'let_finish';

export type RiskTag = 'Low Risk' | 'Balanced' | 'Martingale' | 'Grid' | 'No stop loss';

export interface ChannelPreference {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface NotificationRuleConfig extends ChannelPreference {
  eventKey: string;
  label: string;
  lockedSecurity?: boolean;
}

export interface UserNotificationPreferences {
  userId: string;
  channelsByEvent: Record<string, ChannelPreference>;
}

export interface ContactTicket {
  id: string;
  userId?: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: 'sent';
  createdAt: string;
}

export interface ShohojScoreWeights {
  profitWeight: number;
  riskWeight: number;
  drawdownWeight: number;
}

export interface PlatformSettings {
  platformCommissionPercent: number;
  defaultNewTraderSharePercent: number;
  defaultProTraderSharePercent: number;
  minProSharePercent: number;
  maxProSharePercent: number;
  minHistoryMonths: number;
  minTradeCount: number;
  settlementPeriod: SettlementPeriod;
  maxDrawdownPercent: number;
  maxRiskPerTradePercent: number;
  maxLotSize: number;
  minDepositUsd: number;
  cancellationNoticeDays: number;
  commissionProtectionMonths: number;
  requestExpiryDays: number;
  openTradeRule: OpenTradeRule;
  openTradeCloseHours: number;
  minAgeYears: number;
  maxFailedLoginAttempts: number;
  sessionTimeoutMinutes: number;
  supportedCurrencies: string[];
  supportedCountries: string[];
  blockedCountries: string[];
  supportedLanguages: string[];
  shohojScoreWeights: ShohojScoreWeights;
  notificationRules: NotificationRuleConfig[];
  termsText: string;
  riskWarningText: string;
  privacyText: string;
  legalNoticeText: string;
  advertisingRulesText: string;
}

export interface SettingChange {
  id: string;
  settingKey: keyof PlatformSettings;
  settingLabel: string;
  oldValue: string;
  newValue: string;
  newRawValue?: unknown;
  changedByUserId: string;
  changedByName: string;
  changedAt: string;
  reason: string;
  status: 'applied' | 'pending_approval' | 'rejected';
  approvedByUserId?: string;
  approvedByName?: string;
}

export interface NewTraderPreferences {
  experienceLevel: 'Complete beginner' | 'Under 1 year' | '1 to 3 years';
  tradingGoal: string;
  riskComfort: 'Low' | 'Medium' | 'Higher';
}

export interface KycRecord {
  userId: string;
  status: KycStatus;
  idDocumentName?: string;
  idDocumentType?: 'National ID' | 'Passport' | 'Driving License';
  selfieFileName?: string;
  addressLine?: string;
  city?: string;
  country?: string;
  addressProofName?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  deviceName: string;
  location: string;
  loggedInAt: string;
  isNewDevice: boolean;
  status: 'Success' | 'Failed attempt' | 'Locked';
}

export interface DeviceSession {
  id: string;
  userId: string;
  deviceName: string;
  browser: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  ageYears?: number;
  role: Exclude<UserRole, 'visitor'>;
  adminLevel?: AdminLevel;
  kycStatus: KycStatus;
  kycNote?: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  isSuspended?: boolean;
  suspendReason?: string;
  avatarInitials: string;
  avatarUrl?: string;
  newTraderPrefs?: NewTraderPreferences;
}

export interface BrokerAccountLink {
  id: string;
  userId: string;
  brokerName: 'Exness';
  platform: 'MT5';
  accountType: 'Standard' | 'Pro' | 'Raw Spread';
  accountNumberMasked: string;
  isRealAccount: boolean;
  balanceUsd: number;
  accessMethod:
    | 'Exness copy-trading / social trading link'
    | 'Broker-approved account management option'
    | 'Read-only (investor) access for checking results only';
  connectedAt: string;
}

export interface MonthlyReturnPoint {
  month: string;
  returnPercent: number;
}

export interface EquityPoint {
  label: string;
  ownEquity: number;
  managedEquity: number;
}

export interface PerformanceStats {
  winRatePercent: number;
  totalProfitUsd: number;
  totalLossUsd: number;
  tradeCount: number;
  avgWinUsd: number;
  avgLossUsd: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  accountGrowthPercent: number;
  avgHoldingHours: number;
  historyMonths: number;
  leverageUsed: string;
  dataSource: string;
}

export interface TraderProfile {
  id: string;
  userId: string;
  displayName: string;
  country: string;
  bio: string;
  avatarColor?: string;
  avatarPhotoName?: string;
  avatarUrl?: string;
  tradingStyle: string;
  instruments: string[];
  riskTags: RiskTag[];
  askedProfitSharePercent: number;
  isOpenForRequests: boolean;
  maxConnections: number;
  activeConnectionsCount: number;
  isApproved: boolean;
  isPublic: boolean;
  shohojScore: number;
  proAccountLink?: {
    accountNumberMasked: string;
    accessMethod: BrokerAccountLink['accessMethod'];
    isRealAccount: boolean;
    reviewStatus: 'not_submitted' | 'waiting_review' | 'approved' | 'rejected';
    reviewNote?: string;
  };
  ownAccountStats: PerformanceStats;
  managedAccountStats: PerformanceStats;
  monthlyReturns: MonthlyReturnPoint[];
  equityCurve: EquityPoint[];
}

export interface AgreementSnapshot {
  newTraderSharePercent: number;
  proTraderSharePercent: number;
  platformCommissionPercent: number;
  settlementPeriod: SettlementPeriod;
  maxDrawdownPercent: number;
  maxRiskPerTradePercent: number;
  maxLotSize: number;
  cancellationNoticeDays: number;
  commissionProtectionMonths: number;
  openTradeRule: OpenTradeRule;
}

export interface StatusHistoryEntry {
  status: ConnectionStatus;
  changedAt: string;
  changedByName: string;
  reason: string;
}

export interface Connection {
  id: string;
  newTraderId: string;
  proTraderId: string;
  status: ConnectionStatus;
  plannedAmountUsd: number;
  currentBalanceUsd: number;
  realizedProfitUsd: number;
  highWaterMarkUsd: number;
  currentDrawdownPercent?: number;
  lastRiskPerTradePercent?: number;
  lastLotSize?: number;
  periodProgressPercent?: number;
  nextSettlementAt?: string;
  feesPaidUsd?: number;
  riskWarningMessage?: string;
  requestMessage?: string;
  riskComfort?: 'Low' | 'Medium' | 'Higher';
  rejectionReason?: string;
  createdAt: string;
  expiresAt: string;
  snapshot: AgreementSnapshot;
  history: StatusHistoryEntry[];
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  eventKey: string;
  createdAt: string;
  isRead: boolean;
}

export interface AuditLogEntry {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  target: string;
  createdAt: string;
}

export interface SavedTraderFilter {
  id: string;
  name: string;
  queryString: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  connectionId: string;
  senderId: string;
  senderName: string;
  body: string;
  attachmentName?: string;
  createdAt: string;
  seenByRecipient: boolean;
  isReported?: boolean;
  reportReason?: string;
}

export interface AgreementSignature {
  signedByUserId: string;
  typedName: string;
  acceptedTerms: boolean;
  signedAt: string;
}

export interface AgreementRecord {
  id: string;
  connectionId: string;
  snapshot: AgreementSnapshot;
  openTradeCloseHours: number;
  newTraderSignature?: AgreementSignature;
  proTraderSignature?: AgreementSignature;
  accessMethodChosen?: BrokerAccountLink['accessMethod'];
  accessChecklistDone: boolean;
  accessActive: boolean;
  accessRemovedAt?: string;
  createdAt: string;
  activatedAt?: string;
}

export interface AgreementChangeRequest {
  id: string;
  connectionId: string;
  requestedByUserId: string;
  requestedByName: string;
  proposedProSharePercent: number;
  proposedMaxDrawdownPercent: number;
  proposedNoticeDays: number;
  reason: string;
  newTraderAccepted: boolean;
  proTraderAccepted: boolean;
  status: 'pending' | 'applied' | 'declined';
  createdAt: string;
}

export interface DisputeCase {
  id: string;
  connectionId: string;
  openedByUserId: string;
  openedByName: string;
  againstUserId: string;
  againstName: string;
  reason: string;
  details: string;
  evidenceFileName?: string;
  status: 'open' | 'under_review' | 'resolved';
  createdAt: string;
  resolutionNote?: string;
  reviewRequested?: boolean;
  reviewRequestedAt?: string;
  reviewRequestNote?: string;
}

export interface TraderReport {
  id: string;
  reporterUserId: string;
  reporterName: string;
  targetUserId: string;
  targetName: string;
  reason: string;
  details: string;
  status: 'open' | 'checked';
  createdAt: string;
}

export type InvoiceStatus = 'due' | 'paid' | 'overdue';

export type UnpaidStage = 'none' | 'reminder_sent' | 'warning_sent' | 'suspended';

export interface InvoiceHistoryEntry {
  step: string;
  note: string;
  at: string;
}

export interface SettlementRecord {
  id: string;
  connectionId: string;
  newTraderId: string;
  proTraderId: string;
  periodLabel: string;
  createdAt: string;
  startingBalanceUsd: number;
  endingBalanceUsd: number;
  depositsUsd: number;
  withdrawalsUsd: number;
  previousHwmUsd: number;
  adjustedEndingUsd: number;
  realizedNetProfitUsd: number;
  eligibleProfitUsd: number;
  recoveryAppliedUsd: number;
  newHwmUsd: number;
  lossCarryForwardUsd: number;
  newTraderSharePercent: number;
  proNetSharePercent: number;
  platformCommissionPercent: number;
  newTraderAmountUsd: number;
  proNetAmountUsd: number;
  platformCommissionUsd: number;
  centsSumCheck: boolean;
  commissionProtectionMonths: number;
  verificationCode: string;
}

export interface CommissionInvoice {
  id: string;
  settlementId: string;
  connectionId: string;
  proTraderId: string;
  newTraderId: string;
  amountUsd: number;
  status: InvoiceStatus;
  unpaidStage: UnpaidStage;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
  paymentMethodLabel?: string;
  history: InvoiceHistoryEntry[];
}

export interface FraudSignal {
  id: string;
  userId: string;
  userName: string;
  signalType: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: string;
  status: 'open' | 'checked';
  checkedBy?: string;
}

export type LaunchItemStatus = 'not_started' | 'in_progress' | 'done';

export interface LaunchChecklistItem {
  id: string;
  title: string;
  category: 'Open Question' | 'Compliance & Docs' | 'Security & Launch';
  status: LaunchItemStatus;
  notes: string;
}

