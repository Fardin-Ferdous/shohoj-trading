import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../../store/AppContext';
import { MonthlyReturnPoint, PerformanceStats, TraderProfile } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '../ui/Card';

interface TraderPerformanceChartsProps {
  profile: TraderProfile;
  accountTab: 'own' | 'managed';
  stats: PerformanceStats;
}

export function TraderPerformanceCharts({
  profile,
  accountTab,
  stats,
}: TraderPerformanceChartsProps) {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
  const axisTick = isDark ? '#94a3b8' : '#475569';
  const tooltipBg = isDark ? '#0b1410' : '#ffffff';
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.12)';
  const tooltipText = isDark ? '#f8fafc' : '#0f172a';

  const equityData = profile.equityCurve.map((pt) => ({
    label: pt.label,
    equity: accountTab === 'own' ? pt.ownEquity : pt.managedEquity,
  }));

  // Compute simulated period drawdown % from monthly returns
  let running = 100;
  let peak = 100;
  const drawdownData = profile.monthlyReturns.map((m: MonthlyReturnPoint) => {
    const factor = accountTab === 'own' ? m.returnPercent : m.returnPercent * 0.9;
    running = running * (1 + factor / 100);
    if (running > peak) peak = running;
    const dd = -Math.max(0, Number((((peak - running) / peak) * 100).toFixed(2)));
    return { month: m.month, drawdown: dd };
  });

  const monthlyData = profile.monthlyReturns.map((m) => ({
    month: m.month,
    returnPercent:
      accountTab === 'own'
        ? m.returnPercent
        : Number((m.returnPercent * 0.92).toFixed(2)),
  }));

  const winCount = Math.round((stats.tradeCount * stats.winRatePercent) / 100);
  const lossCount = Math.max(0, stats.tradeCount - winCount);
  const winLossData = [
    { name: 'Winning trades', value: winCount, color: '#22c55e' },
    { name: 'Losing trades', value: lossCount, color: '#ef4444' },
  ];

  const hasTrades = stats.tradeCount > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* 1. Equity Curve */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            Equity curve ({accountTab === 'own' ? 'Own account' : 'Managed accounts'})
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {stats.dataSource}
          </span>
        </div>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: axisTick, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axisTick, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: '12px',
                  color: tooltipText,
                  fontSize: '13px',
                }}
                formatter={(val: unknown) => [formatCurrency(Number(val)), 'Balance']}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="#22c55e"
                strokeWidth={2.2}
                fill="url(#equityGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 2. Monthly Returns Bars */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            Monthly returns (%)
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Green = gain · Red = loss
          </span>
        </div>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: axisTick, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axisTick, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: '12px',
                  color: tooltipText,
                  fontSize: '13px',
                }}
                formatter={(val: unknown) => [`${Number(val).toFixed(1)}%`, 'Return']}
              />
              <Bar dataKey="returnPercent" radius={[6, 6, 0, 0]}>
                {monthlyData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.returnPercent >= 0 ? '#22c55e' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 3. Drawdown Chart */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            Drawdown history (%)
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Drop from peak · Smaller is safer
          </span>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={drawdownData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.05} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: axisTick, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axisTick, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: '12px',
                  color: tooltipText,
                  fontSize: '13px',
                }}
                formatter={(val: unknown) => [`${Number(val).toFixed(2)}%`, 'Drawdown']}
              />
              <Area
                type="monotone"
                dataKey="drawdown"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#ddGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 4. Win / Loss Split */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            Win / Loss trade split
          </h3>
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {stats.tradeCount} total trades
          </span>
        </div>

        {hasTrades ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 h-56">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={winLossData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={44}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {winLossData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '12px',
                      color: tooltipText,
                      fontSize: '13px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Winning trades</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {winCount} ({stats.winRatePercent.toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Losing trades</span>
                <span className="font-mono font-semibold text-red-600 dark:text-red-400 tabular-nums">
                  {lossCount} ({(100 - stats.winRatePercent).toFixed(1)}%)
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Avg win / Avg loss</span>
                <span className="font-mono text-xs font-semibold tabular-nums">
                  {formatCurrency(stats.avgWinUsd)} / {formatCurrency(stats.avgLossUsd)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-56 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            No managed account trades recorded yet.
          </div>
        )}
      </Card>
    </div>
  );
}
