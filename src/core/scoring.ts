import type { CheckResult, ScoreBreakdown, ScoreContribution } from '../types/result.js';

/**
 * Computes a transparent, deterministic composite score.
 * Never invents an opaque score: every weight and contribution is clearly mapped.
 */
export function calculateScoreBreakdown(checks: CheckResult[]): ScoreBreakdown {
  if (checks.length === 0) {
    return {
      finalScore: 1.0,
      totalWeight: 0,
      hardAssertionsPassed: true,
      contributions: [],
    };
  }

  let totalWeight = 0;
  let weightedSum = 0;
  let allHardPassed = true;

  // First pass: sum weights
  for (const check of checks) {
    if (check.isHard && !check.pass) {
      allHardPassed = false;
    }
    const weight = check.weight > 0 ? check.weight : 1.0;
    totalWeight += weight;
  }

  const contributions: ScoreContribution[] = [];

  // Second pass: compute weighted contribution
  for (const check of checks) {
    const weight = check.weight > 0 ? check.weight : 1.0;
    const score = Math.max(0, Math.min(1, check.score));
    const weightedScore = score * weight;
    weightedSum += weightedScore;

    const contributionPercentage = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;

    contributions.push({
      name: check.name,
      score,
      weight,
      weightedScore,
      contributionPercentage,
    });
  }

  const rawFinalScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  // Round to 4 decimal places for stable floating point results
  const finalScore = Math.round(rawFinalScore * 10000) / 10000;

  return {
    finalScore,
    totalWeight,
    hardAssertionsPassed: allHardPassed,
    contributions,
  };
}
