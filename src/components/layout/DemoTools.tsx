import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, FlaskConical, RotateCcw, ShieldAlert, SlidersHorizontal, UserCheck, X } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { TEXTS } from '../../texts';
import { AdminLevel, UserRole } from '../../types';
import { formatShortDate } from '../../utils/formatters';
import { runProfitEngineSelfTests } from '../../utils/profitEngine';
import { Button } from '../ui/Button';

const ROLE_OPTIONS: { label: string; role: UserRole; adminLevel?: AdminLevel }[] = [
  { label: 'Public Visitor', role: 'visitor' },
  { label: 'New Trader', role: 'new_trader' },
  { label: 'Professional Trader', role: 'pro_trader' },
  { label: 'Admin · Super Admin', role: 'admin', adminLevel: 'super_admin' },
  { label: 'Admin · Verifier', role: 'admin', adminLevel: 'verifier' },
  { label: 'Admin · Support', role: 'admin', adminLevel: 'support' },
  { label: 'Admin · Finance', role: 'admin', adminLevel: 'finance' },
];

export function DemoTools() {
  const {
    db,
    settings,
    currentUser,
    currentRole,
    currentAdminLevel,
    simulatedNow,
    switchRole,
    switchUser,
    advanceTimeDays,
    simulateRuleBreak,
    resetDemoData,
  } = useApp();

  const [open, setOpen] = useState(false);

  const selfTests = useMemo(() => runProfitEngineSelfTests(settings), [settings]);
  const passedCount = selfTests.filter((t) => t.passed).length;

  const activeRoleKey =
    currentRole === 'admin' ? `admin:${currentAdminLevel}` : currentRole;

  const matchingUsers =
    currentRole === 'visitor'
      ? []
      : db.users.filter((u) =>
          currentRole === 'admin'
            ? u.role === 'admin' && u.adminLevel === currentAdminLevel
            : u.role === currentRole
        );

  return (
    <>
      <div className="fixed bottom-20 md:bottom-5 left-4 z-40">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label="Open Demo Tools"
          className="min-h-[44px] inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg border bg-white/95 text-slate-900 border-slate-300 hover:bg-slate-50 dark:bg-[#0d1612]/95 dark:text-white dark:border-white/15 dark:hover:bg-[#13221b] backdrop-blur-md transition-all cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
          <span>{TEXTS.demoTools.title}</span>
          {currentUser && (
            <span className="hidden sm:inline text-slate-500 dark:text-slate-400 font-normal">
              · {currentUser.fullName.split(' ')[0]}
            </span>
          )}
        </button>
      </div>

      {open && (
        <aside
          aria-label="Demo Tools menu"
          className="fixed bottom-34 md:bottom-18 left-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-3xl p-5 shadow-2xl border bg-white text-slate-900 border-slate-200 dark:bg-[#0c1511] dark:text-white dark:border-white/15"
        >
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
              <h2 className="text-sm font-bold">{TEXTS.demoTools.title}</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close Demo Tools"
              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 space-y-4 text-sm">
            {/* Role switch */}
            <div>
              <label
                htmlFor="demo-role-select"
                className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5"
              >
                {TEXTS.demoTools.roleLabel}
              </label>
              <select
                id="demo-role-select"
                value={activeRoleKey}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('admin:')) {
                    const level = val.split(':')[1] as AdminLevel;
                    switchRole('admin', level);
                  } else {
                    switchRole(val as UserRole);
                  }
                }}
                className="min-h-[44px] w-full rounded-full px-4 py-2 text-sm bg-slate-50 border border-slate-300 text-slate-900 dark:bg-white/5 dark:border-white/15 dark:text-white"
              >
                {ROLE_OPTIONS.map((opt) => {
                  const key = opt.adminLevel ? `admin:${opt.adminLevel}` : opt.role;
                  return (
                    <option key={key} value={key} className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">
                      {opt.label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* User switch */}
            {matchingUsers.length > 0 && (
              <div>
                <label
                  htmlFor="demo-user-select"
                  className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5"
                >
                  {TEXTS.demoTools.userLabel}
                </label>
                <select
                  id="demo-user-select"
                  value={currentUser?.id ?? ''}
                  onChange={(e) => switchUser(e.target.value || null)}
                  className="min-h-[44px] w-full rounded-full px-4 py-2 text-sm bg-slate-50 border border-slate-300 text-slate-900 dark:bg-white/5 dark:border-white/15 dark:text-white"
                >
                  {matchingUsers.map((u) => (
                    <option key={u.id} value={u.id} className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">
                      {u.fullName} ({u.kycStatus.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Simulated clock placeholder */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3 bg-slate-50/70 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300 mb-2">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
                  {TEXTS.demoTools.timeLabel}
                </span>
                <span className="font-mono tabular-nums">
                  {formatShortDate(simulatedNow.toISOString())}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => advanceTimeDays(7)}
                  className="flex-1 min-h-[38px] rounded-full text-xs font-medium border border-slate-300 dark:border-white/15 hover:bg-slate-200/60 dark:hover:bg-white/10 cursor-pointer"
                >
                  {TEXTS.demoTools.plus7Days}
                </button>
                <button
                  type="button"
                  onClick={() => advanceTimeDays(30)}
                  className="flex-1 min-h-[38px] rounded-full text-xs font-medium border border-slate-300 dark:border-white/15 hover:bg-slate-200/60 dark:hover:bg-white/10 cursor-pointer"
                >
                  {TEXTS.demoTools.plus1Month}
                </button>
              </div>
            </div>

            {/* Profit engine self-test status */}
            <Link
              to="/calculator"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-white/10 px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                <FlaskConical className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                <span>Profit Engine Self-Test</span>
              </span>
              <span
                className={`font-mono font-semibold ${
                  passedCount === selfTests.length
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {passedCount}/{selfTests.length} Pass →
              </span>
            </Link>

            {/* Simulate Rule Break */}
            <button
              type="button"
              onClick={() => {
                simulateRuleBreak();
                setOpen(false);
              }}
              className="w-full min-h-[40px] flex items-center justify-between gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-500/20 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                <span>Simulate rule break</span>
              </span>
              <span className="text-[11px] text-red-300">Auto-pause</span>
            </button>

            {/* Reset button */}
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => {
                resetDemoData();
                setOpen(false);
              }}
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>{TEXTS.demoTools.resetButton}</span>
            </Button>
          </div>
        </aside>
      )}
    </>
  );
}
