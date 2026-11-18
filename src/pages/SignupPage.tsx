import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { TEXTS } from '../texts';
import { evaluatePasswordStrength, isValidEmail } from '../utils/validators';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PasswordStrengthMeter } from '../components/ui/PasswordMeter';

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'pro_trader' ? 'pro_trader' : 'new_trader';

  const { settings, signupUser, verifyTwoFactorLogin } = useApp();

  const [role, setRole] = useState<'new_trader' | 'pro_trader'>(initialRole);

  useEffect(() => {
    const paramRole = searchParams.get('role');
    if (paramRole === 'pro_trader' || paramRole === 'new_trader') {
      setRole(paramRole);
      if (paramRole === 'pro_trader') setEnableTwoFactor(true);
    }
  }, [searchParams]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState(settings.supportedCountries[0] ?? 'Bangladesh');
  const [ageYears, setAgeYears] = useState('24');
  const [password, setPassword] = useState('');
  const [enableTwoFactor, setEnableTwoFactor] = useState(initialRole === 'pro_trader');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');

  // 2FA verification step right after signup if enabled/required
  const [pending2fa, setPending2fa] = useState<{ userId: string; code: string } | null>(null);
  const [codeInput, setCodeInput] = useState('');

  const handleRoleSwitch = (nextRole: 'new_trader' | 'pro_trader') => {
    setRole(nextRole);
    if (nextRole === 'pro_trader') {
      setEnableTwoFactor(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    const parsedAge = Number(ageYears);
    if (!Number.isFinite(parsedAge) || parsedAge < settings.minAgeYears) {
      setError(`You must be at least ${settings.minAgeYears} years old to create an account.`);
      return;
    }
    const strength = evaluatePasswordStrength(password);
    if (!strength.isAcceptable) {
      setError('Please make your password stronger by following the checklist below.');
      return;
    }
    if (!acceptedTerms) {
      setError('Please read and accept the Terms and Risk Warning to continue.');
      return;
    }

    const res = signupUser({
      fullName,
      email,
      phone,
      country,
      ageYears: parsedAge,
      role,
      password,
      enableTwoFactor,
    });

    if (!res.ok) {
      setError(res.error ?? 'Could not create account.');
      return;
    }

    if (res.needs2fa && res.userId && res.demoCode) {
      setPending2fa({ userId: res.userId, code: res.demoCode });
      return;
    }

    navigate('/dashboard');
  };

  const handleVerifySignup2fa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending2fa) return;
    setError('');
    const ok = verifyTwoFactorLogin(pending2fa.userId, codeInput, pending2fa.code);
    if (!ok) {
      setError('Code does not match. Check the demo hint below.');
      return;
    }
    navigate('/dashboard');
  };

  if (pending2fa) {
    return (
      <div className="max-w-xl mx-auto">
        <Card padding="lg" className="space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                Confirm two-step security
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Enter the 6-digit code to finish setting up your account.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-3.5 text-sm text-sky-900 dark:text-sky-200">
            Demo security code:{' '}
            <span className="font-mono font-bold tracking-wider">{pending2fa.code}</span>
          </div>

          <form onSubmit={handleVerifySignup2fa} className="space-y-4">
            <Input
              label="6-digit code"
              inputMode="numeric"
              maxLength={6}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Enter 6-digit code"
              error={error}
            />
            <Button type="submit" fullWidth>
              Complete sign up
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card padding="lg" className="space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            {TEXTS.auth.signupTitle}
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            {TEXTS.auth.signupSubtitle}
          </p>
        </div>

        {/* Role Selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">I want to join as</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleRoleSwitch('new_trader')}
              className={`min-h-[64px] rounded-2xl p-4 text-left border transition-all cursor-pointer ${
                role === 'new_trader'
                  ? 'border-emerald-500 bg-emerald-500/10 dark:border-emerald-400 dark:bg-emerald-400/10'
                  : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <p className="font-display font-semibold text-slate-950 dark:text-white">New Trader</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Keep my money in my own Exness MT5 account.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSwitch('pro_trader')}
              className={`min-h-[64px] rounded-2xl p-4 text-left border transition-all cursor-pointer ${
                role === 'pro_trader'
                  ? 'border-emerald-500 bg-emerald-500/10 dark:border-emerald-400 dark:bg-emerald-400/10'
                  : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <p className="font-display font-semibold text-slate-950 dark:text-white">
                Professional Trader
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Verify real history and manage connected accounts.
              </p>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your legal name"
            />
            <Input
              label="Age (years)"
              type="number"
              min={1}
              max={120}
              value={ageYears}
              onChange={(e) => setAgeYears(e.target.value)}
              hint={`Minimum age is ${settings.minAgeYears}`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="Phone number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+880 1700-000000"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="signup-country"
              className="text-sm font-medium text-slate-800 dark:text-slate-200"
            >
              Country
            </label>
            <select
              id="signup-country"
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
            <p className="text-xs text-slate-500 dark:text-slate-400 px-2">
              Supported countries list from Admin Settings.
            </p>
          </div>

          <div className="space-y-2">
            <Input
              label="Create password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
            />
            <PasswordStrengthMeter password={password} />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {TEXTS.auth.passwordHashingNote}
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-white/10 p-3.5 cursor-pointer">
            <input
              type="checkbox"
              checked={role === 'pro_trader' ? true : enableTwoFactor}
              disabled={role === 'pro_trader'}
              onChange={(e) => setEnableTwoFactor(e.target.checked)}
              className="mt-1 h-4 w-4 accent-emerald-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">
              Turn on two-step login (6-digit code)
              {role === 'pro_trader' && (
                <span className="block text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Required for all Professional Traders.
                </span>
              )}
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 accent-emerald-500"
            />
            <span>
              I confirm I am {settings.minAgeYears}+ years old and accept the{' '}
              <Link to="/legal/terms" className="text-emerald-600 dark:text-emerald-400 underline">
                Terms of Use
              </Link>
              ,{' '}
              <Link to="/legal/risk" className="text-emerald-600 dark:text-emerald-400 underline">
                Risk Warning
              </Link>
              ,{' '}
              <Link to="/legal/privacy" className="text-emerald-600 dark:text-emerald-400 underline">
                Privacy Policy
              </Link>
              , and{' '}
              <Link to="/legal/advertising" className="text-emerald-600 dark:text-emerald-400 underline">
                Advertising Rules
              </Link>
              .
            </span>
          </label>

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" fullWidth>
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            <span>Create account</span>
          </Button>
        </form>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
