import type { AttemptResult } from '../types/suite.js';

export interface StabilityAnalysis {
  isFlaky: boolean;
  stabilityScore: number; // 0.0 to 1.0
  passCount: number;
  failCount: number;
  scoreVariance: number;
}

/**
 * Computes stability metrics across multiple execution attempts of a test case.
 * Does not hide flakiness or auto-retry to mask failures.
 */
export function analyzeStability(attempts: AttemptResult[]): StabilityAnalysis {
  if (attempts.length <= 1) {
    const single = attempts[0];
    return {
      isFlaky: false,
      stabilityScore: 1.0,
      passCount: single?.result.passed ? 1 : 0,
      failCount: single?.result.passed ? 0 : 1,
      scoreVariance: 0,
    };
  }

  let passCount = 0;
  let failCount = 0;
  const scores: number[] = [];

  for (const att of attempts) {
    if (att.result.passed) {
      passCount++;
    } else {
      failCount++;
    }
    scores.push(att.result.score);
  }

  // Is flaky if it both passed and failed across attempts
  const isFlaky = passCount > 0 && failCount > 0;

  // Calculate score variance
  const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - meanScore, 2), 0) / scores.length;

  // Stability score: 1.0 if all attempts gave the exact same binary outcome
  const majorityCount = Math.max(passCount, failCount);
  const stabilityScore = Math.round((majorityCount / attempts.length) * 10000) / 10000;

  return {
    isFlaky,
    stabilityScore,
    passCount,
    failCount,
    scoreVariance: Math.round(variance * 10000) / 10000,
  };
}
