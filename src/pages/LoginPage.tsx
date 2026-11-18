import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { TEXTS } from '../texts';
import { evaluatePasswordStrength, isValidEmail } from '../utils/validators';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PasswordStrengthMeter } from '../components/ui/PasswordMeter';

type AuthStep = 'credentials' | 'two_factor' | 'forgot_email' | 'forgot_reset';

export function LoginPage() {
  const navigate = useNavigate();
  const {
    db,
    settings,
    sessionExpiredNotice,
    dismissSessionExpiredNotice,
    loginWithCredentials,
    verifyTwoFactorLogin,
    unlockDemoAccount,
    completePasswordReset,
  } = useApp();

  const [step, setStep] = useState<AuthStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  // 2FA state
  const [pendingUserId, setPendingUserId] = useState('');
  const [expectedCode, setExpectedCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetDemoCode, setResetDemoCode] = useState('');
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const navigateAfterLogin = (userId?: string) => {
    const logged = db.users.find((u) => u.id === userId);
    if (logged?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLocked(false);

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    const res = loginWithCredentials(email, password);
    if (res.status === 'locked') {
      setIsLocked(true);
      setError(res.message ?? 'Account locked.');
      return;
    }
    if (res.status === 'error') {
      setError(res.message ?? 'Could not log in.');
      return;
    }
    if (res.status === 'needs_2fa' && res.pendingUserId && res.demoCode) {
      setPendingUserId(res.pendingUserId);
      setExpectedCode(res.demoCode);
      setEnteredCode('');
      setStep('two_factor');
      return;
    }

    const matched = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    navigateAfterLogin(matched?.id);
  };

  const handleVerify2fa = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = verifyTwoFactorLogin(pendingUserId, enteredCode, expectedCode);
    if (!ok) {
      setError('That 6-digit code does not match. Check the demo hint below.');
      return;
    }
    navigateAfterLogin(pendingUserId);
  };

  const handleStartForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail(resetEmail)) {
      setError('Please enter your account email address.');
      return;
    }
    setResetDemoCode('482910');
    setStep('forgot_reset');
  };

  const handleFinishReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (resetCodeInput.trim() !== resetDemoCode) {
      setError('Reset code does not match the demo code shown below.');
      return;
    }
    const strength = evaluatePasswordStrength(newPassword);
    if (!strength.isAcceptable) {
      setError('Please choose a stronger password that meets the rules below.');
      return;
    }
    const res = completePasswordReset(resetEmail, newPassword);
    if (!res.ok) {
      setError(res.error ?? 'Could not reset password.');
      return;
    }
    setEmail(resetEmail);
    setPassword(newPassword);
    setStep('credentials');
  };

  const fillDemo = (demoEmail: string, demoPw: string) => {
    setEmail(demoEmail);
    setPassword(demoPw);
    setError('');
    setIsLocked(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {sessionExpiredNotice && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              Your session ended after {settings.sessionTimeoutMinutes} minutes of inactivity. Please log in again.
            </span>
          </div>
          <button
            type="button"
            onClick={dismissSessionExpiredNotice}
            className="text-xs underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {step === 'credentials' && (
        <Card padding="lg" className="space-y-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
              {TEXTS.auth.loginTitle}
            </h1>
            <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              {TEXTS.auth.loginSubtitle}
            </p>
          </div>

          {/* Quick Demo Account Fill */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3.5 bg-slate-50/80 dark:bg-white/[0.03] space-y-2.5">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Quick fill sample account
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fillDemo('arif.rahman@example.com', 'DemoPass123!')}
                className="min-h-[36px] px-3 py-1 rounded-full text-xs font-medium border border-slate-300 dark:border-white/15 hover:bg-emerald-500/10 hover:border-emerald-500/40 cursor-pointer"
              >
                New Trader (Arif)
              </button>
              <button
                type="button"
                onClick={() => fillDemo('sadia.c@example.com', 'DemoPass123!')}
                className="min-h-[36px] px-3 py-1 rounded-full text-xs font-medium border border-slate-300 dark:border-white/15 hover:bg-emerald-500/10 hover:border-emerald-500/40 cursor-pointer"
              >
                New Trader + 2-Step (Sadia)
              </button>
              <button
                type="button"
                onClick={() => fillDemo('kamrul.pro@example.com', 'DemoPass123!')}
                className="min-h-[36px] px-3 py-1 rounded-full text-xs font-medium border border-slate-300 dark:border-white/15 hover:bg-emerald-500/10 hover:border-emerald-500/40 cursor-pointer"
              >
                Pro Trader (Kamrul)
              </button>
              <button
                type="button"
                onClick={() => fillDemo('tariq.admin@shohoj.example', 'AdminPass123!')}
                className="min-h-[36px] px-3 py-1 rounded-full text-xs font-medium border border-slate-300 dark:border-white/15 hover:bg-emerald-500/10 hover:border-emerald-500/40 cursor-pointer"
              >
                Super Admin (Tariq)
              </button>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />

            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-700 dark:text-red-300 space-y-2">
                <p>{error}</p>
                {isLocked && (
                  <button
                    type="button"
                    onClick={() => {
                      unlockDemoAccount(email);
                      setIsLocked(false);
                      setError('');
                    }}
                    className="text-xs font-semibold underline cursor-pointer"
                  >
                    Unlock this demo account now
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setError('');
                  setStep('forgot_email');
                }}
                className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Locks after {settings.maxFailedLoginAttempts} wrong tries
              </span>
            </div>

            <Button type="submit" size="lg" fullWidth>
              <Lock className="w-4 h-4" aria-hidden="true" />
              <span>Log in</span>
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            New to Shohoj Trading?{' '}
            <Link to="/signup" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
              Create an account
            </Link>
          </p>
        </Card>
      )}

      {step === 'two_factor' && (
        <Card padding="lg" className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                {TEXTS.auth.twoStepTitle}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {TEXTS.auth.twoStepSubtitle}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-3.5 text-sm text-sky-900 dark:text-sky-200">
            Demo verification code:{' '}
            <span className="font-mono font-bold tracking-wider">{expectedCode}</span>
          </div>

          <form onSubmit={handleVerify2fa} className="space-y-4">
            <Input
              label="6-digit security code"
              inputMode="numeric"
              maxLength={6}
              value={enteredCode}
              onChange={(e) => setEnteredCode(e.target.value)}
              placeholder="Enter 6-digit code"
              error={error}
            />

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setError('');
                }}
              >
                Back
              </Button>
              <Button type="submit" fullWidth>
                Verify and continue
              </Button>
            </div>
          </form>
        </Card>
      )}

      {step === 'forgot_email' && (
        <Card padding="lg" className="space-y-6">
          <div className="flex items-center gap-3">
            <KeyRound className="w-6 h-6 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                {TEXTS.auth.forgotTitle}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {TEXTS.auth.forgotSubtitle}
              </p>
            </div>
          </div>

          <form onSubmit={handleStartForgot} className="space-y-4">
            <Input
              label="Your account email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="you@example.com"
              error={error}
            />
            <div className="flex gap-3">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setError('');
                }}
              >
                Back
              </Button>
              <Button type="submit" fullWidth>
                Send reset code
              </Button>
            </div>
          </form>
        </Card>
      )}

      {step === 'forgot_reset' && (
        <Card padding="lg" className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
              Choose a new password
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Simulated email sent to {resetEmail}.
            </p>
          </div>

          <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-3.5 text-sm text-sky-900 dark:text-sky-200">
            Demo email code: <span className="font-mono font-bold">{resetDemoCode}</span>
          </div>

          <form onSubmit={handleFinishReset} className="space-y-4">
            <Input
              label="Reset code"
              value={resetCodeInput}
              onChange={(e) => setResetCodeInput(e.target.value)}
              placeholder="Enter 6-digit code"
            />
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Create a strong password"
            />
            <PasswordStrengthMeter password={newPassword} />

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <Button type="submit" fullWidth>
              Save new password
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
