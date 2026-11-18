import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  Check,
  Heart,
  HelpCircle,
  Scale,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { useApp } from '../store/AppContext';
import { TraderProfile } from '../types';
import { formatPercent } from '../utils/formatters';
import { computeShohojScore, hasRiskyStyle, RISKY_TAGS } from '../utils/shohojScore';
import { UserAvatar } from '../components/ui/Avatar';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { RiskWarningNotice } from '../components/ui/RiskBanner';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/ui/States';

type RiskFilter = 'all' | 'low' | 'balanced' | 'high';
type SortOption = 'score' | 'drawdown' | 'newest' | 'history';

export function BrowseTradersPage() {
  const {
    db,
    settings,
    publicApprovedTraders,
    pushToast,
    toggleFavoriteTrader,
    saveTraderFilter,
    deleteSavedTraderFilter,
  } = useApp();

  const [searchParams, setSearchParams] = useSearchParams();

  // Read filters from URL so refresh & sharing preserve exact state
  const q = searchParams.get('q') ?? '';
  const risk = (searchParams.get('risk') as RiskFilter) || 'all';
  const maxDd = Number(searchParams.get('maxDd') ?? 30);
  const minGrowth = Number(searchParams.get('minGrowth') ?? 0);
  const minMonths = Number(searchParams.get('minMonths') ?? settings.minHistoryMonths);
  const maxShare = Number(searchParams.get('maxShare') ?? settings.maxProSharePercent);
  const styleFilter = searchParams.get('style') ?? 'all';
  const instFilter = searchParams.get('inst') ?? 'all';
  const openOnly = searchParams.get('open') === '1';
  const favOnly = searchParams.get('fav') === '1';
  const sortBy = (searchParams.get('sort') as SortOption) || 'score';

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [whyFirstOpen, setWhyFirstOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [filterPresetName, setFilterPresetName] = useState('');
  const [isSimLoading, setIsSimLoading] = useState(false);
  const [hasSimError, setHasSimError] = useState(false);

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all' || value === '0') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const clearAllFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const uniqueStyles = useMemo(() => {
    return Array.from(new Set(publicApprovedTraders.map((t) => t.tradingStyle))).sort();
  }, [publicApprovedTraders]);

  const uniqueInstruments = useMemo(() => {
    return Array.from(new Set(publicApprovedTraders.flatMap((t) => t.instruments))).sort();
  }, [publicApprovedTraders]);

  const filteredTraders = useMemo(() => {
    const query = q.trim().toLowerCase();

    const list = publicApprovedTraders.filter((t) => {
      if (query) {
        const hay = `${t.displayName} ${t.bio} ${t.tradingStyle} ${t.country} ${t.instruments.join(' ')}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }

      if (risk === 'low' && !t.riskTags.includes('Low Risk')) return false;
      if (risk === 'balanced' && !t.riskTags.includes('Balanced')) return false;
      if (risk === 'high' && !hasRiskyStyle(t)) return false;

      if (t.ownAccountStats.maxDrawdownPercent > maxDd) return false;
      if (t.ownAccountStats.accountGrowthPercent < minGrowth) return false;
      if (t.ownAccountStats.historyMonths < minMonths) return false;
      if (t.askedProfitSharePercent > maxShare) return false;

      if (styleFilter !== 'all' && t.tradingStyle !== styleFilter) return false;
      if (instFilter !== 'all' && !t.instruments.includes(instFilter)) return false;
      if (openOnly && !t.isOpenForRequests) return false;
      if (favOnly && !db.favoriteTraderIds.includes(t.id)) return false;

      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'drawdown') {
        return a.ownAccountStats.maxDrawdownPercent - b.ownAccountStats.maxDrawdownPercent;
      }
      if (sortBy === 'history') {
        return b.ownAccountStats.historyMonths - a.ownAccountStats.historyMonths;
      }
      if (sortBy === 'newest') {
        return a.ownAccountStats.historyMonths - b.ownAccountStats.historyMonths;
      }
      // Default: Live Shohoj Score (high to low)
      const scoreB = computeShohojScore(b, settings.shohojScoreWeights);
      const scoreA = computeShohojScore(a, settings.shohojScoreWeights);
      return scoreB - scoreA;
    });
  }, [
    publicApprovedTraders,
    q,
    risk,
    maxDd,
    minGrowth,
    minMonths,
    maxShare,
    styleFilter,
    instFilter,
    openOnly,
    favOnly,
    sortBy,
    db.favoriteTraderIds,
    settings.shohojScoreWeights,
  ]);

  const toggleCompare = (traderId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(traderId)) {
        return prev.filter((id) => id !== traderId);
      }
      if (prev.length >= 3) {
        pushToast('You can compare up to 3 traders at one time.', 'warning');
        return prev;
      }
      return [...prev, traderId];
    });
  };

  const comparedTraders: TraderProfile[] = useMemo(() => {
    return compareIds
      .map((id) => publicApprovedTraders.find((t) => t.id === id))
      .filter((t): t is TraderProfile => Boolean(t));
  }, [compareIds, publicApprovedTraders]);

  const handleSaveFilterPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filterPresetName.trim()) return;
    saveTraderFilter(filterPresetName, searchParams.toString());
    setFilterPresetName('');
    setSaveModalOpen(false);
  };

  const applySavedFilter = (queryString: string) => {
    setSearchParams(new URLSearchParams(queryString), { replace: true });
    pushToast('Saved filter applied.', 'info');
  };

  const runBriefLoadDemo = () => {
    setHasSimError(false);
    setIsSimLoading(true);
    window.setTimeout(() => setIsSimLoading(false), 450);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Find <span className="text-emerald-600 dark:text-emerald-400">verified</span> traders
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl">
            Only approved traders with at least {settings.minHistoryMonths} months and{' '}
            {settings.minTradeCount} real trades appear here.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setWhyFirstOpen((prev) => !prev)}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
            <span>Why is this trader shown first?</span>
          </button>
        </div>
      </div>

      {whyFirstOpen && (
        <Card padding="sm" className="border-emerald-500/25 bg-emerald-500/[0.06] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm text-slate-950 dark:text-white">
              How Shohoj Score orders traders
            </p>
            <button
              type="button"
              onClick={() => setWhyFirstOpen(false)}
              className="text-xs text-slate-500 hover:underline cursor-pointer"
            >
              Close
            </button>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            We never rank traders by win rate alone. Shohoj Score mixes profit quality (
            {settings.shohojScoreWeights.profitWeight}%), safe risk habits (
            {settings.shohojScoreWeights.riskWeight}%), and low drawdown (
            {settings.shohojScoreWeights.drawdownWeight}%) from Admin Settings.
          </p>
        </Card>
      )}

      <RiskWarningNotice />

      {/* Search + Sort + Filter Controls */}
      <Card padding="sm" className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search traders"
              value={q}
              onChange={(e) => updateParam('q', e.target.value || null)}
              placeholder="Search by name, pair (e.g. XAU/USD), style, or country..."
              className="min-h-[44px] w-full rounded-full pl-11 pr-4 py-2 text-sm sm:text-base bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:border-white/15 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sort selector */}
            <select
              aria-label="Sort traders"
              value={sortBy}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="min-h-[44px] rounded-full px-4 py-2 text-sm bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
            >
              <option value="score" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">
                Sort: Shohoj Score
              </option>
              <option value="drawdown" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">
                Sort: Lowest drawdown
              </option>
              <option value="history" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">
                Sort: Longest history
              </option>
              <option value="newest" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">
                Sort: Newest approved
              </option>
            </select>

            <Button
              variant={filtersOpen ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFiltersOpen((prev) => !prev)}
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
              <span>Filters</span>
            </Button>

            <button
              type="button"
              onClick={() => updateParam('fav', favOnly ? null : '1')}
              className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium border cursor-pointer transition-colors ${
                favOnly
                  ? 'bg-emerald-500 text-slate-950 border-emerald-500 dark:bg-emerald-400'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10'
              }`}
            >
              <Heart className="w-4 h-4" aria-hidden="true" />
              <span>Favorites ({db.favoriteTraderIds.length})</span>
            </button>
          </div>
        </div>

        {/* Saved filters row */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Saved filters:
          </span>
          {db.savedTraderFilters.map((sf) => (
            <div
              key={sf.id}
              className="inline-flex items-center rounded-full border border-slate-200 dark:border-white/12 bg-slate-100/70 dark:bg-white/[0.04] pl-3 pr-1 py-1 text-xs"
            >
              <button
                type="button"
                onClick={() => applySavedFilter(sf.queryString)}
                className="font-medium text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
              >
                {sf.name}
              </button>
              <button
                type="button"
                onClick={() => deleteSavedTraderFilter(sf.id)}
                aria-label={`Delete ${sf.name}`}
                className="ml-1.5 p-1 rounded-full text-slate-400 hover:text-red-500 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSaveModalOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer px-2 py-1"
          >
            <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Save current filters</span>
          </button>
        </div>

        {/* Expandable Advanced Filter Panel */}
        {filtersOpen && (
          <div className="pt-4 border-t border-slate-200 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <label htmlFor="flt-risk" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Risk level
              </label>
              <select
                id="flt-risk"
                value={risk}
                onChange={(e) => updateParam('risk', e.target.value)}
                className="min-h-[42px] w-full rounded-full px-4 py-1.5 bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
              >
                <option value="all" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">All risk levels</option>
                <option value="low" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">Low Risk only</option>
                <option value="balanced" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">Balanced</option>
                <option value="high" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">High risk (Grid / Martingale)</option>
              </select>
            </div>

            <div>
              <label htmlFor="flt-style" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Trading style
              </label>
              <select
                id="flt-style"
                value={styleFilter}
                onChange={(e) => updateParam('style', e.target.value)}
                className="min-h-[42px] w-full rounded-full px-4 py-1.5 bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
              >
                <option value="all" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">All styles</option>
                {uniqueStyles.map((s) => (
                  <option key={s} value={s} className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="flt-inst" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Instrument
              </label>
              <select
                id="flt-inst"
                value={instFilter}
                onChange={(e) => updateParam('inst', e.target.value)}
                className="min-h-[42px] w-full rounded-full px-4 py-1.5 bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
              >
                <option value="all" className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">All instruments</option>
                {uniqueInstruments.map((i) => (
                  <option key={i} value={i} className="bg-white text-slate-900 dark:bg-[#0d1612] dark:text-white">
                    {i}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="flt-dd" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Max drawdown: <span className="font-mono">{maxDd}%</span>
              </label>
              <input
                id="flt-dd"
                type="range"
                min={5}
                max={30}
                step={1}
                value={maxDd}
                onChange={(e) => updateParam('maxDd', e.target.value === '30' ? null : e.target.value)}
                className="w-full accent-emerald-500 mt-2 cursor-pointer"
              />
            </div>

            <div>
              <label htmlFor="flt-growth" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Min profit growth: <span className="font-mono">{minGrowth}%</span>
              </label>
              <input
                id="flt-growth"
                type="range"
                min={0}
                max={50}
                step={5}
                value={minGrowth}
                onChange={(e) => updateParam('minGrowth', e.target.value)}
                className="w-full accent-emerald-500 mt-2 cursor-pointer"
              />
            </div>

            <div>
              <label htmlFor="flt-months" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Min history: <span className="font-mono">{minMonths} months</span>
              </label>
              <input
                id="flt-months"
                type="range"
                min={settings.minHistoryMonths}
                max={24}
                step={1}
                value={minMonths}
                onChange={(e) =>
                  updateParam(
                    'minMonths',
                    Number(e.target.value) <= settings.minHistoryMonths ? null : e.target.value
                  )
                }
                className="w-full accent-emerald-500 mt-2 cursor-pointer"
              />
            </div>

            <div>
              <label htmlFor="flt-share" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Max Pro share asked: <span className="font-mono">{maxShare}%</span>
              </label>
              <input
                id="flt-share"
                type="range"
                min={settings.minProSharePercent}
                max={settings.maxProSharePercent}
                step={1}
                value={maxShare}
                onChange={(e) =>
                  updateParam(
                    'maxShare',
                    Number(e.target.value) >= settings.maxProSharePercent ? null : e.target.value
                  )
                }
                className="w-full accent-emerald-500 mt-2 cursor-pointer"
              />
            </div>

            <div className="flex flex-col justify-end gap-2">
              <label className="min-h-[42px] flex items-center gap-2.5 rounded-full px-4 py-1.5 border border-slate-300 dark:border-white/15 cursor-pointer">
                <input
                  type="checkbox"
                  checked={openOnly}
                  onChange={(e) => updateParam('open', e.target.checked ? '1' : null)}
                  className="h-4 w-4 accent-emerald-500"
                />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Open for requests only
                </span>
              </label>
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Reset all filters
              </button>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <button type="button" onClick={runBriefLoadDemo} className="hover:underline cursor-pointer">
                  Test loading state
                </button>
                <button
                  type="button"
                  onClick={() => setHasSimError((prev) => !prev)}
                  className="hover:underline cursor-pointer"
                >
                  {hasSimError ? 'Hide error state' : 'Test error state'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span>
          Showing <strong className="text-slate-950 dark:text-white">{filteredTraders.length}</strong>{' '}
          verified traders
        </span>
        {compareIds.length > 0 && (
          <button
            type="button"
            onClick={() => setCompareModalOpen(true)}
            className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            Compare selected ({compareIds.length}/3) →
          </button>
        )}
      </div>

      {/* Main Traders Grid with Loading / Error / Empty states */}
      {isSimLoading ? (
        <LoadingSkeleton rows={4} />
      ) : hasSimError ? (
        <ErrorState onRetry={() => setHasSimError(false)} />
      ) : filteredTraders.length === 0 ? (
        <EmptyState
          title="No traders match those filters"
          message="Try raising the max drawdown limit, lowering minimum history, or clearing search words."
          actionLabel="Clear all filters"
          onAction={clearAllFilters}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTraders.map((t) => {
            const isFav = db.favoriteTraderIds.includes(t.id);
            const isCompared = compareIds.includes(t.id);
            const risky = hasRiskyStyle(t);
            const sparkData = t.equityCurve.map((pt) => ({
              label: pt.label,
              equity: pt.ownEquity,
            }));

            return (
              <Card key={t.id} className="flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        src={t.avatarUrl}
                        name={t.displayName}
                        color={t.avatarColor}
                        size="md"
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/traders/${t.id}`}
                          className="font-display text-base font-bold text-slate-950 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 truncate block"
                        >
                          {t.displayName}
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {t.tradingStyle} · {t.country}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFavoriteTrader(t.id)}
                      aria-label={isFav ? `Remove ${t.displayName} from favorites` : `Save ${t.displayName} to favorites`}
                      className={`min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-full border transition-colors cursor-pointer shrink-0 ${
                        isFav
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} aria-hidden="true" />
                    </button>
                  </div>

                  {/* Risk tag + availability */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {t.riskTags.map((tag) => {
                        const high = (RISKY_TAGS as readonly string[]).includes(tag);
                        return (
                          <StatusBadge
                            key={tag}
                            tone={high ? 'danger' : tag === 'Low Risk' ? 'success' : 'info'}
                            label={tag}
                          />
                        );
                      })}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t.isOpenForRequests ? 'Open' : 'Closed'}
                    </span>
                  </div>

                  {/* Mini Equity Sparkline Chart */}
                  <div className="h-16 w-full rounded-xl bg-slate-900/[0.025] dark:bg-white/[0.03] px-2 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparkData}>
                        <Area
                          type="monotone"
                          dataKey="equity"
                          stroke={risky ? '#f59e0b' : '#22c55e'}
                          strokeWidth={1.8}
                          fill={risky ? 'rgba(245,158,11,0.14)' : 'rgba(34,197,94,0.14)'}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Score</span>
                      <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {computeShohojScore(t, settings.shohojScoreWeights)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Growth</span>
                      <span className="font-mono text-sm font-semibold text-slate-950 dark:text-white tabular-nums">
                        {formatPercent(t.ownAccountStats.accountGrowthPercent, true)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Drawdown</span>
                      <span className="font-mono text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums">
                        -{t.ownAccountStats.maxDrawdownPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Share</span>
                      <span className="font-mono text-sm font-semibold text-slate-950 dark:text-white tabular-nums">
                        {t.askedProfitSharePercent}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCompare(t.id)}
                    className={`min-h-[40px] inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border cursor-pointer transition-colors ${
                      isCompared
                        ? 'bg-sky-500/15 text-sky-700 border-sky-500/40 dark:text-sky-300'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10'
                    }`}
                  >
                    {isCompared ? <Check className="w-3.5 h-3.5" /> : <Scale className="w-3.5 h-3.5" />}
                    <span>{isCompared ? 'Added' : 'Compare'}</span>
                  </button>

                  <Link to={`/traders/${t.id}`}>
                    <Button size="sm">
                      <span>View profile</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sticky Compare Bar */}
      {compareIds.length > 0 && (
        <div className="fixed bottom-16 md:bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-2rem)] max-w-xl rounded-full px-4 py-2.5 shadow-2xl border bg-white/95 text-slate-900 border-slate-300 dark:bg-[#0d1612]/95 dark:text-white dark:border-white/15 backdrop-blur-xl flex items-center justify-between gap-3">
          <span className="text-xs sm:text-sm font-medium pl-2">
            {compareIds.length}/3 traders selected to compare
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="min-h-[38px] px-3 rounded-full text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              Clear
            </button>
            <Button size="sm" onClick={() => setCompareModalOpen(true)}>
              Compare now
            </Button>
          </div>
        </div>
      )}

      {/* Side-by-Side Compare Modal */}
      <Modal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        title={`Compare traders (${comparedTraders.length}/3)`}
        size="lg"
      >
        {comparedTraders.length === 0 ? (
          <EmptyState
            message="Pick up to 3 traders using the Compare button on their cards."
            actionLabel="Close"
            onAction={() => setCompareModalOpen(false)}
          />
        ) : (
          <div className="space-y-4">
            {/* Phone view: stacked cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden max-h-[65vh] overflow-y-auto pr-1">
              {comparedTraders.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-2 text-sm text-slate-800 dark:text-slate-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/traders/${t.id}`}
                      onClick={() => setCompareModalOpen(false)}
                      className="inline-flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400"
                    >
                      <UserAvatar src={t.avatarUrl} name={t.displayName} color={t.avatarColor} size="xs" />
                      <span>{t.displayName}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleCompare(t.id)}
                      className="text-xs text-slate-400 hover:text-red-500 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <span>Score: {computeShohojScore(t, settings.shohojScoreWeights)}/100</span>
                    <span>Growth: {formatPercent(t.ownAccountStats.accountGrowthPercent, true)}</span>
                    <span>Drawdown: -{t.ownAccountStats.maxDrawdownPercent}%</span>
                    <span>Profit Factor: {t.ownAccountStats.profitFactor}</span>
                    <span>History: {t.ownAccountStats.historyMonths} mo</span>
                    <span>Share asked: {t.askedProfitSharePercent}%</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Risk: {t.riskTags.join(', ')}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop view: side-by-side table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className="py-2 pr-3 text-xs text-slate-500 dark:text-slate-400">Metric</th>
                    {comparedTraders.map((t) => (
                      <th key={t.id} className="py-2 px-3 font-semibold text-slate-950 dark:text-white">
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            to={`/traders/${t.id}`}
                            onClick={() => setCompareModalOpen(false)}
                            className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            <UserAvatar src={t.avatarUrl} name={t.displayName} color={t.avatarColor} size="xs" />
                            <span>{t.displayName}</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => toggleCompare(t.id)}
                            aria-label={`Remove ${t.displayName}`}
                            className="text-slate-400 hover:text-red-500 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-white/10 font-mono text-xs text-slate-900 dark:text-slate-100">
                  <tr>
                    <td className="py-2.5 pr-3 font-sans text-slate-600 dark:text-slate-300">Shohoj Score</td>
                    {comparedTraders.map((t) => (
                      <td key={t.id} className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {computeShohojScore(t, settings.shohojScoreWeights)}/100
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-sans text-slate-600 dark:text-slate-300">Own Growth</td>
                    {comparedTraders.map((t) => (
                      <td key={t.id} className="py-2.5 px-3">
                        {formatPercent(t.ownAccountStats.accountGrowthPercent, true)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-sans text-slate-600 dark:text-slate-300">Max Drawdown</td>
                    {comparedTraders.map((t) => (
                      <td key={t.id} className="py-2.5 px-3 text-red-600 dark:text-red-400">
                        -{t.ownAccountStats.maxDrawdownPercent}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-sans text-slate-600 dark:text-slate-300">Profit Factor</td>
                    {comparedTraders.map((t) => (
                      <td key={t.id} className="py-2.5 px-3">{t.ownAccountStats.profitFactor}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-sans text-slate-600 dark:text-slate-300">History</td>
                    {comparedTraders.map((t) => (
                      <td key={t.id} className="py-2.5 px-3">{t.ownAccountStats.historyMonths} months</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-sans text-slate-600 dark:text-slate-300">Pro Share Asked</td>
                    {comparedTraders.map((t) => (
                      <td key={t.id} className="py-2.5 px-3">{t.askedProfitSharePercent}%</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-sans text-slate-600 dark:text-slate-300">Risk Tags</td>
                    {comparedTraders.map((t) => (
                      <td key={t.id} className="py-2.5 px-3 font-sans">{t.riskTags.join(', ')}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Save Filter Preset Modal */}
      <Modal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title="Save current filter preset"
      >
        <form onSubmit={handleSaveFilterPreset} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="preset-name" className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Preset name
            </label>
            <input
              id="preset-name"
              value={filterPresetName}
              onChange={(e) => setFilterPresetName(e.target.value)}
              placeholder="e.g. Safe Gold Swing Traders"
              className="min-h-[44px] w-full rounded-full px-5 py-2 text-base bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setSaveModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save preset</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
