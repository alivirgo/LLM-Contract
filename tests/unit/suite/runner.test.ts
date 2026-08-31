import { describe, it, expect } from 'vitest';
import { runSuite } from '../../../src/suite/runner.js';
import { defineContract } from '../../../src/core/define-contract.js';
import { mustPreserveFacts } from '../../../src/assertions/grounding.js';
import type { TestCase } from '../../../src/types/suite.js';

describe('Suite Runner Engine', () => {
  const contract = defineContract({
    name: 'suite-test-contract',
    invariants: [
      mustPreserveFacts(['SKU-100', '2026-09-01']),
    ],
  });

  const cases: TestCase[] = [
    {
      id: 'case-01',
      input: 'Details for SKU-100',
      context: 'Product SKU-100 release date 2026-09-01.',
      contract,
      baselineOutcome: { passed: true, score: 1.0 },
    },
    {
      id: 'case-02',
      input: 'Details for SKU-100',
      context: 'Product SKU-100 release date 2026-09-01.',
      contract,
      baselineOutcome: { passed: true, score: 1.0 },
    },
  ];

  it('should run suite and detect regression when model output breaks contract', async () => {
    // Generator where case-01 passes and case-02 breaks (regression!)
    const suiteResult = await runSuite('regression-test', cases, (testCase: TestCase) => {
      if (testCase.id === 'case-01') {
        return 'Here is SKU-100 released on 2026-09-01.';
      }
      return 'Here is SKU-999 released yesterday.'; // Drops facts!
    });

    expect(suiteResult.metrics.totalCases).toBe(2);
    expect(suiteResult.metrics.passedCases).toBe(1);
    expect(suiteResult.metrics.failedCases).toBe(1);
    expect(suiteResult.metrics.passRate).toBe(0.5);

    expect(suiteResult.newlyFailingCases).toHaveLength(1);
    expect(suiteResult.newlyFailingCases[0]?.caseId).toBe('case-02');
    expect(suiteResult.metrics.regressionsCount).toBe(1);
  });

  it('should measure stability across multiple runs per case', async () => {
    let callCount = 0;
    const suiteResult = await runSuite(
      'stability-test',
      [cases[0]!],
      () => {
        callCount++;
        // Alternate passing and failing
        return callCount % 2 === 1
          ? 'Here is SKU-100 released on 2026-09-01.'
          : 'Broken output without required entities.';
      },
      { runsPerCase: 3 }
    );

    expect(suiteResult.results[0]?.attempts).toHaveLength(3);
    expect(suiteResult.results[0]?.isFlaky).toBe(true);
    expect(suiteResult.flakyCases).toHaveLength(1);
    expect(suiteResult.results[0]?.aggregateResult.passed).toBe(false);
    expect(suiteResult.results[0]?.aggregateResult.failures).toHaveLength(1);
    expect(Object.values(suiteResult.metrics.failureRateByCategory)).toContain(1);
  });

  it('turns generator exceptions into hard, machine-readable failures', async () => {
    const result = await runSuite('generation-error', [cases[0]!], () => {
      throw new Error('provider unavailable');
    });

    expect(result.results[0]?.passed).toBe(false);
    expect(result.results[0]?.attempts[0]?.generationError).toBe('provider unavailable');
    expect(result.results[0]?.aggregateResult.failures.some(f => f.code === 'GENERATION_ERROR')).toBe(true);
    expect(result.metrics.failureRateByCategory.GENERATION_ERROR).toBe(1);
  });
});
