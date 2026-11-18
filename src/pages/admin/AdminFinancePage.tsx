import React, { useMemo, useState } from 'react';
import { CheckCircle2, Download, ShieldAlert } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { InvoiceStatus } from '../../types';
import { formatCurrency, formatShortDate } from '../../utils/formatters';
import { UserAvatar } from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/States';

export function AdminFinancePage() {
  const {
    db,
    currentUser,
    currentRole,
    switchRole,
    advanceUnpaidInvoiceStep,
    payCommissionInvoice,
    pushToast,
  } = useApp();

  const [invFilter, setInvFilter] = useState<'all' | InvoiceStatus>('all');

  const summary = useMemo(() => {
    const paid = db.invoices.filter((i) => i.status === 'paid').reduce((a, b) => a + b.amountUsd, 0);
    const due = db.invoices.filter((i) => i.status === 'due').reduce((a, b) => a + b.amountUsd, 0);
    const overdue = db.invoices
      .filter((i) => i.status === 'overdue')
      .reduce((a, b) => a + b.amountUsd, 0);
    const totalEligible = db.settlements.reduce((a, b) => a + b.eligibleProfitUsd, 0);
    return { paid, due, overdue, totalEligible };
  }, [db.invoices, db.settlements]);

  const filteredInvoices = useMemo(() => {
    if (invFilter === 'all') return db.invoices;
    return db.invoices.filter((i) => i.status === invFilter);
  }, [db.invoices, invFilter]);

  if (!currentUser || currentRole !== 'admin') {
    return (
      <EmptyState
        title="Admin Finance access only"
        message="Switch to Finance or Super Admin in Demo Tools to inspect commissions, invoices, and settlements."
        actionLabel="Switch to Finance Admin (Demo)"
        onAction={() => switchRole('admin', 'finance')}
      />
    );
  }

  const handleExportCsv = () => {
    const headers = ['InvoiceID', 'SettlementID', 'ConnectionID', 'ProTrader', 'AmountUSD', 'Status', 'UnpaidStage', 'IssuedAt'];
    const rows = db.invoices.map((inv) => {
      const pro = db.users.find((u) => u.id === inv.proTraderId);
      return [
        inv.id,
        inv.settlementId,
        inv.connectionId,
        `"${pro?.fullName ?? inv.proTraderId}"`,
        inv.amountUsd.toFixed(2),
        inv.status,
        inv.unpaidStage,
        inv.issuedAt,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shohoj-trading-commission-report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    pushToast('Exported commission CSV report (demo).', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">
            Admin · Finance & Commission
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white">
            Commission, Invoices & Settlements
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Track platform commission invoices, overdue collection steps, settlements, and export demo CSV ledgers.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={handleExportCsv}>
          <Download className="w-4 h-4" />
          <span>Export CSV (Demo)</span>
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm">
          <p className="text-xs text-slate-400">Commission Paid</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
            {formatCurrency(summary.paid)}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-slate-400">Commission Due</p>
          <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
            {formatCurrency(summary.due)}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-slate-400">Overdue Unpaid</p>
          <p className="mt-1 font-mono text-2xl font-bold text-red-400 tabular-nums">
            {formatCurrency(summary.overdue)}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-slate-400">Eligible Settled Profit</p>
          <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
            {formatCurrency(summary.totalEligible)}
          </p>
        </Card>
      </div>

      {/* Invoices List */}
      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <h2 className="font-display text-lg font-bold text-white">Commission Invoices</h2>
          <div className="flex gap-1.5">
            {(['all', 'due', 'overdue', 'paid'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setInvFilter(st)}
                className={`min-h-[36px] px-3.5 rounded-full text-xs font-semibold capitalize cursor-pointer ${
                  invFilter === st
                    ? 'bg-emerald-400 text-slate-950'
                    : 'bg-white/6 text-slate-300 border border-white/10'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <EmptyState title="No invoices in this status" message="Try switching the filter tab above." />
        ) : (
          <div className="space-y-3">
            {filteredInvoices.map((inv) => {
              const pro = db.users.find((u) => u.id === inv.proTraderId);
              return (
                <div
                  key={inv.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar src={pro?.avatarUrl} name={pro?.fullName ?? 'Pro Trader'} size="sm" />
                    <div className="space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">#{inv.id}</span>
                        <StatusBadge
                          tone={
                            inv.status === 'paid'
                              ? 'success'
                              : inv.status === 'overdue'
                              ? 'danger'
                              : 'warning'
                          }
                          label={inv.status.toUpperCase()}
                        />
                        {inv.unpaidStage !== 'none' && (
                          <StatusBadge tone="danger" label={inv.unpaidStage.replace('_', ' ')} />
                        )}
                      </div>
                      <p className="text-slate-300">
                        Pro Trader: <strong>{pro?.fullName ?? inv.proTraderId}</strong> · Due{' '}
                        {formatShortDate(inv.dueAt)} · Connection #{inv.connectionId}
                      </p>
                      <p className="text-slate-400">
                        Last log: {inv.history[inv.history.length - 1]?.note ?? 'Issued'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 justify-between lg:justify-end">
                    <span className="font-mono text-lg font-bold text-white tabular-nums">
                      {formatCurrency(inv.amountUsd)}
                    </span>

                    {inv.status !== 'paid' && (
                      <div className="flex flex-wrap gap-2">
                        {inv.unpaidStage !== 'suspended' && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => advanceUnpaidInvoiceStep(inv.id)}
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>
                              {inv.unpaidStage === 'none'
                                ? 'Send Reminder'
                                : inv.unpaidStage === 'reminder_sent'
                                ? 'Send Warning'
                                : 'Suspend Unpaid'}
                            </span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            payCommissionInvoice({
                              invoiceId: inv.id,
                              actorName: currentUser.fullName,
                              providerLabel: 'Admin Manual Settlement Confirmation (Demo)',
                            })
                          }
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Paid</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Settlements Ledger */}
      <Card padding="lg" className="space-y-4">
        <h2 className="font-display text-lg font-bold text-white">Settlement Statements Ledger</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-2.5 pr-4">Seal / Period</th>
                <th className="py-2.5 px-3">Connection</th>
                <th className="py-2.5 px-3 text-right">Eligible Profit</th>
                <th className="py-2.5 px-3 text-right">New Trader</th>
                <th className="py-2.5 px-3 text-right">Pro Net</th>
                <th className="py-2.5 pl-3 text-right">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {db.settlements.map((s) => (
                <tr key={s.id}>
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-white">{s.periodLabel}</p>
                    <p className="font-mono text-[11px] text-emerald-400">{s.verificationCode}</p>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">#{s.connectionId}</td>
                  <td className="py-3 px-3 text-right font-mono text-white">
                    {formatCurrency(s.eligibleProfitUsd)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-400">
                    {formatCurrency(s.newTraderAmountUsd)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-200">
                    {formatCurrency(s.proNetAmountUsd)}
                  </td>
                  <td className="py-3 pl-3 text-right font-mono text-sky-300 font-bold">
                    {formatCurrency(s.platformCommissionUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
