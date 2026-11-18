import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertOctagon,
  ArrowRight,
  FileCheck2,
  Link2,
  Scale,
  Settings,
  ShieldAlert,
  Users,
  Wallet,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../../store/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { UserAvatar } from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/States';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { db, currentUser, currentRole, currentAdminLevel, switchRole } = useApp();

  const metrics = useMemo(() => {
    const suspendedCount = db.users.filter((u) => u.isSuspended).length;
    const pendingVerifyCount = db.traderProfiles.filter(
      (p) => !p.isApproved && p.proAccountLink?.reviewStatus !== 'rejected'
    ).length;
    const activeConns = db.connections.filter((c) => c.status === 'active').length;
    const pausedConns = db.connections.filter((c) => c.status === 'paused').length;
    const openDisputes = db.disputes.filter((d) => d.status !== 'resolved').length;
    const openFraud = db.fraudSignals.filter((f) => f.status === 'open').length;
    const pendingSettings = db.settingChanges.filter((s) => s.status === 'pending_approval').length;

    const commissionDue = db.invoices
      .filter((i) => i.status !== 'paid')
      .reduce((acc, i) => acc + i.amountUsd, 0);
    const commissionPaid = db.invoices
      .filter((i) => i.status === 'paid')
      .reduce((acc, i) => acc + i.amountUsd, 0);

    const chartData = [
      { label: 'Active', count: activeConns },
      { label: 'Paused', count: pausedConns },
      { label: 'Pending', count: db.connections.filter((c) => c.status === 'pending').length },
      { label: 'Done', count: db.connections.filter((c) => c.status === 'completed').length },
      { label: 'Disputes', count: openDisputes },
    ];

    return {
      totalUsers: db.users.length,
      suspendedCount,
      pendingVerifyCount,
      activeConns,
      openDisputes,
      openFraud,
      pendingSettings,
      commissionDue,
      commissionPaid,
      chartData,
    };
  }, [db]);

  if (!currentUser || currentRole !== 'admin') {
    return (
      <EmptyState
        title="Admin access only"
        message="Switch to any Admin level in Demo Tools or log in with an Admin account to open the Admin Control Center."
        actionLabel="Switch to Super Admin (Demo)"
        onAction={() => switchRole('admin', 'super_admin')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <UserAvatar src={currentUser.avatarUrl} name={currentUser.fullName} size="lg" />
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">
              Admin Control Center · {currentAdminLevel?.replace('_', ' ')}
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white">
              Welcome, {currentUser.fullName}
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Your menu shows only tools matching your admin level. All actions write to the read-only Audit Log.
            </p>
          </div>
        </div>

        <StatusBadge
          tone="success"
          label={`Level: ${currentAdminLevel?.replace('_', ' ').toUpperCase()}`}
        />
      </div>

      {/* Pending Approvals / Safety Alerts */}
      {(metrics.pendingSettings > 0 || metrics.openFraud > 0 || metrics.suspendedCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {metrics.pendingSettings > 0 && (
            <Link to="/admin/settings" className="block">
              <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 flex items-center justify-between gap-3 hover:bg-amber-500/15 transition-colors">
                <div>
                  <p className="text-xs font-semibold text-amber-300">
                    {metrics.pendingSettings} Setting(s) Pending Approval
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5">Needs second Super Admin check</p>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-300 shrink-0" />
              </div>
            </Link>
          )}
          {metrics.openFraud > 0 && (
            <Link to="/admin/fraud" className="block">
              <div className="rounded-2xl border border-red-500/35 bg-red-500/10 p-4 flex items-center justify-between gap-3 hover:bg-red-500/15 transition-colors">
                <div>
                  <p className="text-xs font-semibold text-red-300">
                    {metrics.openFraud} Open Fraud Signal(s)
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5">Review odd stats & multi-device logs</p>
                </div>
                <ArrowRight className="w-4 h-4 text-red-300 shrink-0" />
              </div>
            </Link>
          )}
          {metrics.suspendedCount > 0 && (
            <Link to="/admin/users" className="block">
              <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 flex items-center justify-between gap-3 hover:bg-white/[0.07] transition-colors">
                <div>
                  <p className="text-xs font-semibold text-white">
                    {metrics.suspendedCount} Suspended Account(s)
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Inspect reason or restore access</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card padding="sm">
          <p className="text-xs text-slate-400">Total Users</p>
          <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
            {metrics.totalUsers}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {metrics.suspendedCount} suspended
          </p>
        </Card>

        <Card padding="sm">
          <p className="text-xs text-slate-400">Pending Reviews</p>
          <p className="mt-1 font-mono text-2xl font-bold text-amber-400 tabular-nums">
            {metrics.pendingVerifyCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Trader queue</p>
        </Card>

        <Card padding="sm">
          <p className="text-xs text-slate-400">Active Connections</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
            {metrics.activeConns}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Live tracking</p>
        </Card>

        <Card padding="sm">
          <p className="text-xs text-slate-400">Commission Due</p>
          <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
            {formatCurrency(metrics.commissionDue)}
          </p>
          <p className="text-[11px] text-emerald-400 mt-0.5">
            Paid: {formatCurrency(metrics.commissionPaid)}
          </p>
        </Card>

        <Card padding="sm" className="col-span-2 lg:col-span-1">
          <p className="text-xs text-slate-400">Open Disputes</p>
          <p className="mt-1 font-mono text-2xl font-bold text-red-400 tabular-nums">
            {metrics.openDisputes}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {db.reports.filter((r) => r.status === 'open').length} open reports
          </p>
        </Card>
      </div>

      {/* Chart + Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card padding="lg" className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Platform Connection Activity
              </h2>
              <p className="text-xs text-slate-400">
                Breakdown of active, paused, pending, completed connections and open disputes.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/connections')}>
              <span>View all</span>
            </Button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0c1612',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Bar dataKey="count" fill="#4ade80" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="lg" className="lg:col-span-5 space-y-4">
          <h2 className="font-display text-lg font-bold text-white">Quick Admin Tools</h2>
          <div className="space-y-2.5">
            {(currentAdminLevel === 'super_admin' || currentAdminLevel === 'verifier') && (
              <Link
                to="/admin/verify"
                className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileCheck2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">Verification Queue</p>
                    <p className="text-xs text-slate-400">
                      {metrics.pendingVerifyCount} trader(s) waiting for check
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            )}

            {(currentAdminLevel === 'super_admin' ||
              currentAdminLevel === 'verifier' ||
              currentAdminLevel === 'support') && (
              <Link
                to="/admin/users"
                className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">Users & KYC Records</p>
                    <p className="text-xs text-slate-400">Inspect accounts, roles, suspensions</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            )}

            {(currentAdminLevel === 'super_admin' || currentAdminLevel === 'support') && (
              <>
                <Link
                  to="/admin/disputes"
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Scale className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-sm font-semibold text-white">Disputes & Reports</p>
                      <p className="text-xs text-slate-400">
                        {metrics.openDisputes} active case(s) to resolve
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </Link>

                <Link
                  to="/admin/connections"
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Link2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-sm font-semibold text-white">Connections Monitor</p>
                      <p className="text-xs text-slate-400">View timelines, pause or end access</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </Link>
              </>
            )}

            {(currentAdminLevel === 'super_admin' || currentAdminLevel === 'finance') && (
              <Link
                to="/admin/finance"
                className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">Finance & Invoices</p>
                    <p className="text-xs text-slate-400">Commission ledger, overdue flow, CSV</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            )}

            {currentAdminLevel === 'super_admin' && (
              <>
                <Link
                  to="/admin/settings"
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-sm font-semibold text-white">Settings & Legal Content</p>
                      <p className="text-xs text-slate-400">
                        Edit platform rules, fees & approval queue
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </Link>

                <Link
                  to="/admin/fraud"
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <AlertOctagon className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-sm font-semibold text-white">Fraud & Launch Readiness</p>
                      <p className="text-xs text-slate-400">Signals, audit trail & open questions</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </Link>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Note on security */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex items-start gap-3 text-xs text-slate-400">
        <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p>
          Admin login requires two-step verification. Changing Settings updates new screens only — signed agreement snapshots for existing connections are never altered.
        </p>
      </div>
    </div>
  );
}
