import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { TEXTS } from '../texts';
import { TraderProfile } from '../types';
import { formatPercent } from '../utils/formatters';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { HelpTip } from '../components/ui/HelpTip';
import { RiskWarningNotice } from '../components/ui/RiskBanner';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  ResponsiveDataView,
  TableColumn,
} from '../components/ui/States';
import { Tabs } from '../components/ui/Tabs';

interface WorkspacePreviewPageProps {
  title: string;
  phaseNumber: number;
  description: string;
}

type PreviewState = 'populated' | 'loading' | 'empty' | 'error';

export function WorkspacePreviewPage({
  title,
  phaseNumber,
  description,
}: WorkspacePreviewPageProps) {
  const { publicApprovedTraders, currentUser, currentRole, pushToast } = useApp();
  const [viewState, setViewState] = useState<PreviewState>('populated');

  const columns: TableColumn<TraderProfile>[] = [
    {
      key: 'name',
      header: 'Trader',
      render: (t) => (
        <div>
          <p className="font-semibold text-slate-950 dark:text-white">{t.displayName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.tradingStyle} · {t.country}
          </p>
        </div>
      ),
    },
    {
      key: 'score',
      header: 'Shohoj Score',
      align: 'right',
      render: (t) => <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{t.shohojScore}</span>,
    },
    {
      key: 'drawdown',
      header: 'Max Drawdown',
      align: 'right',
      render: (t) => <span>{formatPercent(t.ownAccountStats.maxDrawdownPercent)}</span>,
    },
    {
      key: 'share',
      header: 'Share Asked',
      align: 'right',
      render: (t) => <span>{t.askedProfitSharePercent}%</span>,
    },
    {
      key: 'risk',
      header: 'Risk Tag',
      render: (t) => {
        const tag = t.riskTags[0] ?? 'Balanced';
        const isHigh = tag === 'Grid' || tag === 'Martingale' || tag === 'No stop loss';
        return (
          <StatusBadge
            tone={isHigh ? 'danger' : tag === 'Low Risk' ? 'success' : 'info'}
            label={tag}
          />
        );
      },
    },
    {
      key: 'action',
      header: 'Profile',
      align: 'right',
      render: (t) => (
        <Link
          to={`/traders/${t.id}`}
          className="inline-flex items-center justify-center min-h-[36px] px-3.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300 transition-colors"
        >
          View profile
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Phase 1 Route Shell · Full workflow in Phase {phaseNumber}
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            {title}
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>

        <Button
          size="sm"
          onClick={() =>
            pushToast(`Previewing ${title} as ${currentUser?.fullName ?? currentRole}`, 'info')
          }
        >
          Test action
        </Button>
      </div>

      <RiskWarningNotice />

      {/* Design System State Switcher */}
      <Card padding="sm" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-sm text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5">
          <span>UI State Preview</span>
          <HelpTip
            term="UI States"
            explanation="Every screen supports loading, empty, error, and populated states."
          />
        </div>
        <Tabs<PreviewState>
          value={viewState}
          onChange={setViewState}
          options={[
            { value: 'populated', label: 'Data' },
            { value: 'loading', label: 'Loading' },
            { value: 'empty', label: 'Empty' },
            { value: 'error', label: 'Error' },
          ]}
        />
      </Card>

      {viewState === 'loading' && <LoadingSkeleton rows={4} />}
      {viewState === 'empty' && (
        <EmptyState
          actionLabel="Show sample data"
          onAction={() => setViewState('populated')}
        />
      )}
      {viewState === 'error' && (
        <ErrorState onRetry={() => setViewState('populated')} />
      )}
      {viewState === 'populated' && (
        <ResponsiveDataView
          items={publicApprovedTraders}
          columns={columns}
          getKey={(t) => t.id}
          renderMobileCard={(t) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-950 dark:text-white">{t.displayName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.tradingStyle} · {t.country}
                  </p>
                </div>
                <StatusBadge
                  tone={
                    t.riskTags.some((r) => ['Grid', 'Martingale', 'No stop loss'].includes(r))
                      ? 'danger'
                      : 'success'
                  }
                  label={t.riskTags[0]}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 dark:border-white/10 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Score</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {t.shohojScore}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Drawdown</span>
                  <span className="font-mono font-semibold">
                    {formatPercent(t.ownAccountStats.maxDrawdownPercent)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Share</span>
                  <span className="font-mono font-semibold">{t.askedProfitSharePercent}%</span>
                </div>
              </div>
              <Link
                to={`/traders/${t.id}`}
                className="block w-full text-center min-h-[40px] leading-[40px] rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              >
                View public profile
              </Link>
            </div>
          )}
        />
      )}

      <div className="pt-2">
        <Link to="/" className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
          ← Back to landing page
        </Link>
      </div>
    </div>
  );
}
