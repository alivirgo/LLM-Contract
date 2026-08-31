import { describe, it, expect } from 'vitest';
import { evaluatePolicy } from '../../src/policy/evaluator.js';
import { strictCIPolicy, standardCIPolicy } from '../../src/policy/default-policies.js';
import type { SuiteResult } from '../../src/types/suite.js';

describe('CI Policy Enforcement', () => {
  const passingSuiteResult: SuiteResult = {
    suiteName: 'test-suite',
    timestamp: new Date().toISOString(),
    options: {},
    metrics: {
      totalCases: 10,
      passedCases: 10,
      failedCases: 0,
      passRate: 1.0,
      averageScore: 1.0,
      failureRateByCategory: {} as any,
      totalRuns: 10,
      flakyCasesCount: 0,
      flakyRate: 0.0,
      regressionsCount: 0,
      regressionRate: 0.0,
      fixesCount: 0,
      totalDurationMs: 100,
    },
    results: [],
    newlyFailingCases: [],
    newlyPassingCases: [],
    flakyCases: [],
    casesRequiringReview: [],
  };

  it('should pass strict CI policy when all cases pass without regressions', () => {
    const result = evaluatePolicy(passingSuiteResult, strictCIPolicy);
    expect(result.compliant).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.violations).toHaveLength(0);
  });

  it('should fail policy and return exit code 1 when regression occurs', () => {
    const regressingSuiteResult: SuiteResult = {
      ...passingSuiteResult,
      metrics: {
        ...passingSuiteResult.metrics,
        passedCases: 9,
        failedCases: 1,
        passRate: 0.9,
        regressionsCount: 1,
        regressionRate: 0.1,
      },
    };

    const result = evaluatePolicy(regressingSuiteResult, standardCIPolicy);
    expect(result.compliant).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.violations.some(v => v.rule === 'maximumRegressionRate')).toBe(true);
  });

  it('should enforce zero tolerance for forbidden failure categories', () => {
    const policyResult = evaluatePolicy(
      {
        ...passingSuiteResult,
        metrics: {
          ...passingSuiteResult.metrics,
          failureRateByCategory: {
            SCHEMA_VIOLATION: 1,
          } as any,
        },
      },
      {
        zeroToleranceFailures: ['SCHEMA_VIOLATION'],
      }
    );

    expect(policyResult.compliant).toBe(false);
    expect(policyResult.exitCode).toBe(1);
  });
});
