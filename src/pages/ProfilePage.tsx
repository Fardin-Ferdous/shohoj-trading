import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Link2 } from 'lucide-react';
import { DUMMY_AVATAR_URLS } from '../data/seedData';
import { useApp } from '../store/AppContext';
import { TEXTS } from '../texts';
import { BrokerAccountLink, NewTraderPreferences } from '../types';
import { formatCurrency } from '../utils/formatters';
import { UserAvatar } from '../components/ui/Avatar';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ExnessDirectCard } from '../components/ui/ExnessDirectCard';
import { Input } from '../components/ui/Input';
import { NoPasswordNotice } from '../components/ui/RiskBanner';
import { EmptyState } from '../components/ui/States';

const ACCESS_METHODS: BrokerAccountLink['accessMethod'][] = [
  'Exness copy-trading / social trading link',
  'Broker-approved account management option',
  'Read-only (investor) access for checking results only',
];

export function ProfilePage() {
  const navigate = useNavigate();
  const { db, settings, currentUser, updateNewTraderProfile, saveBrokerLink } = useApp();

  const existingLink = currentUser
    ? db.brokerLinks.find((b) => b.userId === currentUser.id)
    : undefined;

  const [fullName, setFullName] = useState(currentUser?.fullName ?? '');
  const [avatarUrl, setAvatarUrl] = useState(
    currentUser?.avatarUrl ?? DUMMY_AVATAR_URLS[0]
  );
  const [country, setCountry] = useState(
    currentUser?.country ?? settings.supportedCountries[0] ?? 'Bangladesh'
  );
  const [experienceLevel, setExperienceLevel] = useState<NewTraderPreferences['experienceLevel']>(
    currentUser?.newTraderPrefs?.experienceLevel ?? 'Complete beginner'
  );
  const [tradingGoal, setTradingGoal] = useState(
    currentUser?.newTraderPrefs?.tradingGoal ?? 'Steady growth with low drawdown'
  );
  const [riskComfort, setRiskComfort] = useState<NewTraderPreferences['riskComfort']>(
    currentUser?.newTraderPrefs?.riskComfort ?? 'Low'
  );

  // Broker account link state (NO master password field!)
  const [accountType, setAccountType] = useState<BrokerAccountLink['accountType']>(
    existingLink?.accountType ?? 'Standard'
  );
  const [accountNumber, setAccountNumber] = useState('48219033');
  const [isRealAccount, setIsRealAccount] = useState(true);
  const [balanceUsd, setBalanceUsd] = useState(String(existingLink?.balanceUsd ?? settings.minDepositUsd));
  const [accessMethod, setAccessMethod] = useState<BrokerAccountLink['accessMethod']>(
    existingLink?.accessMethod ?? ACCESS_METHODS[0]
  );
  const [brokerError, setBrokerError] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const link = db.brokerLinks.find((b) => b.userId === currentUser.id);
    setFullName(currentUser.fullName);
    setAvatarUrl(currentUser.avatarUrl ?? DUMMY_AVATAR_URLS[0]);
    setCountry(currentUser.country);
    setExperienceLevel(currentUser.newTraderPrefs?.experienceLevel ?? 'Complete beginner');
    setTradingGoal(currentUser.newTraderPrefs?.tradingGoal ?? 'Steady growth with low drawdown');
    setRiskComfort(currentUser.newTraderPrefs?.riskComfort ?? 'Low');
    setAccountType(link?.accountType ?? 'Standard');
    setBalanceUsd(String(link?.balanceUsd ?? settings.minDepositUsd));
    setAccessMethod(link?.accessMethod ?? ACCESS_METHODS[0]);
    setBrokerError('');
  }, [currentUser?.id]);

  if (!currentUser) {
    return (
      <EmptyState
        title="Please log in first"
        message="Log in or pick a demo user in Demo Tools to edit your profile and broker account."
        actionLabel="Go to Log in"
        onAction={() => navigate('/login')}
      />
    );
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    updateNewTraderProfile(currentUser.id, {
      fullName,
      country,
      avatarUrl,
      prefs: {
        experienceLevel,
        tradingGoal: tradingGoal.trim() || 'Steady growth',
        riskComfort,
      },
    });
  };

  const handleSaveBroker = (e: React.FormEvent) => {
    e.preventDefault();
    setBrokerError('');
    const numBalance = Number(balanceUsd);
    if (!Number.isFinite(numBalance)) {
      setBrokerError('Please enter a valid dollar balance.');
      return;
    }

    const res = saveBrokerLink(currentUser.id, {
      accountType,
      accountNumber,
      isRealAccount,
      balanceUsd: numBalance,
      accessMethod,
    });
    if (!res.ok) {
      setBrokerError(res.error ?? 'Could not link broker account.');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <UserAvatar src={currentUser.avatarUrl} name={currentUser.fullName} size="lg" />
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            {TEXTS.profile.title}
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            {TEXTS.profile.subtitle}
          </p>
        </div>
      </div>

      {/* Personal Profile & Trading Goals */}
      <Card padding="lg">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
            Your details & comfort level
          </h2>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-slate-200">
              Profile photo (dummy samples)
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              {DUMMY_AVATAR_URLS.map((url, idx) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setAvatarUrl(url)}
                  aria-label={`Use sample profile photo ${idx + 1}`}
                  className={`rounded-full p-0.5 border-2 transition-all cursor-pointer ${
                    avatarUrl === url
                      ? 'border-emerald-400 scale-105'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <UserAvatar src={url} name={`Sample ${idx + 1}`} size="sm" />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-country" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Country
              </label>
              <select
                id="profile-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="min-h-[44px] w-full rounded-full px-5 py-2.5 text-base bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
              >
                {settings.supportedCountries.map((c) => (
                  <option key={c} value={c} className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-exp" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Trading experience
              </label>
              <select
                id="profile-exp"
                value={experienceLevel}
                onChange={(e) =>
                  setExperienceLevel(e.target.value as NewTraderPreferences['experienceLevel'])
                }
                className="min-h-[44px] w-full rounded-full px-5 py-2.5 text-base bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
              >
                <option value="Complete beginner" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">Complete beginner</option>
                <option value="Under 1 year" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">Under 1 year</option>
                <option value="1 to 3 years" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">1 to 3 years</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-risk" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Risk comfort
              </label>
              <select
                id="profile-risk"
                value={riskComfort}
                onChange={(e) =>
                  setRiskComfort(e.target.value as NewTraderPreferences['riskComfort'])
                }
                className="min-h-[44px] w-full rounded-full px-5 py-2.5 text-base bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
              >
                <option value="Low" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">Low (safer, slower)</option>
                <option value="Medium" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">Medium (balanced)</option>
                <option value="Higher" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">Higher (bigger swings)</option>
              </select>
            </div>
          </div>

          <Input
            label="Main goal"
            value={tradingGoal}
            onChange={(e) => setTradingGoal(e.target.value)}
            placeholder="Example: Grow slowly with low drawdown"
          />

          <Button type="submit" variant="secondary">
            Save profile
          </Button>
        </form>
      </Card>

      {/* My Broker Account */}
      <Card padding="lg" className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                My broker account (Exness MT5)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {TEXTS.exnessMethodTag}
              </p>
            </div>
          </div>
          {existingLink && (
            <StatusBadge tone="success" label={`Linked ${existingLink.accountNumberMasked}`} />
          )}
        </div>

        <NoPasswordNotice />

        <ExnessDirectCard
          mode="own_new_trader"
          accountMasked={existingLink?.accountNumberMasked}
          accessMethod={existingLink?.accessMethod}
        />

        <form onSubmit={handleSaveBroker} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5">Broker</p>
              <div className="min-h-[44px] rounded-full px-5 py-2.5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-700 dark:text-slate-200 flex items-center justify-between">
                <span>Exness (MT5)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="broker-acc-type" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                MT5 Account type
              </label>
              <select
                id="broker-acc-type"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as BrokerAccountLink['accountType'])}
                className="min-h-[44px] w-full rounded-full px-5 py-2.5 text-base bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
              >
                <option value="Standard" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">Standard</option>
                <option value="Pro" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">Pro</option>
                <option value="Raw Spread" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">Raw Spread</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="MT5 Account number (fake demo number)"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. 48219033"
              hint="Stored masked as MT5-••••9033"
            />
            <Input
              label="Account balance (USD)"
              type="number"
              min={0}
              value={balanceUsd}
              onChange={(e) => setBalanceUsd(e.target.value)}
              hint={`Minimum required from Settings: ${formatCurrency(settings.minDepositUsd)}`}
            />
          </div>

          {/* Real vs Demo check */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Account mode
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsRealAccount(true);
                  setBrokerError('');
                }}
                className={`min-h-[44px] px-5 py-2 rounded-full text-sm font-medium border cursor-pointer ${
                  isRealAccount
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-300 dark:border-white/15'
                }`}
              >
                Real money account
              </button>
              <button
                type="button"
                onClick={() => setIsRealAccount(false)}
                className={`min-h-[44px] px-5 py-2 rounded-full text-sm font-medium border cursor-pointer ${
                  !isRealAccount
                    ? 'border-red-500 bg-red-500/15 text-red-700 dark:text-red-300'
                    : 'border-slate-300 dark:border-white/15'
                }`}
              >
                Demo practice account
              </button>
            </div>
            {!isRealAccount && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {TEXTS.profile.demoRejectedMsg}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="broker-method" className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Approved access option ({TEXTS.exnessMethodTag})
            </label>
            <select
              id="broker-method"
              value={accessMethod}
              onChange={(e) => setAccessMethod(e.target.value as BrokerAccountLink['accessMethod'])}
              className="min-h-[44px] w-full rounded-full px-5 py-2.5 text-sm sm:text-base bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
            >
              {ACCESS_METHODS.map((m) => (
                <option key={m} value={m} className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {brokerError && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-700 dark:text-red-300">
              {brokerError}
            </div>
          )}

          <Button type="submit">Save broker account</Button>
        </form>
      </Card>
    </div>
  );
}
