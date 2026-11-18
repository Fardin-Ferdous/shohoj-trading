import React, { useMemo, useState } from 'react';
import { Ban, CheckCircle2, Search, ShieldCheck, UserCog } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { AdminLevel, User, UserRole } from '../../types';
import { formatShortDate } from '../../utils/formatters';
import { UserAvatar } from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/States';

export function AdminUsersPage() {
  const {
    db,
    currentUser,
    currentRole,
    currentAdminLevel,
    switchRole,
    adminChangeUserRole,
    adminSetUserSuspension,
    simulateKycDecision,
  } = useApp();

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Exclude<UserRole, 'visitor'>>('all');
  const [kycFilter, setKycFilter] = useState<'all' | User['kycStatus']>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Modal state
  const [nextRole, setNextRole] = useState<Exclude<UserRole, 'visitor'>>('new_trader');
  const [nextAdminLevel, setNextAdminLevel] = useState<AdminLevel>('support');
  const [suspendReason, setSuspendReason] = useState('');
  const [kycRejectReason, setKycRejectReason] = useState('');
  const [actionError, setActionError] = useState('');

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (kycFilter !== 'all' && u.kycStatus !== kycFilter) return false;
      if (q) {
        const match =
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.country.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [db.users, query, roleFilter, kycFilter]);

  const selectedUser = useMemo(
    () => db.users.find((u) => u.id === selectedUserId) ?? null,
    [db.users, selectedUserId]
  );

  const selectedKyc = useMemo(
    () => db.kycRecords.find((k) => k.userId === selectedUserId),
    [db.kycRecords, selectedUserId]
  );

  const selectedBroker = useMemo(
    () => db.brokerLinks.find((b) => b.userId === selectedUserId),
    [db.brokerLinks, selectedUserId]
  );

  const selectedLogins = useMemo(
    () => db.loginHistory.filter((l) => l.userId === selectedUserId).slice(0, 5),
    [db.loginHistory, selectedUserId]
  );

  if (!currentUser || currentRole !== 'admin') {
    return (
      <EmptyState
        title="Admin access only"
        message="Switch to an Admin level to manage users and inspect KYC."
        actionLabel="Switch to Super Admin (Demo)"
        onAction={() => switchRole('admin', 'super_admin')}
      />
    );
  }

  const openManageModal = (u: User) => {
    setSelectedUserId(u.id);
    setNextRole(u.role);
    setNextAdminLevel(u.adminLevel ?? 'support');
    setSuspendReason(u.suspendReason ?? '');
    setKycRejectReason('');
    setActionError('');
  };

  const canEditRoles = currentAdminLevel === 'super_admin';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">
          Admin · Users Directory
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white">
          Users & KYC Inspection
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Search accounts, review ID check (KYC) records, update roles, or suspend/restore accounts with a recorded reason.
        </p>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, or country..."
              className="min-h-[44px] w-full rounded-full pl-11 pr-4 text-sm bg-white/5 text-white border border-white/15 focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
              className="min-h-[44px] w-full rounded-full px-4 text-sm bg-white/5 text-white border border-white/15"
            >
              <option value="all" className="bg-[#0d1612]">All Roles</option>
              <option value="new_trader" className="bg-[#0d1612]">New Traders</option>
              <option value="pro_trader" className="bg-[#0d1612]">Professional Traders</option>
              <option value="admin" className="bg-[#0d1612]">Admins</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Filter by KYC"
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value as typeof kycFilter)}
              className="min-h-[44px] w-full rounded-full px-4 text-sm bg-white/5 text-white border border-white/15"
            >
              <option value="all" className="bg-[#0d1612]">All KYC Statuses</option>
              <option value="approved" className="bg-[#0d1612]">KYC Approved</option>
              <option value="in_review" className="bg-[#0d1612]">KYC In Review</option>
              <option value="not_started" className="bg-[#0d1612]">KYC Not Started</option>
              <option value="rejected" className="bg-[#0d1612]">KYC Rejected</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table (Desktop) & Cards (Mobile) */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          title="No matching users"
          message="Try clearing your search box or filters."
          actionLabel="Clear filters"
          onAction={() => {
            setQuery('');
            setRoleFilter('all');
            setKycFilter('all');
          }}
        />
      ) : (
        <Card padding="sm" className="overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-400">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">KYC</th>
                  <th className="py-3 px-4">Account State</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.03]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar src={u.avatarUrl} name={u.fullName} size="sm" />
                        <div>
                          <p className="font-semibold text-white">{u.fullName}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-300">
                      {u.role === 'admin'
                        ? `Admin · ${u.adminLevel?.replace('_', ' ')}`
                        : u.role.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{u.country}</td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        tone={
                          u.kycStatus === 'approved'
                            ? 'success'
                            : u.kycStatus === 'rejected'
                            ? 'danger'
                            : u.kycStatus === 'in_review'
                            ? 'info'
                            : 'neutral'
                        }
                        label={u.kycStatus.replace('_', ' ')}
                      />
                    </td>
                    <td className="py-3 px-4">
                      {u.isSuspended ? (
                        <StatusBadge tone="danger" label="Suspended" />
                      ) : (
                        <StatusBadge tone="success" label="Active" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="secondary" onClick={() => openManageModal(u)}>
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-white/10">
            {filteredUsers.map((u) => (
              <div key={u.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar src={u.avatarUrl} name={u.fullName} size="sm" />
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{u.fullName}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => openManageModal(u)}>
                    Inspect
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge
                    tone="neutral"
                    label={
                      u.role === 'admin'
                        ? `Admin: ${u.adminLevel?.replace('_', ' ')}`
                        : u.role.replace('_', ' ')
                    }
                  />
                  <StatusBadge
                    tone={u.kycStatus === 'approved' ? 'success' : u.kycStatus === 'rejected' ? 'danger' : 'info'}
                    label={`KYC: ${u.kycStatus.replace('_', ' ')}`}
                  />
                  {u.isSuspended && <StatusBadge tone="danger" label="Suspended" />}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* User Detail & Management Modal */}
      <Modal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUserId(null)}
        title={selectedUser ? `Inspect User · ${selectedUser.fullName}` : 'User Detail'}
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-5 text-sm max-h-[75vh] overflow-y-auto pr-1">
            <div className="flex items-center gap-3.5 pb-4 border-b border-white/10">
              <UserAvatar src={selectedUser.avatarUrl} name={selectedUser.fullName} size="md" />
              <div>
                <p className="font-semibold text-white">{selectedUser.fullName}</p>
                <p className="text-xs text-slate-400">
                  {selectedUser.email} · {selectedUser.country} · Joined{' '}
                  {formatShortDate(selectedUser.createdAt)}
                </p>
              </div>
            </div>

            {/* KYC Details */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-white inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>KYC Verification Record</span>
                </p>
                <StatusBadge
                  tone={
                    selectedUser.kycStatus === 'approved'
                      ? 'success'
                      : selectedUser.kycStatus === 'rejected'
                      ? 'danger'
                      : 'info'
                  }
                  label={selectedUser.kycStatus.replace('_', ' ')}
                />
              </div>

              {selectedKyc ? (
                <div className="text-xs text-slate-300 space-y-1">
                  <p>ID Doc: {selectedKyc.idDocumentType ?? 'Document'} ({selectedKyc.idDocumentName ?? 'sample_id.jpg'})</p>
                  <p>Selfie: {selectedKyc.selfieFileName ?? 'selfie_demo.png'}</p>
                  <p>Address: {selectedKyc.addressLine ?? 'On file'}, {selectedKyc.country ?? selectedUser.country}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No uploaded KYC files yet (Status: {selectedUser.kycStatus.replace('_', ' ')}).
                </p>
              )}

              {(currentAdminLevel === 'super_admin' || currentAdminLevel === 'verifier') && (
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => simulateKycDecision(selectedUser.id, 'approved')}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve KYC</span>
                  </Button>
                  <input
                    type="text"
                    value={kycRejectReason}
                    onChange={(e) => setKycRejectReason(e.target.value)}
                    placeholder="Rejection reason..."
                    className="min-h-[36px] flex-1 min-w-[160px] rounded-full px-3 text-xs bg-white/5 text-white border border-white/15"
                  />
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      simulateKycDecision(
                        selectedUser.id,
                        'rejected',
                        kycRejectReason.trim() || 'Document unclear — please upload a clear ID photo.'
                      )
                    }
                  >
                    Reject KYC
                  </Button>
                </div>
              )}
            </div>

            {/* Broker & Login Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                <p className="font-semibold text-white mb-1">Broker Link (Masked)</p>
                {selectedBroker ? (
                  <p className="text-slate-300">
                    {selectedBroker.accountNumberMasked} · {selectedBroker.accountType} ($
                    {selectedBroker.balanceUsd})
                  </p>
                ) : (
                  <p className="text-slate-400">No New-Trader broker link stored.</p>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                <p className="font-semibold text-white mb-1">Security & Recent Logins</p>
                <p className="text-slate-300">
                  2-Step Login: {selectedUser.twoFactorEnabled ? 'On' : 'Off'} ·{' '}
                  {selectedLogins.length} recent record(s)
                </p>
              </div>
            </div>

            {/* Change Role (Super Admin only) */}
            {canEditRoles && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <p className="font-semibold text-white inline-flex items-center gap-1.5">
                  <UserCog className="w-4 h-4 text-emerald-400" />
                  <span>Change Role / Admin Level</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={nextRole}
                    onChange={(e) => setNextRole(e.target.value as Exclude<UserRole, 'visitor'>)}
                    className="min-h-[40px] rounded-full px-4 text-xs bg-white/5 text-white border border-white/15"
                  >
                    <option value="new_trader" className="bg-[#0d1612]">New Trader</option>
                    <option value="pro_trader" className="bg-[#0d1612]">Professional Trader</option>
                    <option value="admin" className="bg-[#0d1612]">Admin</option>
                  </select>

                  {nextRole === 'admin' && (
                    <select
                      value={nextAdminLevel}
                      onChange={(e) => setNextAdminLevel(e.target.value as AdminLevel)}
                      className="min-h-[40px] rounded-full px-4 text-xs bg-white/5 text-white border border-white/15"
                    >
                      <option value="super_admin" className="bg-[#0d1612]">Super Admin</option>
                      <option value="verifier" className="bg-[#0d1612]">Verifier</option>
                      <option value="support" className="bg-[#0d1612]">Support</option>
                      <option value="finance" className="bg-[#0d1612]">Finance</option>
                    </select>
                  )}

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const res = adminChangeUserRole(
                        selectedUser.id,
                        nextRole,
                        nextRole === 'admin' ? nextAdminLevel : undefined
                      );
                      if (!res.ok) setActionError(res.error ?? 'Failed');
                    }}
                  >
                    Save Role
                  </Button>
                </div>
              </div>
            )}

            {/* Suspend / Restore */}
            <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-4 space-y-3">
              <p className="font-semibold text-white inline-flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-red-400" />
                <span>{selectedUser.isSuspended ? 'Account is Suspended' : 'Suspend Account'}</span>
              </p>

              {selectedUser.isSuspended ? (
                <div className="space-y-2">
                  <p className="text-xs text-red-300">
                    Reason: {selectedUser.suspendReason ?? 'Suspended by Admin'}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      adminSetUserSuspension(selectedUser.id, false);
                      setActionError('');
                    }}
                  >
                    Unsuspend & Restore User
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <Input
                    label="Suspension reason (required)"
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="Example: Misleading profile details or unpaid fee"
                  />
                  {actionError && <p className="text-xs text-red-400">{actionError}</p>}
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      const res = adminSetUserSuspension(selectedUser.id, true, suspendReason);
                      if (!res.ok) {
                        setActionError(res.error ?? 'Reason required.');
                      } else {
                        setActionError('');
                      }
                    }}
                  >
                    Suspend User
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
