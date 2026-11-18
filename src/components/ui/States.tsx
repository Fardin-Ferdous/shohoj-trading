import React from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
import { TEXTS } from '../../texts';
import { Button } from './Button';
import { Card } from './Card';

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={TEXTS.states.loadingTitle}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 w-full rounded-2xl animate-pulse bg-slate-200/70 dark:bg-white/6"
        />
      ))}
    </div>
  );
}

export function EmptyState({
  title = TEXTS.states.emptyTitle,
  message = TEXTS.states.emptyText,
  actionLabel,
  onAction,
}: {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card className="text-center py-10">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/5 text-slate-500 dark:bg-white/8 dark:text-slate-400">
        <Inbox className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
        {message}
      </p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="secondary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </Card>
  );
}

export function ErrorState({
  title = TEXTS.states.errorTitle,
  message = TEXTS.states.errorText,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="text-center py-10 border-red-500/25">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
        <AlertTriangle className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
        {message}
      </p>
      {onRetry && (
        <div className="mt-5">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {TEXTS.states.retryButton}
          </Button>
        </div>
      )}
    </Card>
  );
}

export interface TableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (item: T) => React.ReactNode;
}

export function ResponsiveDataView<T>({
  items,
  columns,
  getKey,
  renderMobileCard,
}: {
  items: T[];
  columns: TableColumn<T>[];
  getKey: (item: T) => string;
  renderMobileCard: (item: T) => React.ReactNode;
}) {
  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {/* Mobile cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {items.map((item) => (
          <Card key={getKey(item)} padding="sm">
            {renderMobileCard(item)}
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-5 py-3.5 whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/8 text-sm">
              {items.map((item) => (
                <tr
                  key={getKey(item)}
                  className="hover:bg-slate-900/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 py-3.5 text-slate-800 dark:text-slate-200 ${
                        col.align === 'right' ? 'text-right tabular-nums font-mono' : 'text-left'
                      }`}
                    >
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
