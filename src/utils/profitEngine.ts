import { PlatformSettings } from '../types';

export interface ProfitEngineInput {
  startingBalanceUsd: number;
  endingBalanceUsd: number;
  depositsDuringPeriodUsd: number;
  withdrawalsDuringPeriodUsd: number;
  highWaterMarkUsd: number;
  proSharePercent: number;
  platformCommissionPercent: number;
}

export interface ProfitEngineResult {
  valid: boolean;
  error?: string;
  startingCents: number;
  endingCents: number;
  depositsCents: number;
  withdrawalsCents: number;
  adjustedEndingCents: number;
  realizedNetProfitCents: number;
  effectiveHwmCents: number;
  eligibleProfitCents: number;
  recoveryAppliedCents: number;
  nextHighWaterMarkCents: number;
  lossCarryForwardCents: number;
  newTraderSharePercent: number;
  proNetSharePercent: number;
  platformCommissionPercent: number;
  sharesSumPercent: number;
  newTraderCents: number;
  proNetCents: number;
  platformCommissionCents: number;
  proGrossCents: number;
  centsSumCheck: boolean;
}

export interface ProfitSelfTestCase {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  expectedSummary: string;
  actualSummary: string;
}

export function toCents(dollars: number): number {
  if (!Number.isFinite(dollars)) return 0;
  return Math.round(dollars * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Pure whole-cent Profit & Commission Engine (Section K).
 * - Uses integer cents to avoid floating-point rounding mistakes.
 * - Excludes mid-period deposits/withdrawals from profit or loss.
 * - Applies High-Water Mark: fees apply ONLY to new profit above previous peak.
 * - Deducts platform commission out of the Professional Trader's share.
 * - Checks that New Trader + Pro Net + Platform Commission = 100%.
 */
export function calculateProfitSplit(input: ProfitEngineInput): ProfitEngineResult {
  const proShare = Math.round(input.proSharePercent);
  const commission = Math.round(input.platformCommissionPercent);
  const newTraderSharePercent = 100 - proShare;
  const proNetSharePercent = proShare - commission;
  const sharesSumPercent = newTraderSharePercent + proNetSharePercent + commission;

  const startingCents = Math.max(0, toCents(input.startingBalanceUsd));
  const endingCents = Math.max(0, toCents(input.endingBalanceUsd));
  const depositsCents = Math.max(0, toCents(input.depositsDuringPeriodUsd));
  const withdrawalsCents = Math.max(0, toCents(input.withdrawalsDuringPeriodUsd));
  const hwmCents = Math.max(0, toCents(input.highWaterMarkUsd));

  // Adjusted ending balance removes mid-period deposits and adds back withdrawals
  const adjustedEndingCents = endingCents - depositsCents + withdrawalsCents;
  const realizedNetProfitCents = adjustedEndingCents - startingCents;
  const effectiveHwmCents = Math.max(startingCents, hwmCents);

  const emptyFailure = (error: string): ProfitEngineResult => ({
    valid: false,
    error,
    startingCents,
    endingCents,
    depositsCents,
    withdrawalsCents,
    adjustedEndingCents,
    realizedNetProfitCents,
    effectiveHwmCents,
    eligibleProfitCents: 0,
    recoveryAppliedCents: 0,
    nextHighWaterMarkCents: effectiveHwmCents,
    lossCarryForwardCents: Math.max(0, effectiveHwmCents - adjustedEndingCents),
    newTraderSharePercent,
    proNetSharePercent,
    platformCommissionPercent: commission,
    sharesSumPercent,
    newTraderCents: 0,
    proNetCents: 0,
    platformCommissionCents: 0,
    proGrossCents: 0,
    centsSumCheck: false,
  });

  if (proShare <= 0 || proShare >= 100) {
    return emptyFailure('Professional Trader share must be between 1% and 99%.');
  }

  if (commission < 0) {
    return emptyFailure('Platform commission cannot be negative.');
  }

  if (commission > proShare) {
    return emptyFailure('Platform commission cannot be bigger than the Professional Trader share.');
  }

  if (sharesSumPercent !== 100) {
    return emptyFailure(`All shares must add up to 100% (currently ${sharesSumPercent}%).`);
  }

  let eligibleProfitCents = 0;
  let recoveryAppliedCents = 0;
  let nextHighWaterMarkCents = effectiveHwmCents;

  if (realizedNetProfitCents > 0) {
    eligibleProfitCents = Math.max(0, adjustedEndingCents - effectiveHwmCents);
    recoveryAppliedCents = Math.max(0, realizedNetProfitCents - eligibleProfitCents);
    nextHighWaterMarkCents = Math.max(effectiveHwmCents, adjustedEndingCents);
  }

  const lossCarryForwardCents = Math.max(0, nextHighWaterMarkCents - adjustedEndingCents);

  // Split eligible profit in whole cents
  const newTraderCents = Math.round((eligibleProfitCents * newTraderSharePercent) / 100);
  const proGrossCents = eligibleProfitCents - newTraderCents;
  const platformCommissionCents = Math.min(
    proGrossCents,
    Math.round((eligibleProfitCents * commission) / 100)
  );
  const proNetCents = proGrossCents - platformCommissionCents;

  const centsSumCheck =
    newTraderCents + proNetCents + platformCommissionCents === eligibleProfitCents;

  return {
    valid: true,
    startingCents,
    endingCents,
    depositsCents,
    withdrawalsCents,
    adjustedEndingCents,
    realizedNetProfitCents,
    effectiveHwmCents,
    eligibleProfitCents,
    recoveryAppliedCents,
    nextHighWaterMarkCents,
    lossCarryForwardCents,
    newTraderSharePercent,
    proNetSharePercent,
    platformCommissionPercent: commission,
    sharesSumPercent,
    newTraderCents,
    proNetCents,
    platformCommissionCents,
    proGrossCents,
    centsSumCheck,
  };
}

/**
 * Self-test runner (Section K: 9 test cases).
 */
export function runProfitEngineSelfTests(settings: PlatformSettings): ProfitSelfTestCase[] {
  const cases: ProfitSelfTestCase[] = [];

  // 1. Standard $100 profit example (80/18/2)
  const t1 = calculateProfitSplit({
    startingBalanceUsd: 100,
    endingBalanceUsd: 200,
    depositsDuringPeriodUsd: 0,
    withdrawalsDuringPeriodUsd: 0,
    highWaterMarkUsd: 100,
    proSharePercent: 20,
    platformCommissionPercent: 2,
  });
  cases.push({
    id: 'tc-1',
    name: 'Standard profit split ($100 profit)',
    description: '80% New Trader, 20% Pro share, 2% commission out of Pro share.',
    passed:
      t1.valid &&
      t1.eligibleProfitCents === 10000 &&
      t1.newTraderCents === 8000 &&
      t1.proNetCents === 1800 &&
      t1.platformCommissionCents === 200 &&
      t1.centsSumCheck,
    expectedSummary: 'New $80.00 / Pro $18.00 / Platform $2.00',
    actualSummary: `New $${fromCents(t1.newTraderCents).toFixed(2)} / Pro $${fromCents(
      t1.proNetCents
    ).toFixed(2)} / Platform $${fromCents(t1.platformCommissionCents).toFixed(2)}`,
  });

  // 2. Loss period -> zero fee & loss carried under HWM
  const t2 = calculateProfitSplit({
    startingBalanceUsd: 1000,
    endingBalanceUsd: 800,
    depositsDuringPeriodUsd: 0,
    withdrawalsDuringPeriodUsd: 0,
    highWaterMarkUsd: 1000,
    proSharePercent: 20,
    platformCommissionPercent: 2,
  });
  cases.push({
    id: 'tc-2',
    name: 'Loss month charges zero fee',
    description: 'Balance drops from $1,000 to $800; $200 loss carried under High-Water Mark.',
    passed:
      t2.valid &&
      t2.eligibleProfitCents === 0 &&
      t2.newTraderCents === 0 &&
      t2.proNetCents === 0 &&
      t2.platformCommissionCents === 0 &&
      t2.nextHighWaterMarkCents === 100000 &&
      t2.lossCarryForwardCents === 20000,
    expectedSummary: 'Fees $0.00, HWM stays $1,000.00 ($200.00 loss to recover)',
    actualSummary: `Eligible $${fromCents(t2.eligibleProfitCents).toFixed(2)}, HWM $${fromCents(
      t2.nextHighWaterMarkCents
    ).toFixed(2)}`,
  });

  // 3. Partial recovery below HWM -> zero fee
  const t3 = calculateProfitSplit({
    startingBalanceUsd: 800,
    endingBalanceUsd: 950,
    depositsDuringPeriodUsd: 0,
    withdrawalsDuringPeriodUsd: 0,
    highWaterMarkUsd: 1000,
    proSharePercent: 20,
    platformCommissionPercent: 2,
  });
  cases.push({
    id: 'tc-3',
    name: 'Recovery below old peak charges zero fee',
    description: 'Balance rises from $800 to $950, still below $1,000 HWM.',
    passed:
      t3.valid &&
      t3.realizedNetProfitCents === 15000 &&
      t3.eligibleProfitCents === 0 &&
      t3.recoveryAppliedCents === 15000 &&
      t3.platformCommissionCents === 0,
    expectedSummary: 'Realized +$150.00 recovery, Eligible $0.00',
    actualSummary: `Realized +$${fromCents(t3.realizedNetProfitCents).toFixed(2)}, Eligible $${fromCents(
      t3.eligibleProfitCents
    ).toFixed(2)}`,
  });

  // 4. Full recovery passing HWM -> fee ONLY on excess above peak
  const t4 = calculateProfitSplit({
    startingBalanceUsd: 800,
    endingBalanceUsd: 1100,
    depositsDuringPeriodUsd: 0,
    withdrawalsDuringPeriodUsd: 0,
    highWaterMarkUsd: 1000,
    proSharePercent: 20,
    platformCommissionPercent: 2,
  });
  cases.push({
    id: 'tc-4',
    name: 'Recovery passing HWM shares only new profit',
    description: 'From $800 to $1,100 with $1,000 HWM -> only $100 above peak is shared.',
    passed:
      t4.valid &&
      t4.realizedNetProfitCents === 30000 &&
      t4.eligibleProfitCents === 10000 &&
      t4.newTraderCents === 8000 &&
      t4.proNetCents === 1800 &&
      t4.platformCommissionCents === 200 &&
      t4.nextHighWaterMarkCents === 110000,
    expectedSummary: 'Eligible $100.00 (New $80 / Pro $18 / Fee $2), New HWM $1,100',
    actualSummary: `Eligible $${fromCents(t4.eligibleProfitCents).toFixed(2)}, New HWM $${fromCents(
      t4.nextHighWaterMarkCents
    ).toFixed(2)}`,
  });

  // 5. Deposit in the middle is NOT counted as profit
  const t5 = calculateProfitSplit({
    startingBalanceUsd: 1000,
    endingBalanceUsd: 1500,
    depositsDuringPeriodUsd: 500,
    withdrawalsDuringPeriodUsd: 0,
    highWaterMarkUsd: 1000,
    proSharePercent: 20,
    platformCommissionPercent: 2,
  });
  cases.push({
    id: 'tc-5',
    name: 'Mid-period deposit excluded from profit',
    description: '$1,000 start + $500 user deposit = $1,500 end -> $0 trading profit.',
    passed:
      t5.valid &&
      t5.realizedNetProfitCents === 0 &&
      t5.eligibleProfitCents === 0 &&
      t5.platformCommissionCents === 0,
    expectedSummary: 'Net trading profit $0.00, Fees $0.00',
    actualSummary: `Net profit $${fromCents(t5.realizedNetProfitCents).toFixed(2)}, Fees $${fromCents(
      t5.platformCommissionCents
    ).toFixed(2)}`,
  });

  // 6. Withdrawal in the middle does NOT hide real profit
  const t6 = calculateProfitSplit({
    startingBalanceUsd: 1000,
    endingBalanceUsd: 900,
    depositsDuringPeriodUsd: 0,
    withdrawalsDuringPeriodUsd: 200,
    highWaterMarkUsd: 1000,
    proSharePercent: 20,
    platformCommissionPercent: 2,
  });
  cases.push({
    id: 'tc-6',
    name: 'Mid-period withdrawal added back accurately',
    description: '$1,000 start, $200 withdrawn, $900 end = +$100 real profit.',
    passed:
      t6.valid &&
      t6.realizedNetProfitCents === 10000 &&
      t6.eligibleProfitCents === 10000 &&
      t6.newTraderCents === 8000 &&
      t6.proNetCents === 1800 &&
      t6.platformCommissionCents === 200,
    expectedSummary: 'Adjusted end $1,100.00, Eligible profit $100.00',
    actualSummary: `Adjusted end $${fromCents(t6.adjustedEndingCents).toFixed(2)}, Eligible $${fromCents(
      t6.eligibleProfitCents
    ).toFixed(2)}`,
  });

  // 7. Custom split using live Settings commission
  const t7 = calculateProfitSplit({
    startingBalanceUsd: 1000,
    endingBalanceUsd: 1500,
    depositsDuringPeriodUsd: 0,
    withdrawalsDuringPeriodUsd: 0,
    highWaterMarkUsd: 1000,
    proSharePercent: 30,
    platformCommissionPercent: settings.platformCommissionPercent,
  });
  cases.push({
    id: 'tc-7',
    name: `Custom 70/30 split with live ${settings.platformCommissionPercent}% Settings fee`,
    description: 'Verifies live Settings commission still sums to 100%.',
    passed:
      t7.valid &&
      t7.sharesSumPercent === 100 &&
      t7.centsSumCheck &&
      t7.eligibleProfitCents === 50000,
    expectedSummary: `Shares sum 100% (70% / ${30 - settings.platformCommissionPercent}% / ${settings.platformCommissionPercent}%)`,
    actualSummary: `Sum ${t7.sharesSumPercent}% (${t7.newTraderSharePercent}% / ${t7.proNetSharePercent}% / ${t7.platformCommissionPercent}%)`,
  });

  // 8. Guardrail blocks commission > Pro share
  const t8 = calculateProfitSplit({
    startingBalanceUsd: 1000,
    endingBalanceUsd: 1200,
    depositsDuringPeriodUsd: 0,
    withdrawalsDuringPeriodUsd: 0,
    highWaterMarkUsd: 1000,
    proSharePercent: 10,
    platformCommissionPercent: 15,
  });
  cases.push({
    id: 'tc-8',
    name: 'Blocks commission bigger than Pro share',
    description: 'Prevents invalid 15% commission when Pro share is 10%.',
    passed: !t8.valid && Boolean(t8.error),
    expectedSummary: 'Blocked with clear validation error',
    actualSummary: t8.error ?? 'Unexpectedly allowed',
  });

  // 9. Whole-cent rounding check on odd amount ($33.33)
  const t9 = calculateProfitSplit({
    startingBalanceUsd: 1000,
    endingBalanceUsd: 1033.33,
    depositsDuringPeriodUsd: 0,
    withdrawalsDuringPeriodUsd: 0,
    highWaterMarkUsd: 1000,
    proSharePercent: 20,
    platformCommissionPercent: 2,
  });
  cases.push({
    id: 'tc-9',
    name: 'Whole-cent rounding check ($33.33 profit)',
    description: 'Every cent adds back to exactly 3333 cents with zero penny drift.',
    passed: t9.valid && t9.centsSumCheck && t9.eligibleProfitCents === 3333,
    expectedSummary: 'Sum = $33.33 exactly (3333 cents)',
    actualSummary: `Sum = $${fromCents(
      t9.newTraderCents + t9.proNetCents + t9.platformCommissionCents
    ).toFixed(2)}`,
  });

  return cases;
}
