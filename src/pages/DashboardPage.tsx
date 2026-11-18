import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, Link2, ShieldCheck } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatCurrency } from '../utils/formatters';
import { UserAvatar } from '../components/ui/Avatar';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { RiskWarningNotice } from '../components/ui/RiskBanner';
import { EmptyState } from '../components/ui/States';
import { ActiveConnectionsBoard } from '../components/connections/ActiveConnectionsBoard';

export function DashboardPage() {
  const navigate = useNavigate();
  const { db, settings, currentUser, currentRole } = useApp();

  if (!currentUser) {
    return (
      <EmptyState
        title="Welcome to Shohoj Trading"
        message="Log in, create an account, or use Demo Tools to preview any user dashboard."
        actionLabel="Log in"
        onAction={() => navigate('/login')}
      />
    );
  }

  const brokerLink = db.brokerLinks.find((b) => b.userId === currentUser.id);
  const myConnections = db.connections.filter(
    (c) => c.newTraderId === currentUser.id || c.proTraderId === currentUser.id
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <UserAvatar
            src={currentUser.avatarUrl}
            name={currentUser.fullName}
            size="lg"
          />
          <div>
            <p className="text-xs font-medium text-emerald-400 capitalize">
              {currentRole.replace('_', ' ')} Workspace
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white">
              Hello, {currentUser.fullName}
            </h1>
            <p className="mt-1 text-sm sm:text-base text-slate-300">
              Track your live connections, safety limits, and readiness steps below.
            </p>
          </div>
        </div>

        <StatusBadge
          tone={
            currentUser.kycStatus === 'approved'
              ? 'success'
              : currentUser.kycStatus === 'rejected'
              ? 'danger'
              : currentUser.kycStatus === 'in_review'
              ? 'info'
              : 'neutral'
          }
          label={`KYC: ${currentUser.kycStatus.replace('_', ' ')}`}
        />
      </div>

      <RiskWarningNotice />

      {/* Phase 7 Live Connection Monitoring */}
      {(currentRole === 'new_trader' || currentRole === 'pro_trader') && (
        <ActiveConnectionsBoard />
      )}

      {/* Role-aware Onboarding & Next Steps */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-white">Account Readiness Steps</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-emerald-400">STEP 01</span>
                {currentUser.kycStatus === 'approved' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" aria-hidden="true" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-500" aria-hidden="true" />
                )}
              </div>
              <h3 className="font-display text-lg font-semibold text-white">
                Identity check (KYC)
              </h3>
              <p className="text-sm text-slate-300">
                Status:{' '}
                <span className="font-medium capitalize">
                  {currentUser.kycStatus.replace('_', ' ')}
                </span>
                .{currentUser.kycNote ? ` ${currentUser.kycNote}` : ''}
              </p>
            </div>
            <Link to="/kyc">
              <Button variant="secondary" size="sm" fullWidth>
                <span>{currentUser.kycStatus === 'approved' ? 'View KYC' : 'Complete KYC'}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            </Link>
          </Card>

          {currentRole === 'new_trader' ? (
            <Card className="flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-emerald-400">STEP 02</span>
                  {brokerLink ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" aria-hidden="true" />
                  ) : (
                    <Link2 className="w-5 h-5 text-slate-400" aria-hidden="true" />
                  )}
                </div>
                <h3 className="font-display text-lg font-semibold text-white">
                  Link Exness MT5 account
                </h3>
                <p className="text-sm text-slate-300">
                  {brokerLink
                    ? `${brokerLink.accountNumberMasked} · Balance ${formatCurrency(brokerLink.balanceUsd)}`
                    : `Minimum balance ${formatCurrency(settings.minDepositUsd)}. No master password needed.`}
                </p>
              </div>
              <Link to="/profile">
                <Button variant="secondary" size="sm" fullWidth>
                  <span>{brokerLink ? 'Manage Broker Account' : 'Link Exness Account'}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Button>
              </Link>
            </Card>
          ) : (
            <Card className="flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <span className="font-mono text-xs text-emerald-400">STEP 02</span>
                <h3 className="font-display text-lg font-semibold text-white">
                  Trader verification & profile
                </h3>
                <p className="text-sm text-slate-300">
                  Requires {settings.minHistoryMonths} months and {settings.minTradeCount} real trades.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Link to="/profile-editor">
                  <Button variant="secondary" size="sm" fullWidth>
                    <span>Onboarding & Profile Editor</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </Link>
                {(() => {
                  const proProfile = db.traderProfiles.find((p) => p.userId === currentUser.id);
                  return proProfile ? (
                    <Link
                      to={`/traders/${proProfile.id}`}
                      className="text-center text-xs font-medium text-emerald-400 hover:underline"
                    >
                      View public profile →
                    </Link>
                  ) : null;
                })()}
              </div>
            </Card>
          )}

          <Card className="flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-emerald-400">STEP 03</span>
                <ShieldCheck className="w-5 h-5 text-emerald-500" aria-hidden="true" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white">Account security</h3>
              <p className="text-sm text-slate-300">
                Two-step login is {currentUser.twoFactorEnabled ? 'On' : 'Off'}. Total connections:{' '}
                <span className="font-mono font-semibold">{myConnections.length}</span>.
              </p>
            </div>
            <Link to="/security">
              <Button variant="secondary" size="sm" fullWidth>
                <span>Review Security</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
