import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, FileText, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { OpenTradeRule, PlatformSettings, SettlementPeriod } from '../../types';
import { formatShortDate } from '../../utils/formatters';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/States';

type SettingsTab = 'rules' | 'regions' | 'notifications' | 'content' | 'history';

export function AdminSettingsPage() {
  const {
    db,
    settings,
    currentUser,
    currentRole,
    currentAdminLevel,
    switchRole,
    adminProposeOrApplySetting,
    adminDecideSettingChange,
    adminSaveNotificationRules,
  } = useApp();

  const [tab, setTab] = useState<SettingsTab>('rules');
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState('');

  // Section E form states
  const [commissionPct, setCommissionPct] = useState(String(settings.platformCommissionPercent));
  const [defaultProPct, setDefaultProPct] = useState(String(settings.defaultProTraderSharePercent));
  const [minProPct, setMinProPct] = useState(String(settings.minProSharePercent));
  const [maxProPct, setMaxProPct] = useState(String(settings.maxProSharePercent));

  const [maxDrawdown, setMaxDrawdown] = useState(String(settings.maxDrawdownPercent));
  const [maxRiskTrade, setMaxRiskTrade] = useState(String(settings.maxRiskPerTradePercent));
  const [maxLot, setMaxLot] = useState(String(settings.maxLotSize));
  const [minDeposit, setMinDeposit] = useState(String(settings.minDepositUsd));
  const [settlementPeriod, setSettlementPeriod] = useState<SettlementPeriod>(settings.settlementPeriod);
  const [openTradeRule, setOpenTradeRule] = useState<OpenTradeRule>(settings.openTradeRule);
  const [openTradeHours, setOpenTradeHours] = useState(String(settings.openTradeCloseHours));

  const [minMonths, setMinMonths] = useState(String(settings.minHistoryMonths));
  const [minTrades, setMinTrades] = useState(String(settings.minTradeCount));
  const [noticeDays, setNoticeDays] = useState(String(settings.cancellationNoticeDays));
  const [protectionMonths, setProtectionMonths] = useState(String(settings.commissionProtectionMonths));
  const [expiryDays, setExpiryDays] = useState(String(settings.requestExpiryDays));
  const [minAge, setMinAge] = useState(String(settings.minAgeYears));
  const [maxTries, setMaxTries] = useState(String(settings.maxFailedLoginAttempts));
  const [sessionMins, setSessionMins] = useState(String(settings.sessionTimeoutMinutes));

  const [wProfit, setWProfit] = useState(String(settings.shohojScoreWeights.profitWeight));
  const [wRisk, setWRisk] = useState(String(settings.shohojScoreWeights.riskWeight));
  const [wDd, setWDd] = useState(String(settings.shohojScoreWeights.drawdownWeight));

  // Regions & languages
  const [currenciesText, setCurrenciesText] = useState(settings.supportedCurrencies.join(', '));
  const [supportedCountriesText, setSupportedCountriesText] = useState(
    settings.supportedCountries.join(', ')
  );
  const [blockedCountriesText, setBlockedCountriesText] = useState(
    settings.blockedCountries.join(', ')
  );
  const [languagesText, setLanguagesText] = useState(settings.supportedLanguages.join(', '));

  // Notification matrix draft
  const [notifDraft, setNotifDraft] = useState(settings.notificationRules);

  // Content pages draft
  const [termsText, setTermsText] = useState(settings.termsText);
  const [riskWarningText, setRiskWarningText] = useState(settings.riskWarningText);
  const [privacyText, setPrivacyText] = useState(settings.privacyText);
  const [legalNoticeText, setLegalNoticeText] = useState(settings.legalNoticeText);
  const [advertisingRulesText, setAdvertisingRulesText] = useState(settings.advertisingRulesText);

  useEffect(() => {
    setCommissionPct(String(settings.platformCommissionPercent));
    setDefaultProPct(String(settings.defaultProTraderSharePercent));
    setMinProPct(String(settings.minProSharePercent));
    setMaxProPct(String(settings.maxProSharePercent));
    setMaxDrawdown(String(settings.maxDrawdownPercent));
    setMaxRiskTrade(String(settings.maxRiskPerTradePercent));
    setMaxLot(String(settings.maxLotSize));
    setMinDeposit(String(settings.minDepositUsd));
    setSettlementPeriod(settings.settlementPeriod);
    setOpenTradeRule(settings.openTradeRule);
    setOpenTradeHours(String(settings.openTradeCloseHours));
    setMinMonths(String(settings.minHistoryMonths));
    setMinTrades(String(settings.minTradeCount));
    setNoticeDays(String(settings.cancellationNoticeDays));
    setProtectionMonths(String(settings.commissionProtectionMonths));
    setExpiryDays(String(settings.requestExpiryDays));
    setMinAge(String(settings.minAgeYears));
    setMaxTries(String(settings.maxFailedLoginAttempts));
    setSessionMins(String(settings.sessionTimeoutMinutes));
    setWProfit(String(settings.shohojScoreWeights.profitWeight));
    setWRisk(String(settings.shohojScoreWeights.riskWeight));
    setWDd(String(settings.shohojScoreWeights.drawdownWeight));
    setCurrenciesText(settings.supportedCurrencies.join(', '));
    setSupportedCountriesText(settings.supportedCountries.join(', '));
    setBlockedCountriesText(settings.blockedCountries.join(', '));
    setLanguagesText(settings.supportedLanguages.join(', '));
    setNotifDraft(settings.notificationRules);
    setTermsText(settings.termsText);
    setRiskWarningText(settings.riskWarningText);
    setPrivacyText(settings.privacyText);
    setLegalNoticeText(settings.legalNoticeText);
    setAdvertisingRulesText(settings.advertisingRulesText);
  }, [settings]);

  if (!currentUser || currentRole !== 'admin' || currentAdminLevel !== 'super_admin') {
    return (
      <EmptyState
        title="Super Admin access only"
        message="Only Super Admins can edit platform settings, review second approvals, or update legal text."
        actionLabel="Switch to Super Admin (Demo)"
        onAction={() => switchRole('admin', 'super_admin')}
      />
    );
  }

  const pendingApprovals = db.settingChanges.filter((c) => c.status === 'pending_approval');

  const proVal = Number(defaultProPct) || 0;
  const commVal = Number(commissionPct) || 0;
  const minProVal = Number(minProPct) || 0;
  const maxProVal = Number(maxProPct) || 0;
  const newTraderCalc = 100 - proVal;
  const proNetCalc = Math.max(0, proVal - commVal);
  const splitSum = newTraderCalc + proNetCalc + commVal;
  const scoreWeightSum = (Number(wProfit) || 0) + (Number(wRisk) || 0) + (Number(wDd) || 0);

  const runChange = (
    key: keyof PlatformSettings,
    label: string,
    newVal: PlatformSettings[keyof PlatformSettings],
    oldDisp: string,
    newDisp: string,
    important: boolean
  ) => {
    setValidationError('');
    const res = adminProposeOrApplySetting({
      settingKey: key,
      settingLabel: label,
      newValue: newVal,
      displayOldValue: oldDisp,
      displayNewValue: newDisp,
      reason: reason.trim() || `Updated ${label} via Admin Settings.`,
      requiresSecondApproval: important,
    });
    if (!res.ok) {
      setValidationError(res.error ?? 'Could not save setting.');
    }
  };

  const handleSaveProfitSettings = () => {
    setValidationError('');
    if (minProVal >= maxProVal) {
      setValidationError('Minimum Pro share must be strictly less than Maximum Pro share.');
      return;
    }
    if (commVal >= minProVal) {
      setValidationError(
        `Platform commission (${commVal}%) must be smaller than Minimum Pro share (${minProVal}%).`
      );
      return;
    }
    if (proVal < minProVal || proVal > maxProVal) {
      setValidationError(
        `Default Pro share (${proVal}%) must stay between ${minProVal}% and ${maxProVal}%.`
      );
      return;
    }
    if (splitSum !== 100) {
      setValidationError('New Trader + Pro Net + Platform Commission must equal exactly 100%.');
      return;
    }

    if (commVal !== settings.platformCommissionPercent) {
      runChange(
        'platformCommissionPercent',
        'Platform commission (%)',
        commVal,
        `${settings.platformCommissionPercent}%`,
        `${commVal}%`,
        true
      );
    }
    if (proVal !== settings.defaultProTraderSharePercent) {
      runChange(
        'defaultProTraderSharePercent',
        'Default Professional Trader share (%)',
        proVal,
        `${settings.defaultProTraderSharePercent}%`,
        `${proVal}%`,
        true
      );
      runChange(
        'defaultNewTraderSharePercent',
        'Default New Trader share (%)',
        100 - proVal,
        `${settings.defaultNewTraderSharePercent}%`,
        `${100 - proVal}%`,
        true
      );
    }
    if (minProVal !== settings.minProSharePercent) {
      runChange(
        'minProSharePercent',
        'Min allowed Pro share (%)',
        minProVal,
        `${settings.minProSharePercent}%`,
        `${minProVal}%`,
        true
      );
    }
    if (maxProVal !== settings.maxProSharePercent) {
      runChange(
        'maxProSharePercent',
        'Max allowed Pro share (%)',
        maxProVal,
        `${settings.maxProSharePercent}%`,
        `${maxProVal}%`,
        true
      );
    }
  };

  const handleSaveRiskAndLimits = () => {
    setValidationError('');
    const dd = Number(maxDrawdown);
    const riskT = Number(maxRiskTrade);
    const lot = Number(maxLot);
    const dep = Number(minDeposit);
    const hrs = Number(openTradeHours);
    if (dd <= 0 || dd > 90 || riskT <= 0 || lot <= 0 || dep < 10) {
      setValidationError('Please enter valid positive limits (drawdown 1–90%, min deposit $10+).');
      return;
    }

    if (dd !== settings.maxDrawdownPercent) {
      runChange('maxDrawdownPercent', 'Maximum drawdown limit (%)', dd, `${settings.maxDrawdownPercent}%`, `${dd}%`, true);
    }
    if (riskT !== settings.maxRiskPerTradePercent) {
      runChange('maxRiskPerTradePercent', 'Max risk per trade (%)', riskT, `${settings.maxRiskPerTradePercent}%`, `${riskT}%`, false);
    }
    if (lot !== settings.maxLotSize) {
      runChange('maxLotSize', 'Maximum lot size', lot, String(settings.maxLotSize), String(lot), false);
    }
    if (dep !== settings.minDepositUsd) {
      runChange('minDepositUsd', 'Minimum deposit (USD)', dep, `$${settings.minDepositUsd}`, `$${dep}`, false);
    }
    if (settlementPeriod !== settings.settlementPeriod) {
      runChange('settlementPeriod', 'Settlement period', settlementPeriod, settings.settlementPeriod, settlementPeriod, false);
    }
    if (openTradeRule !== settings.openTradeRule) {
      runChange('openTradeRule', 'Open-trade cancellation rule', openTradeRule, settings.openTradeRule, openTradeRule, false);
    }
    if (hrs !== settings.openTradeCloseHours) {
      runChange('openTradeCloseHours', 'Open-trade close window (hours)', hrs, `${settings.openTradeCloseHours}h`, `${hrs}h`, false);
    }
  };

  const handleSaveQualificationAndScore = () => {
    setValidationError('');
    if (scoreWeightSum !== 100) {
      setValidationError('Shohoj Score weights (Profit + Risk + Drawdown) must add up to 100%.');
      return;
    }
    const hm = Number(minMonths);
    const tc = Number(minTrades);
    const nd = Number(noticeDays);
    const pm = Number(protectionMonths);
    const ed = Number(expiryDays);
    const age = Number(minAge);
    const tries = Number(maxTries);
    const sess = Number(sessionMins);

    if (hm < 1 || tc < 1 || age < 18 || tries < 1 || sess < 5) {
      setValidationError('Min age must be 18+, history 1+ months, session timeout 5+ min.');
      return;
    }

    if (hm !== settings.minHistoryMonths) {
      runChange('minHistoryMonths', 'Minimum trading history (months)', hm, `${settings.minHistoryMonths} mo`, `${hm} mo`, false);
    }
    if (tc !== settings.minTradeCount) {
      runChange('minTradeCount', 'Minimum real trades', tc, String(settings.minTradeCount), String(tc), false);
    }
    if (nd !== settings.cancellationNoticeDays) {
      runChange('cancellationNoticeDays', 'Cancellation notice period (days)', nd, `${settings.cancellationNoticeDays}d`, `${nd}d`, false);
    }
    if (pm !== settings.commissionProtectionMonths) {
      runChange('commissionProtectionMonths', 'Commission protection (months)', pm, `${settings.commissionProtectionMonths} mo`, `${pm} mo`, false);
    }
    if (ed !== settings.requestExpiryDays) {
      runChange('requestExpiryDays', 'Request expiry time (days)', ed, `${settings.requestExpiryDays}d`, `${ed}d`, false);
    }
    if (age !== settings.minAgeYears) {
      runChange('minAgeYears', 'Minimum age', age, String(settings.minAgeYears), String(age), false);
    }
    if (tries !== settings.maxFailedLoginAttempts) {
      runChange('maxFailedLoginAttempts', 'Max failed login tries', tries, String(settings.maxFailedLoginAttempts), String(tries), false);
    }
    if (sess !== settings.sessionTimeoutMinutes) {
      runChange('sessionTimeoutMinutes', 'Session timeout (minutes)', sess, `${settings.sessionTimeoutMinutes}m`, `${sess}m`, false);
    }

    const oldW = `${settings.shohojScoreWeights.profitWeight}/${settings.shohojScoreWeights.riskWeight}/${settings.shohojScoreWeights.drawdownWeight}`;
    const newW = `${Number(wProfit)}/${Number(wRisk)}/${Number(wDd)}`;
    if (oldW !== newW) {
      runChange(
        'shohojScoreWeights',
        'Shohoj Score weights (Profit/Risk/Drawdown)',
        {
          profitWeight: Number(wProfit),
          riskWeight: Number(wRisk),
          drawdownWeight: Number(wDd),
        },
        oldW,
        newW,
        false
      );
    }
  };

  const handleSaveRegions = () => {
    const parseList = (raw: string) =>
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const curr = parseList(currenciesText);
    const sup = parseList(supportedCountriesText);
    const blk = parseList(blockedCountriesText);
    const langs = parseList(languagesText);

    if (curr.length === 0 || sup.length === 0 || langs.length === 0) {
      setValidationError('Supported currencies, countries, and languages cannot be empty.');
      return;
    }

    runChange('supportedCurrencies', 'Supported currencies', curr, settings.supportedCurrencies.join(', '), curr.join(', '), false);
    runChange('supportedCountries', 'Supported countries', sup, `${settings.supportedCountries.length} countries`, `${sup.length} countries`, false);
    runChange('blockedCountries', 'Blocked countries', blk, `${settings.blockedCountries.length} blocked`, `${blk.length} blocked`, false);
    runChange('supportedLanguages', 'Supported languages', langs, settings.supportedLanguages.join(', '), langs.join(', '), false);
  };

  const handleSaveContent = () => {
    if (termsText !== settings.termsText) {
      runChange('termsText', 'Terms of Use text', termsText, 'Previous terms text', 'Updated terms text', false);
    }
    if (riskWarningText !== settings.riskWarningText) {
      runChange('riskWarningText', 'Risk Warning text', riskWarningText, 'Previous risk text', 'Updated risk text', false);
    }
    if (privacyText !== settings.privacyText) {
      runChange('privacyText', 'Privacy Policy text', privacyText, 'Previous privacy text', 'Updated privacy text', false);
    }
    if (legalNoticeText !== settings.legalNoticeText) {
      runChange('legalNoticeText', 'Legal Notice text', legalNoticeText, 'Previous legal notice', 'Updated legal notice', false);
    }
    if (advertisingRulesText !== settings.advertisingRulesText) {
      runChange('advertisingRulesText', 'Advertising Rules text', advertisingRulesText, 'Previous ad rules', 'Updated ad rules', false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">
            Admin · Central Settings Store
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white">
            Platform Settings & Content Editor
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Nothing is hard-coded anywhere. Important money/risk changes wait for a second Super Admin approval and never change signed agreement snapshots.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { key: 'rules', label: 'Rules & Limits' },
              { key: 'regions', label: 'Regions' },
              { key: 'notifications', label: 'Notifications' },
              { key: 'content', label: 'Legal Content' },
              { key: 'history', label: `History (${db.settingChanges.length})` },
            ] as { key: SettingsTab; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`min-h-[38px] px-3.5 rounded-full text-xs font-semibold cursor-pointer ${
                tab === t.key
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-white/6 text-slate-300 border border-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Snapshot Protection & Reason Bar */}
      <Card padding="sm" className="space-y-3">
        <div className="flex items-start gap-2.5 text-xs text-emerald-300">
          <Lock className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            <strong>Agreement Snapshot Protection:</strong> Updating Settings applies to new requests and public screens only. Active signed connections keep their copied snapshot values unless both traders accept a change request.
          </p>
        </div>
        <Input
          label="Change reason (saved in Settings History)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Example: Lowering platform commission or adjusting notice days"
        />
      </Card>

      {validationError && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {validationError}
        </div>
      )}

      {/* Second-Admin Pending Approval Queue */}
      {pendingApprovals.length > 0 && (
        <Card padding="lg" className="space-y-4 border-amber-500/40">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="font-display text-lg font-bold text-white">
                Pending Second Admin Approval ({pendingApprovals.length})
              </h2>
            </div>
            <StatusBadge tone="warning" label="Waiting 2nd Approver" />
          </div>
          <p className="text-xs text-slate-300">
            Important settings (commission, share range, max drawdown) stay in Pending Approval until another Admin reviews and approves them.
          </p>

          <div className="space-y-3">
            {pendingApprovals.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 text-xs">
                  <p className="text-sm font-semibold text-white">{c.settingLabel}</p>
                  <p className="text-slate-300">
                    Old: <span className="font-mono text-slate-400">{c.oldValue}</span> → Proposed:{' '}
                    <span className="font-mono text-emerald-400 font-bold">{c.newValue}</span>
                  </p>
                  <p className="text-slate-400">
                    Proposed by {c.changedByName} · Reason: {c.reason}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => adminDecideSettingChange(c.id, 'approved', 'Nadia Karim (2nd Admin)')}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve (2nd Admin)</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => adminDecideSettingChange(c.id, 'rejected', 'Nadia Karim (2nd Admin)')}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'rules' && (
        <div className="space-y-6">
          {/* Group 1: Profit & Commission (2nd Approval Required) */}
          <Card padding="lg" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  1. Profit Split & Commission (Important)
                </h2>
                <p className="text-xs text-slate-400">
                  Requires 2nd Admin approval before going live.
                </p>
              </div>
              <StatusBadge
                tone={splitSum === 100 ? 'success' : 'danger'}
                label={`100% Check: ${newTraderCalc}% + ${proNetCalc}% + ${commVal}% = ${splitSum}%`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="Platform commission (%)"
                type="number"
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                hint="Taken from Pro Trader share"
              />
              <Input
                label="Default Pro Trader share (%)"
                type="number"
                value={defaultProPct}
                onChange={(e) => setDefaultProPct(e.target.value)}
                hint={`New Trader gets ${100 - proVal}%`}
              />
              <Input
                label="Min Pro share (%)"
                type="number"
                value={minProPct}
                onChange={(e) => setMinProPct(e.target.value)}
              />
              <Input
                label="Max Pro share (%)"
                type="number"
                value={maxProPct}
                onChange={(e) => setMaxProPct(e.target.value)}
              />
            </div>

            <Button onClick={handleSaveProfitSettings}>Propose Profit Setting Changes</Button>
          </Card>

          {/* Group 2: Risk & Safety Limits */}
          <Card padding="lg" className="space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h2 className="font-display text-lg font-bold text-white">
                2. Risk Limits & Settlement Rules
              </h2>
              <p className="text-xs text-slate-400">
                Max drawdown changes enter Pending Approval; other safety fields apply directly with audit log entry.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="Max drawdown limit (%) *"
                type="number"
                value={maxDrawdown}
                onChange={(e) => setMaxDrawdown(e.target.value)}
                hint="Requires 2nd Admin approval"
              />
              <Input
                label="Max risk per trade (%)"
                type="number"
                step="0.5"
                value={maxRiskTrade}
                onChange={(e) => setMaxRiskTrade(e.target.value)}
              />
              <Input
                label="Max lot size"
                type="number"
                step="0.5"
                value={maxLot}
                onChange={(e) => setMaxLot(e.target.value)}
              />
              <Input
                label="Min deposit (USD)"
                type="number"
                value={minDeposit}
                onChange={(e) => setMinDeposit(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-200">Settlement period</label>
                <select
                  value={settlementPeriod}
                  onChange={(e) => setSettlementPeriod(e.target.value as SettlementPeriod)}
                  className="min-h-[44px] rounded-full px-4 bg-white/5 text-white border border-white/15 text-sm"
                >
                  <option value="weekly" className="bg-[#0d1612]">Weekly</option>
                  <option value="monthly" className="bg-[#0d1612]">Monthly</option>
                  <option value="quarterly" className="bg-[#0d1612]">Quarterly</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-200">
                  Open trades on cancellation
                </label>
                <select
                  value={openTradeRule}
                  onChange={(e) => setOpenTradeRule(e.target.value as OpenTradeRule)}
                  className="min-h-[44px] rounded-full px-4 bg-white/5 text-white border border-white/15 text-sm"
                >
                  <option value="close_immediately" className="bg-[#0d1612]">Close immediately</option>
                  <option value="close_within_hours" className="bg-[#0d1612]">Close within X hours</option>
                  <option value="let_finish" className="bg-[#0d1612]">Let finish (no new trades)</option>
                </select>
              </div>

              <Input
                label="Open-trade close window (hours)"
                type="number"
                value={openTradeHours}
                onChange={(e) => setOpenTradeHours(e.target.value)}
              />
            </div>

            <Button variant="secondary" onClick={handleSaveRiskAndLimits}>
              Save Risk & Settlement Rules
            </Button>
          </Card>

          {/* Group 3: History, Timers & Shohoj Score Weights */}
          <Card padding="lg" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  3. Qualification, Timers & Shohoj Score Weights
                </h2>
                <p className="text-xs text-slate-400">
                  Score weights must equal 100% and immediately recalculate public ranking scores.
                </p>
              </div>
              <StatusBadge
                tone={scoreWeightSum === 100 ? 'success' : 'danger'}
                label={`Score Weights: ${scoreWeightSum}%`}
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Input label="Min Pro history (months)" type="number" value={minMonths} onChange={(e) => setMinMonths(e.target.value)} />
              <Input label="Min Pro real trades" type="number" value={minTrades} onChange={(e) => setMinTrades(e.target.value)} />
              <Input label="Cancel notice (days)" type="number" value={noticeDays} onChange={(e) => setNoticeDays(e.target.value)} />
              <Input label="Commission protection (mo)" type="number" value={protectionMonths} onChange={(e) => setProtectionMonths(e.target.value)} />
              <Input label="Request expiry (days)" type="number" value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} />
              <Input label="Minimum age (years)" type="number" value={minAge} onChange={(e) => setMinAge(e.target.value)} />
              <Input label="Max failed logins" type="number" value={maxTries} onChange={(e) => setMaxTries(e.target.value)} />
              <Input label="Session timeout (min)" type="number" value={sessionMins} onChange={(e) => setSessionMins(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <Input label="Score: Profit weight (%)" type="number" value={wProfit} onChange={(e) => setWProfit(e.target.value)} />
              <Input label="Score: Risk habit weight (%)" type="number" value={wRisk} onChange={(e) => setWRisk(e.target.value)} />
              <Input label="Score: Low drawdown weight (%)" type="number" value={wDd} onChange={(e) => setWDd(e.target.value)} />
            </div>

            <Button variant="secondary" onClick={handleSaveQualificationAndScore}>
              Save Timers & Score Weights
            </Button>
          </Card>
        </div>
      )}

      {tab === 'regions' && (
        <Card padding="lg" className="space-y-4">
          <h2 className="font-display text-lg font-bold text-white">
            Supported Currencies, Countries & Languages
          </h2>
          <p className="text-xs text-slate-400">Separate values with commas.</p>
          <div className="space-y-4">
            <Input
              label="Supported currencies"
              value={currenciesText}
              onChange={(e) => setCurrenciesText(e.target.value)}
            />
            <Input
              label="Supported countries"
              value={supportedCountriesText}
              onChange={(e) => setSupportedCountriesText(e.target.value)}
            />
            <Input
              label="Blocked countries"
              value={blockedCountriesText}
              onChange={(e) => setBlockedCountriesText(e.target.value)}
            />
            <Input
              label="Supported languages"
              value={languagesText}
              onChange={(e) => setLanguagesText(e.target.value)}
            />
          </div>
          <Button onClick={handleSaveRegions}>Save Region & Language Lists</Button>
        </Card>
      )}

      {tab === 'notifications' && (
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Platform Notification Rules
              </h2>
              <p className="text-xs text-slate-400">
                Choose default delivery channels per event. Security alerts are locked ON for user safety.
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-400">
                  <th className="py-2.5 pr-4">Event</th>
                  <th className="py-2.5 px-3 text-center">In-App</th>
                  <th className="py-2.5 px-3 text-center">Email</th>
                  <th className="py-2.5 px-3 text-center">SMS</th>
                  <th className="py-2.5 px-3 text-center">Push</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {notifDraft.map((rule, idx) => (
                  <tr key={rule.eventKey}>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-white">{rule.label}</p>
                      {rule.lockedSecurity && (
                        <p className="text-[11px] text-emerald-400">Security alert — cannot be turned off</p>
                      )}
                    </td>
                    {(['inApp', 'email', 'sms', 'push'] as const).map((channel) => (
                      <td key={channel} className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          disabled={rule.lockedSecurity}
                          checked={rule[channel]}
                          onChange={(e) =>
                            setNotifDraft((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, [channel]: e.target.checked } : item
                              )
                            )
                          }
                          className="h-4 w-4 accent-emerald-400 cursor-pointer"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            onClick={() =>
              adminSaveNotificationRules(
                notifDraft,
                reason.trim() || 'Updated Admin notification rules matrix.'
              )
            }
          >
            Save Notification Rules
          </Button>
        </Card>
      )}

      {tab === 'content' && (
        <Card padding="lg" className="space-y-5">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Content Pages Editor (Live on Legal Pages)
              </h2>
              <p className="text-xs text-slate-400">
                Changes saved here update Terms, Risk Disclosure, Privacy Policy, Legal Notice, and Advertising Rules across the site immediately.
              </p>
            </div>
          </div>

          {[
            { label: 'Terms of Use', value: termsText, setter: setTermsText },
            { label: 'Risk Disclosure / Warning', value: riskWarningText, setter: setRiskWarningText },
            { label: 'Privacy Policy', value: privacyText, setter: setPrivacyText },
            { label: 'Legal & Prototype Notice', value: legalNoticeText, setter: setLegalNoticeText },
            { label: 'Advertising & No-Guarantee Rules', value: advertisingRulesText, setter: setAdvertisingRulesText },
          ].map((field) => (
            <div key={field.label} className="space-y-1.5">
              <label className="text-sm font-medium text-slate-200">{field.label}</label>
              <textarea
                rows={3}
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 text-sm bg-white/5 text-white border border-white/15 focus:outline-none focus:border-emerald-400"
              />
            </div>
          ))}

          <Button onClick={handleSaveContent}>Save All Content Pages</Button>
        </Card>
      )}

      {tab === 'history' && (
        <Card padding="sm" className="overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="font-display text-lg font-bold text-white">Settings History</h2>
            <p className="text-xs text-slate-400">
              Every setting change records who changed it, when, old/new values, reason, and approval status.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-3 px-4">When</th>
                  <th className="py-3 px-4">Setting</th>
                  <th className="py-3 px-4">Old → New</th>
                  <th className="py-3 px-4">Changed By</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status / Approver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {db.settingChanges.map((sc) => (
                  <tr key={sc.id}>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {formatShortDate(sc.changedAt)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">{sc.settingLabel}</td>
                    <td className="py-3 px-4 font-mono">
                      <span className="text-slate-400">{sc.oldValue}</span> →{' '}
                      <span className="text-emerald-400">{sc.newValue}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-200">{sc.changedByName}</td>
                    <td className="py-3 px-4 text-slate-300">{sc.reason}</td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        tone={
                          sc.status === 'applied'
                            ? 'success'
                            : sc.status === 'rejected'
                            ? 'danger'
                            : 'warning'
                        }
                        label={sc.status.replace('_', ' ')}
                      />
                      {sc.approvedByName && (
                        <p className="text-[11px] text-slate-400 mt-1">{sc.approvedByName}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
