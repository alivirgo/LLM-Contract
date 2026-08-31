import { describe, it, expect } from 'vitest';
import { analyzeStability } from '../../../src/suite/stability.js';
import type { AttemptResult } from '../../../src/types/suite.js';

describe('Stability and Flakiness Analysis', () => {
  it('should mark single run as stable and not flaky', () => {
    const attempts: AttemptResult[] = [
      {
        attemptNumber: 1,
        output: 'test',
        durationMs: 10,
        result: { passed: true, score: 1.0 } as any,
      },
    ];

    const analysis = analyzeStability(attempts);
    expect(analysis.isFlaky).toBe(false);
    expect(analysis.stabilityScore).toBe(1.0);
  });

  it('should detect flakiness when some attempts pass and others fail', () => {
    const attempts: AttemptResult[] = [
      {
        attemptNumber: 1,
        output: 'pass',
        durationMs: 10,
        result: { passed: true, score: 1.0 } as any,
      },
      {
        attemptNumber: 2,
        output: 'fail',
        durationMs: 10,
        result: { passed: false, score: 0.0 } as any,
      },
      {
        attemptNumber: 3,
        output: 'pass',
        durationMs: 10,
        result: { passed: true, score: 1.0 } as any,
      },
    ];

    const analysis = analyzeStability(attempts);
    expect(analysis.isFlaky).toBe(true);
    expect(analysis.passCount).toBe(2);
    expect(analysis.failCount).toBe(1);
    expect(analysis.stabilityScore).toBeCloseTo(2 / 3, 2);
  });
});
