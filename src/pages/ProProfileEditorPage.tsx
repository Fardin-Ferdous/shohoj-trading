import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ExternalLink, Lock, ShieldCheck } from 'lucide-react';
import { DUMMY_AVATAR_URLS } from '../data/seedData';
import { useApp } from '../store/AppContext';
import { TEXTS } from '../texts';
import { BrokerAccountLink, RiskTag } from '../types';
import { RISKY_TAGS } from '../utils/shohojScore';
import { UserAvatar } from '../components/ui/Avatar';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ExnessDirectCard } from '../components/ui/ExnessDirectCard';
import { Input } from '../components/ui/Input';
import { NoPasswordNotice } from '../components/ui/RiskBanner';
import { EmptyState } from '../components/ui/States';

const ALL_INSTRUMENTS = ['EUR/USD', 'XAU/USD', 'GBP/USD', 'USD/JPY', 'GBP/JPY', 'EUR/GBP', 'AUD/USD', 'US30', 'NAS100'];
const ALL_STYLES = ['Swing Trading', 'Day Trading', 'Trend Following', 'Price Action', 'Breakout Trading', 'Range Trading', 'Intraday Momentum', 'Grid System', 'Martingale'];
const ALL_RISK_TAGS: RiskTag[] = ['Low Risk', 'Balanced', 'Grid', 'Martingale', 'No stop loss'];
const AVATAR_COLORS = ['#10b981', '#0ea5e9', '#6366f1', '#f59e0b', '#ec4899'];

const ACCESS_METHODS: BrokerAccountLink['accessMethod'][] = [
  'Exness copy-trading / social trading link',
  'Broker-approved account management option',
  'Read-only (investor) access for checking results only',
];

export function ProProfileEditorPage() {
  const navigate = useNavigate();
  const {
    db,
    settings,
    currentUser,
    submitProOnboarding,
    updateProTraderProfile,
    simulateProReviewDecision,
  } = useApp();

  const existingProfile = currentUser
    ? db.traderProfiles.find((p) => p.userId === currentUser.id)
    : undefined;

  // Onboarding state
  const [accountNumber, setAccountNumber] = useState('77412095');
  const [isRealAccount, setIsRealAccount] = useState(true);
  const [accessMethod, setAccessMethod] = useState<BrokerAccountLink['accessMethod']>(
    existingProfile?.proAccountLink?.accessMethod ?? ACCESS_METHODS[2]
  );
  const [simMonths, setSimMonths] = useState(
    String(existingProfile?.ownAccountStats.historyMonths ?? Math.max(settings.minHistoryMonths, 6))
  );
  const [simTrades, setSimTrades] = useState(
    String(existingProfile?.ownAccountStats.tradeCount ?? Math.max(settings.minTradeCount, 85))
  );
  const [onboardError, setOnboardError] = useState('');

  // Editable Profile state (stats are strictly read-only!)
  const [displayName, setDisplayName] = useState(
    existingProfile?.displayName ?? currentUser?.fullName ?? ''
  );
  const [bio, setBio] = useState(existingProfile?.bio ?? '');
  const [avatarColor, setAvatarColor] = useState(existingProfile?.avatarColor ?? AVATAR_COLORS[0]);
  const [avatarPhotoName, setAvatarPhotoName] = useState(existingProfile?.avatarPhotoName ?? '');
  const [avatarUrl, setAvatarUrl] = useState(
    existingProfile?.avatarUrl ?? currentUser?.avatarUrl ?? DUMMY_AVATAR_URLS[0]
  );
  const [tradingStyle, setTradingStyle] = useState(existingProfile?.tradingStyle ?? 'Swing Trading');
  const [instruments, setInstruments] = useState<string[]>(
    existingProfile?.instruments ?? ['EUR/USD', 'XAU/USD']
  );
  const [riskTags, setRiskTags] = useState<RiskTag[]>(
    existingProfile?.riskTags ?? ['Low Risk']
  );
  const [askedShare, setAskedShare] = useState(
    existingProfile?.askedProfitSharePercent ?? settings.defaultProTraderSharePercent
  );
  const [isOpenForRequests, setIsOpenForRequests] = useState(
    existingProfile?.isOpenForRequests ?? true
  );
  const [maxConnections, setMaxConnections] = useState(
    String(existingProfile?.maxConnections ?? 5)
  );
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const p = db.traderProfiles.find((item) => item.userId === currentUser.id);
    setDisplayName(p?.displayName ?? currentUser.fullName);
    setBio(p?.bio ?? '');
    setAvatarColor(p?.avatarColor ?? AVATAR_COLORS[0]);
    setAvatarPhotoName(p?.avatarPhotoName ?? '');
    setAvatarUrl(p?.avatarUrl ?? currentUser.avatarUrl ?? DUMMY_AVATAR_URLS[0]);
    setTradingStyle(p?.tradingStyle ?? 'Swing Trading');
    setInstruments(p?.instruments ?? ['EUR/USD', 'XAU/USD']);
    setRiskTags(p?.riskTags ?? ['Low Risk']);
    setAskedShare(
      Math.min(
        settings.maxProSharePercent,
        Math.max(
          settings.minProSharePercent,
          p?.askedProfitSharePercent ?? settings.defaultProTraderSharePercent
        )
      )
    );
    setIsOpenForRequests(p?.isOpenForRequests ?? true);
    setMaxConnections(String(p?.maxConnections ?? 5));
    setSimMonths(String(p?.ownAccountStats.historyMonths ?? Math.max(settings.minHistoryMonths, 6)));
    setSimTrades(String(p?.ownAccountStats.tradeCount ?? Math.max(settings.minTradeCount, 85)));
    setOnboardError('');
    setProfileError('');
  }, [currentUser?.id]);

  if (!currentUser) {
    return (
      <EmptyState
        title="Please log in first"
        message="Switch to a Professional Trader in Demo Tools or log in to edit your profile."
        actionLabel="Go to Log in"
        onAction={() => navigate('/login')}
      />
    );
  }

  const newTraderGets = 100 - askedShare;
  const proNetGets = Math.max(0, askedShare - settings.platformCommissionPercent);
  const hasRiskyTagSelected = riskTags.some((t) =>
    (RISKY_TAGS as readonly string[]).includes(t)
  );

  const toggleInstrument = (inst: string) => {
    setInstruments((prev) =>
      prev.includes(inst) ? prev.filter((x) => x !== inst) : [...prev, inst]
    );
  };

  const toggleRiskTag = (tag: RiskTag) => {
    setRiskTags((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]
    );
  };

  const handleSubmitOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardError('');
    const res = submitProOnboarding(currentUser.id, {
      accountNumber,
      isRealAccount,
      accessMethod,
      simulatedHistoryMonths: Number(simMonths),
      simulatedTradeCount: Number(simTrades),
    });
    if (!res.ok) {
      setOnboardError(res.error ?? 'Could not submit trading account.');
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    const res = updateProTraderProfile(currentUser.id, {
      displayName,
      bio,
      avatarColor,
      avatarPhotoName,
      avatarUrl,
      tradingStyle,
      instruments,
      riskTags,
      askedProfitSharePercent: askedShare,
      isOpenForRequests,
      maxConnections: Number(maxConnections) || 5,
    });
    if (!res.ok) {
      setProfileError(res.error ?? 'Could not save profile.');
    }
  };

  const reviewBadge = existingProfile?.isApproved
    ? { tone: 'success' as const, label: 'Approved & Public' }
    : existingProfile?.proAccountLink?.reviewStatus === 'waiting_review'
    ? { tone: 'info' as const, label: 'Waiting for admin review' }
    : existingProfile?.proAccountLink?.reviewStatus === 'rejected'
    ? { tone: 'danger' as const, label: 'Rejected' }
    : { tone: 'neutral' as const, label: 'Not yet public' };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Professional Trader Workspace
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Onboarding & Trader Profile
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Link your real Exness account for verification and set your public profile details.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge tone={reviewBadge.tone} label={reviewBadge.label} />
          {existingProfile && (
            <Link to={`/traders/${existingProfile.id}`}>
              <Button size="sm" variant="secondary">
                <span>View public page</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Step 1: KYC & Broker Onboarding */}
      <Card padding="lg" className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-white/10">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
              1. Identity & Exness account verification
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {TEXTS.exnessMethodTag}
            </p>
          </div>
          <Link to="/kyc" className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
            KYC status: <span className="capitalize">{currentUser.kycStatus.replace('_', ' ')}</span> →
          </Link>
        </div>

        <NoPasswordNotice />

        <ExnessDirectCard
          mode="own_pro_trader"
          accountMasked={existingProfile?.proAccountLink?.accountNumberMasked}
          accessMethod={existingProfile?.proAccountLink?.accessMethod}
        />

        <form onSubmit={handleSubmitOnboarding} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Exness MT5 Account number (fake demo number)"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pro-access-method" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Approved verification method
              </label>
              <select
                id="pro-access-method"
                value={accessMethod}
                onChange={(e) => setAccessMethod(e.target.value as BrokerAccountLink['accessMethod'])}
                className="min-h-[44px] w-full rounded-full px-5 py-2.5 text-sm bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
              >
                {ACCESS_METHODS.map((m) => (
                  <option key={m} value={m} className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Real vs Demo check */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsRealAccount(true);
                setOnboardError('');
              }}
              className={`min-h-[40px] px-4 py-1.5 rounded-full text-sm font-medium border cursor-pointer ${
                isRealAccount
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-300 dark:border-white/15'
              }`}
            >
              Real trading account
            </button>
            <button
              type="button"
              onClick={() => setIsRealAccount(false)}
              className={`min-h-[40px] px-4 py-1.5 rounded-full text-sm font-medium border cursor-pointer ${
                !isRealAccount
                  ? 'border-red-500 bg-red-500/15 text-red-700 dark:text-red-300'
                  : 'border-slate-300 dark:border-white/15'
              }`}
            >
              Demo account (not allowed)
            </button>
          </div>

          {/* Simulated broker history test inputs */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50/70 dark:bg-white/[0.02] space-y-3">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Simulated broker feed check (minimum from Settings: {settings.minHistoryMonths} months, {settings.minTradeCount} trades)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Fetched history (months)"
                type="number"
                value={simMonths}
                onChange={(e) => setSimMonths(e.target.value)}
              />
              <Input
                label="Fetched closed trades"
                type="number"
                value={simTrades}
                onChange={(e) => setSimTrades(e.target.value)}
              />
            </div>
          </div>

          {onboardError && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-700 dark:text-red-300">
              {onboardError}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit">Submit account for admin review</Button>
            {existingProfile && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => simulateProReviewDecision(currentUser.id, 'approved')}
                >
                  Simulate Admin Approval
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={() =>
                    simulateProReviewDecision(
                      currentUser.id,
                      'rejected',
                      'History needs clearer stop-loss evidence.'
                    )
                  }
                >
                  Simulate Rejection
                </Button>
              </>
            )}
          </div>
        </form>
      </Card>

      {/* Step 2: Profile Editor */}
      <Card padding="lg" className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-white/10">
          <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
            2. Public profile details
          </h2>
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Lock className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
            <span>Performance numbers are locked to broker data</span>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Avatar + Display Name */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <UserAvatar
              src={avatarUrl || undefined}
              name={displayName || currentUser.fullName}
              color={avatarColor}
              size="lg"
            />
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">
                  Profile portrait photo (pick a demo portrait or use initials badge)
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {DUMMY_AVATAR_URLS.map((url, idx) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => {
                        setAvatarUrl(url);
                        setAvatarPhotoName(`Demo Portrait ${idx + 1}`);
                      }}
                      aria-label={`Select portrait ${idx + 1}`}
                      className={`h-10 w-10 rounded-full overflow-hidden border-2 transition-transform cursor-pointer ${
                        avatarUrl === url
                          ? 'border-emerald-400 scale-110'
                          : 'border-white/15 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Portrait option ${idx + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarUrl('');
                      setAvatarPhotoName('');
                    }}
                    className={`min-h-[36px] px-3 rounded-full text-xs font-medium border cursor-pointer ${
                      !avatarUrl
                        ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300'
                        : 'border-white/15 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    Use initials
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Select color ${color}`}
                    onClick={() => setAvatarColor(color)}
                    className={`h-7 w-7 rounded-full border-2 cursor-pointer ${
                      avatarColor === color
                        ? 'border-slate-950 dark:border-white scale-110'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <label className="min-h-[36px] inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-slate-300 dark:border-white/15 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10">
                  <span>{avatarPhotoName ? `Photo: ${avatarPhotoName}` : 'Upload photo (demo)'}</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setAvatarPhotoName(f.name);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Public display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pro-style" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Trading style
              </label>
              <select
                id="pro-style"
                value={tradingStyle}
                onChange={(e) => setTradingStyle(e.target.value)}
                className="min-h-[44px] w-full rounded-full px-5 py-2.5 text-base bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
              >
                {ALL_STYLES.map((s) => (
                  <option key={s} value={s} className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pro-bio" className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Short bio (plain English, no profit promises)
            </label>
            <textarea
              id="pro-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Explain your trading pairs, risk limits, and typical holding time."
              className="w-full rounded-2xl px-4 py-3 text-base bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Instruments */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Instruments traded
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_INSTRUMENTS.map((inst) => {
                const selected = instruments.includes(inst);
                return (
                  <button
                    key={inst}
                    type="button"
                    onClick={() => toggleInstrument(inst)}
                    className={`min-h-[38px] px-3.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                      selected
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500 dark:bg-emerald-400'
                        : 'border-slate-300 text-slate-700 dark:border-white/15 dark:text-slate-300'
                    }`}
                  >
                    {inst}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Risk style tags */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Risk style tags (shown clearly to New Traders)
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_RISK_TAGS.map((tag) => {
                const selected = riskTags.includes(tag);
                const isRisky = (RISKY_TAGS as readonly string[]).includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleRiskTag(tag)}
                    className={`min-h-[38px] px-3.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                      selected
                        ? isRisky
                          ? 'bg-red-500/20 text-red-700 border-red-500 dark:text-red-300'
                          : 'bg-emerald-500 text-slate-950 border-emerald-500 dark:bg-emerald-400'
                        : 'border-slate-300 text-slate-700 dark:border-white/15 dark:text-slate-300'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            {hasRiskyTagSelected && (
              <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Risky style tags (Martingale, Grid, No stop loss) lower your Shohoj Score and warn New Traders clearly.
                </span>
              </div>
            )}
          </div>

          {/* Profit Share Slider bounded by Settings */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="pro-share-slider" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Profit share you ask for (allowed: {settings.minProSharePercent}% – {settings.maxProSharePercent}%)
              </label>
              <span className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {askedShare}%
              </span>
            </div>
            <input
              id="pro-share-slider"
              type="range"
              min={settings.minProSharePercent}
              max={settings.maxProSharePercent}
              step={1}
              value={askedShare}
              onChange={(e) => setAskedShare(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
              <div className="rounded-xl p-2 bg-slate-100 dark:bg-white/[0.04]">
                <span className="text-slate-500 dark:text-slate-400 block">New Trader gets</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {newTraderGets}%
                </span>
              </div>
              <div className="rounded-xl p-2 bg-slate-100 dark:bg-white/[0.04]">
                <span className="text-slate-500 dark:text-slate-400 block">You keep (after fee)</span>
                <span className="font-mono font-bold text-slate-950 dark:text-white text-sm">
                  {proNetGets}%
                </span>
              </div>
              <div className="rounded-xl p-2 bg-slate-100 dark:bg-white/[0.04]">
                <span className="text-slate-500 dark:text-slate-400 block">Platform fee</span>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-300 text-sm">
                  {settings.platformCommissionPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Availability & Max Connections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <label className="min-h-[44px] flex items-center gap-3 rounded-full px-4 py-2 border border-slate-300 dark:border-white/15 cursor-pointer">
              <input
                type="checkbox"
                checked={isOpenForRequests}
                onChange={(e) => setIsOpenForRequests(e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              <span className="text-sm text-slate-800 dark:text-slate-200">
                Open to new Requests to Connect
              </span>
            </label>

            <Input
              label="Maximum active connections"
              type="number"
              min={1}
              max={50}
              value={maxConnections}
              onChange={(e) => setMaxConnections(e.target.value)}
            />
          </div>

          {profileError && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-700 dark:text-red-300">
              {profileError}
            </div>
          )}

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-3.5 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
            <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              Numbers come from the broker or an approved source. Traders cannot type their own numbers.
            </span>
          </div>

          <Button type="submit" size="lg">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>Save public profile</span>
          </Button>
        </form>
      </Card>
    </div>
  );
}
