import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Laptop, LogOut, ShieldCheck } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { TEXTS } from '../texts';
import { LoginHistoryEntry } from '../types';
import { formatShortDate } from '../utils/formatters';
import { evaluatePasswordStrength } from '../utils/validators';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { HelpTip } from '../components/ui/HelpTip';
import { Input } from '../components/ui/Input';
import { PasswordStrengthMeter } from '../components/ui/PasswordMeter';
import { EmptyState, ResponsiveDataView, TableColumn } from '../components/ui/States';

export function SecurityPage() {
  const navigate = useNavigate();
  const {
    db,
    settings,
    currentUser,
    changePassword,
    toggleTwoFactor,
    revokeDeviceSession,
    simulateSessionTimeout,
  } = useApp();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');

  if (!currentUser) {
    return (
      <EmptyState
        title="Please log in first"
        message="Log in or pick a demo user in Demo Tools to view security settings."
        actionLabel="Go to Log in"
        onAction={() => navigate('/login')}
      />
    );
  }

  const userDevices = db.deviceSessions.filter((d) => d.userId === currentUser.id);
  const userHistory = db.loginHistory.filter((h) => h.userId === currentUser.id);
  const twoFactorMandatory = currentUser.role === 'pro_trader' || currentUser.role === 'admin';

  const handleChangePw = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    const strength = evaluatePasswordStrength(newPw);
    if (!strength.isAcceptable) {
      setPwError('Your new password must meet the strength rules below.');
      return;
    }
    const res = changePassword(currentUser.id, currentPw, newPw);
    if (!res.ok) {
      setPwError(res.error ?? 'Could not update password.');
      return;
    }
    setCurrentPw('');
    setNewPw('');
  };

  const historyColumns: TableColumn<LoginHistoryEntry>[] = [
    {
      key: 'device',
      header: 'Device',
      render: (item) => (
        <div>
          <p className="font-medium text-slate-950 dark:text-white">{item.deviceName}</p>
          {item.isNewDevice && (
            <span className="text-xs text-sky-600 dark:text-sky-400">New login alert</span>
          )}
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (item) => <span className="text-slate-600 dark:text-slate-300">{item.location}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      render: (item) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
          {formatShortDate(item.loggedInAt)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Result',
      render: (item) => (
        <StatusBadge
          tone={
            item.status === 'Success'
              ? 'success'
              : item.status === 'Locked'
              ? 'danger'
              : 'warning'
          }
          label={item.status}
        />
      ),
    },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
          {TEXTS.security.title}
        </h1>
        <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-300">
          {TEXTS.security.subtitle}
        </p>
      </div>

      {/* 2-Step Login & Session Timeout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
                <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                  Two-step login
                </h2>
                <HelpTip term="Two-step login" explanation={TEXTS.helpTips.twoFactor} />
              </div>
              <StatusBadge
                tone={currentUser.twoFactorEnabled ? 'success' : 'neutral'}
                label={currentUser.twoFactorEnabled ? 'On' : 'Off'}
              />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {twoFactorMandatory
                ? 'Required for all Professional Traders and Admins to protect managed accounts.'
                : 'Optional extra 6-digit security code when you log in.'}
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            disabled={twoFactorMandatory && currentUser.twoFactorEnabled}
            onClick={() => toggleTwoFactor(currentUser.id, !currentUser.twoFactorEnabled)}
          >
            {twoFactorMandatory
              ? 'Required (Always On)'
              : currentUser.twoFactorEnabled
              ? 'Turn off two-step login'
              : 'Turn on two-step login'}
          </Button>
        </Card>

        <Card className="flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
              <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                Session timeout
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              For safety, inactive sessions end automatically after{' '}
              <span className="font-mono font-semibold text-slate-950 dark:text-white">
                {settings.sessionTimeoutMinutes} minutes
              </span>{' '}
              (from Admin Settings).
            </p>
          </div>

          <Button variant="secondary" size="sm" onClick={simulateSessionTimeout}>
            Test timeout now
          </Button>
        </Card>
      </div>

      {/* Change Password */}
      <Card padding="lg">
        <form onSubmit={handleChangePw} className="space-y-4 max-w-lg">
          <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
            Change password
          </h2>
          <Input
            label="Current password"
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder="Demo accounts use DemoPass123! or AdminPass123!"
          />
          <Input
            label="New password"
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
          />
          <PasswordStrengthMeter password={newPw} />
          {pwError && <p className="text-sm text-red-600 dark:text-red-400">{pwError}</p>}
          <Button type="submit">Update password</Button>
        </form>
      </Card>

      {/* Active Devices */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
          Active devices ({userDevices.length})
        </h2>
        {userDevices.length === 0 ? (
          <EmptyState message="No active devices saved for this user." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {userDevices.map((dev) => (
              <Card key={dev.id} padding="sm" className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Laptop className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-950 dark:text-white truncate">
                      {dev.deviceName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {dev.browser} · {formatShortDate(dev.lastActiveAt)}
                    </p>
                  </div>
                </div>
                {dev.isCurrent ? (
                  <StatusBadge tone="success" label="This device" />
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => revokeDeviceSession(dev.id)}
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    <span>Sign out</span>
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Login History */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
          Login history
        </h2>
        <ResponsiveDataView
          items={userHistory}
          columns={historyColumns}
          getKey={(h) => h.id}
          renderMobileCard={(item) => (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm text-slate-950 dark:text-white">
                    {item.deviceName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.location} · {formatShortDate(item.loggedInAt)}
                  </p>
                </div>
                <StatusBadge
                  tone={item.status === 'Success' ? 'success' : item.status === 'Locked' ? 'danger' : 'warning'}
                  label={item.status}
                />
              </div>
              {item.isNewDevice && (
                <p className="text-xs text-sky-600 dark:text-sky-400">New login alert sent</p>
              )}
            </div>
          )}
        />
      </div>
    </div>
  );
}
