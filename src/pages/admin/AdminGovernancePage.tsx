import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Lock,
  Search,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { LaunchChecklistItem, LaunchItemStatus } from '../../types';
import { formatShortDate } from '../../utils/formatters';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/States';

type GovernanceTab = 'fraud' | 'audit' | 'launch';

export function AdminGovernancePage({
  defaultTab = 'fraud',
}: {
  defaultTab?: GovernanceTab;
}) {
  const {
    db,
    currentUser,
    currentRole,
    switchRole,
    adminMarkFraudChecked,
    adminUpdateLaunchItem,
  } = useApp();

  const [tab, setTab] = useState<GovernanceTab>(defaultTab);
  const [auditQuery, setAuditQuery] = useState('');
  const [auditRoleFilter, setAuditRoleFilter] = useState('all');
  const [launchCategory, setLaunchCategory] = useState<'all' | LaunchChecklistItem['category']>('all');
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [statusDraft, setStatusDraft] = useState<Record<string, LaunchItemStatus>>({});

  const filteredAudit = useMemo(() => {
    const q = auditQuery.trim().toLowerCase();
    return db.auditLog.filter((entry) => {
      if (auditRoleFilter !== 'all' && !entry.actorRole.toLowerCase().includes(auditRoleFilter)) {
        return false;
      }
      if (q) {
        return (
          entry.actorName.toLowerCase().includes(q) ||
          entry.action.toLowerCase().includes(q) ||
          entry.target.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [db.auditLog, auditQuery, auditRoleFilter]);

  const filteredLaunch = useMemo(() => {
    if (launchCategory === 'all') return db.launchChecklist;
    return db.launchChecklist.filter((i) => i.category === launchCategory);
  }, [db.launchChecklist, launchCategory]);

  const launchDoneCount = db.launchChecklist.filter((i) => i.status === 'done').length;

  if (!currentUser || currentRole !== 'admin') {
    return (
      <EmptyState
        title="Admin Governance access only"
        message="Switch to an Admin level in Demo Tools to inspect Fraud Signals, Audit Log, and Launch Checklist."
        actionLabel="Switch to Super Admin (Demo)"
        onAction={() => switchRole('admin', 'super_admin')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">
            Admin · Trust, Audit & Launch Readiness
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white">
            {tab === 'fraud'
              ? 'Fraud & Abuse Signals'
              : tab === 'audit'
              ? 'Read-Only Audit Log'
              : 'Launch Checklist & Open Questions'}
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Monitor safety alerts, review immutable platform actions, and track legal/broker blockers before real launch.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              {
                key: 'fraud',
                label: `Fraud Signals (${db.fraudSignals.filter((f) => f.status === 'open').length})`,
                icon: <AlertOctagon className="w-3.5 h-3.5" />,
              },
              {
                key: 'audit',
                label: `Audit Log (${db.auditLog.length})`,
                icon: <FileText className="w-3.5 h-3.5" />,
              },
              {
                key: 'launch',
                label: `Launch (${launchDoneCount}/${db.launchChecklist.length})`,
                icon: <ClipboardCheck className="w-3.5 h-3.5" />,
              },
            ] as { key: GovernanceTab; label: string; icon: React.ReactNode }[]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`min-h-[38px] px-3.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                tab === t.key
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-white/6 text-slate-300 border border-white/10'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: FRAUD SIGNALS */}
      {tab === 'fraud' && (
        <div className="space-y-4">
          {db.fraudSignals.map((sig) => (
            <Card key={sig.id} padding="lg" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    tone={
                      sig.severity === 'high'
                        ? 'danger'
                        : sig.severity === 'medium'
                        ? 'warning'
                        : 'info'
                    }
                    label={`${sig.severity.toUpperCase()} RISK`}
                  />
                  <StatusBadge
                    tone={sig.status === 'checked' ? 'success' : 'warning'}
                    label={sig.status === 'checked' ? 'Checked' : 'Needs Review'}
                  />
                  <span className="text-xs text-slate-400">{formatShortDate(sig.detectedAt)}</span>
                </div>
                <h2 className="font-display text-base font-bold text-white">
                  {sig.signalType} — {sig.userName}
                </h2>
                <p className="text-sm text-slate-300">{sig.description}</p>
                {sig.checkedBy && (
                  <p className="text-xs text-emerald-400">Checked by {sig.checkedBy}</p>
                )}
              </div>

              {sig.status === 'open' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => adminMarkFraudChecked(sig.id)}
                  className="shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark checked</span>
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* TAB 2: STRICTLY READ-ONLY AUDIT LOG */}
      {tab === 'audit' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 flex items-center gap-3 text-xs text-emerald-200">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <p>
              <strong>Read-Only Audit Trail:</strong> Every important platform action is recorded here. Edit and delete buttons do not exist so records stay honest.
            </p>
          </div>

          <Card padding="sm" className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditQuery}
                onChange={(e) => setAuditQuery(e.target.value)}
                placeholder="Search actor, action, or target..."
                className="min-h-[42px] w-full rounded-full pl-11 pr-4 text-sm bg-white/5 text-white border border-white/15"
              />
            </div>
            <select
              aria-label="Filter audit by actor role"
              value={auditRoleFilter}
              onChange={(e) => setAuditRoleFilter(e.target.value)}
              className="min-h-[42px] rounded-full px-4 text-sm bg-white/5 text-white border border-white/15"
            >
              <option value="all" className="bg-[#0d1612]">All Actors</option>
              <option value="admin" className="bg-[#0d1612]">Admins</option>
              <option value="trader" className="bg-[#0d1612]">Traders</option>
              <option value="automated" className="bg-[#0d1612]">Automated / System</option>
            </select>
          </Card>

          <Card padding="sm" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {filteredAudit.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {formatShortDate(entry.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">{entry.actorName}</td>
                      <td className="py-3 px-4 text-slate-300">{entry.actorRole}</td>
                      <td className="py-3 px-4 text-slate-200">{entry.action}</td>
                      <td className="py-3 px-4 font-mono text-emerald-400">{entry.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: LAUNCH CHECKLIST (SECTION M) */}
      {tab === 'launch' && (
        <div className="space-y-4">
          <Card padding="sm" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'Open Question', 'Compliance & Docs', 'Security & Launch'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setLaunchCategory(cat)}
                  className={`min-h-[36px] px-3.5 rounded-full text-xs font-semibold cursor-pointer ${
                    launchCategory === cat
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-white/6 text-slate-300 border border-white/10'
                  }`}
                >
                  {cat === 'all' ? 'All Items' : cat}
                </button>
              ))}
            </div>

            <p className="text-xs font-mono text-emerald-400">
              {launchDoneCount} of {db.launchChecklist.length} Ready
            </p>
          </Card>

          <div className="space-y-3">
            {filteredLaunch.map((item) => {
              const curStatus = statusDraft[item.id] ?? item.status;
              const curNotes = notesDraft[item.id] ?? item.notes;
              return (
                <Card key={item.id} padding="lg" className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                        {item.category}
                      </span>
                      <h2 className="font-display text-base font-bold text-white">{item.title}</h2>
                    </div>

                    <select
                      aria-label={`Status for ${item.title}`}
                      value={curStatus}
                      onChange={(e) =>
                        setStatusDraft((prev) => ({
                          ...prev,
                          [item.id]: e.target.value as LaunchItemStatus,
                        }))
                      }
                      className="min-h-[38px] rounded-full px-3.5 text-xs font-semibold bg-white/5 text-white border border-white/15"
                    >
                      <option value="not_started" className="bg-[#0d1612]">Not started</option>
                      <option value="in_progress" className="bg-[#0d1612]">In progress</option>
                      <option value="done" className="bg-[#0d1612]">Done</option>
                    </select>
                  </div>

                  <textarea
                    rows={2}
                    value={curNotes}
                    onChange={(e) =>
                      setNotesDraft((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    placeholder="Add legal, Exness, or security notes..."
                    className="w-full rounded-2xl px-4 py-2.5 text-xs bg-white/5 text-slate-200 border border-white/15 focus:outline-none focus:border-emerald-400"
                  />

                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge
                      tone={
                        item.status === 'done'
                          ? 'success'
                          : item.status === 'in_progress'
                          ? 'info'
                          : 'warning'
                      }
                      label={`Saved: ${item.status.replace('_', ' ')}`}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => adminUpdateLaunchItem(item.id, curStatus, curNotes)}
                    >
                      Save Item
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
