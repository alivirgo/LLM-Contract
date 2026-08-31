import { describe, it, expect } from 'vitest';
import { calculateScoreBreakdown } from '../../src/core/scoring.js';
import type { CheckResult } from '../../src/types/result.js';

describe('Deterministic Scoring Engine', () => {
  it('should compute 1.0 when there are zero checks', () => {
    const breakdown = calculateScoreBreakdown([]);
    expect(breakdown.finalScore).toBe(1.0);
    expect(breakdown.hardAssertionsPassed).toBe(true);
    expect(breakdown.contributions).toHaveLength(0);
  });

  it('should calculate weighted average correctly', () => {
    const checks: CheckResult[] = [
      { name: 'checkA', type: 'invariant', pass: true, score: 1.0, weight: 1.0, isHard: true, durationMs: 5 },
      { name: 'checkB', type: 'assertion', pass: true, score: 0.5, weight: 3.0, isHard: false, durationMs: 5 },
    ];

    // Total weight: 1.0 + 3.0 = 4.0
    // Weighted sum: (1.0 * 1.0) + (0.5 * 3.0) = 1.0 + 1.5 = 2.5
    // Final score: 2.5 / 4.0 = 0.625
    const breakdown = calculateScoreBreakdown(checks);
    expect(breakdown.finalScore).toBe(0.625);
    expect(breakdown.totalWeight).toBe(4.0);
    expect(breakdown.hardAssertionsPassed).toBe(true);
    expect(breakdown.contributions[0]?.contributionPercentage).toBe(25);
    expect(breakdown.contributions[1]?.contributionPercentage).toBe(75);
  });

  it('should flag hardAssertionsPassed as false if any hard assertion fails', () => {
    const checks: CheckResult[] = [
      { name: 'checkHardFail', type: 'invariant', pass: false, score: 0.0, weight: 1.0, isHard: true, durationMs: 5 },
      { name: 'checkSoftPass', type: 'assertion', pass: true, score: 1.0, weight: 10.0, isHard: false, durationMs: 5 },
    ];

    const breakdown = calculateScoreBreakdown(checks);
    expect(breakdown.hardAssertionsPassed).toBe(false);
  });
});
