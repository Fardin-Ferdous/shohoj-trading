import { ShohojScoreWeights, TraderProfile } from '../types';

export const RISKY_TAGS = ['Martingale', 'Grid', 'No stop loss'] as const;

export function hasRiskyStyle(profile: Pick<TraderProfile, 'riskTags'>): boolean {
  return profile.riskTags.some((t) =>
    (RISKY_TAGS as readonly string[]).includes(t)
  );
}

/**
 * Calculates a balanced 0-100 Shohoj Score using editable Settings weights.
 * Never ranks by win rate alone: combines profit quality, risk habits, and drawdown.
 */
export function computeShohojScore(
  profile: TraderProfile,
  weights: ShohojScoreWeights
): number {
  const stats = profile.ownAccountStats;

  // Profit quality (profit factor up to 2.5 -> 0..100)
  const profitSub = Math.min(100, Math.max(0, ((stats.profitFactor - 0.8) / 1.7) * 100));

  // Drawdown safety (0% -> 100, 30%+ -> 0)
  const drawdownSub = Math.min(100, Math.max(0, 100 - (stats.maxDrawdownPercent / 30) * 100));

  // Risk habits (penalize Martingale, Grid, No stop loss)
  let riskPenalty = 0;
  if (profile.riskTags.includes('Martingale')) riskPenalty += 38;
  if (profile.riskTags.includes('Grid')) riskPenalty += 26;
  if (profile.riskTags.includes('No stop loss')) riskPenalty += 30;
  const riskSub = Math.max(10, 100 - riskPenalty);

  const totalWeight = Math.max(
    1,
    weights.profitWeight + weights.riskWeight + weights.drawdownWeight
  );

  const weighted =
    (profitSub * weights.profitWeight +
      riskSub * weights.riskWeight +
      drawdownSub * weights.drawdownWeight) /
    totalWeight;

  return Math.round(Math.min(99, Math.max(15, weighted)));
}
