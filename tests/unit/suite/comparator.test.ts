import { describe, it, expect } from 'vitest';
import { compareWithBaseline } from '../../../src/suite/comparator.js';
import type { EvaluationResult } from '../../../src/types/result.js';

describe('Assertion-Level Baseline Comparator', () => {
  it('should identify a REGRESSION when previously passed case fails', () => {
    const currentResult: EvaluationResult = {
      contractName: 'test',
      passed: false,
      score: 0.0,
      scoreBreakdown: {} as any,
      failures: [{ code: 'UNSUPPORTED_CLAIM', message: 'Ungrounded entity', severity: 'error' }],
      warnings: [],
      checks: [],
      rawOutput: '',
      normalizedOutput: '',
      durationMs: 10,
      timestamp: '',
    };

    const comparison = compareWithBaseline(currentResult, {
      passed: true,
      score: 1.0,
    });

    expect(comparison.status).toBe('regression');
    expect(comparison.scoreDelta).toBe(-1.0);
    expect(comparison.newFailureCodes).toContain('UNSUPPORTED_CLAIM');
  });

  it('should identify a FIX when previously failing case now passes', () => {
    const currentResult: EvaluationResult = {
      contractName: 'test',
      passed: true,
      score: 1.0,
      scoreBreakdown: {} as any,
      failures: [],
      warnings: [],
      checks: [],
      rawOutput: '',
      normalizedOutput: '',
      durationMs: 10,
      timestamp: '',
    };

    const comparison = compareWithBaseline(currentResult, {
      passed: false,
      score: 0.0,
      failureCodes: ['SCHEMA_VIOLATION'],
    });

    expect(comparison.status).toBe('fix');
    expect(comparison.scoreDelta).toBe(1.0);
    expect(comparison.resolvedFailureCodes).toContain('SCHEMA_VIOLATION');
  });
});
