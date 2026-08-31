import { describe, it, expect } from 'vitest';
import { defineContract } from '../../src/core/define-contract.js';
import { runSuite } from '../../src/suite/runner.js';
import { evaluatePolicy } from '../../src/policy/evaluator.js';
import { standardCIPolicy } from '../../src/policy/default-policies.js';
import { mustPreserveFacts, mustNotInvent, assertNoContradiction } from '../../src/assertions/grounding.js';
import { mustAskWhenUncertain } from '../../src/assertions/behavioral.js';
import { formatMarkdownReport } from '../../src/reporters/markdown.js';
import { formatHtmlReport } from '../../src/reporters/html.js';
import type { TestCase } from '../../src/types/suite.js';

describe('End-to-End AI Regression Detection Workflow', () => {
  const supportContract = defineContract({
    name: 'support-agent-contract',
    invariants: [
      mustPreserveFacts({ threshold: 1.0 }),
      mustNotInvent({ mode: 'strict' }),
      mustAskWhenUncertain({
        isAmbiguousInput: (input) => typeof input === 'string' && input.includes('without ID'),
      }),
      assertNoContradiction(),
    ],
  });

  const dataset: TestCase[] = [
    {
      id: 'case-1-order-status',
      input: 'Where is my order?',
      context: 'Order ORD-5541 was shipped on 2026-09-01 via FedEx tracking #FDX-9988.',
      contract: supportContract,
      baselineOutcome: { passed: true, score: 1.0 },
    },
    {
      id: 'case-2-refund-eligibility',
      input: 'Can I get a full refund for item ITEM-90?',
      context: 'Item ITEM-90 was purchased 10 days ago. Returns are accepted within 30 days. It is refundable.',
      contract: supportContract,
      baselineOutcome: { passed: true, score: 1.0 },
    },
    {
      id: 'case-3-missing-info-clarify',
      input: 'Please cancel my order without ID provided.',
      context: 'User has multiple orders.',
      contract: supportContract,
      baselineOutcome: { passed: true, score: 1.0 },
    },
    {
      id: 'case-4-previously-failing-edge-case',
      input: 'Is VIP tier free?',
      context: 'VIP tier costs $99/mo. It is not free.',
      contract: supportContract,
      baselineOutcome: { passed: false, score: 0.0, failureCodes: ['FACT_CONTRADICTION'] },
    },
  ];

  it('should detect prompt regression when new prompt causes contradiction or drops facts', async () => {
    // Model v2 behavior:
    // - Case 1: PASS (Preserves facts)
    // - Case 2: REGRESSION! (Model incorrectly says "ITEM-90 is non-refundable" -> contradiction!)
    // - Case 3: PASS (Asks clarifying question)
    // - Case 4: FIX! (Correctly states VIP tier costs $99/mo)
    const modelV2Responses: Record<string, string> = {
      'case-1-order-status': 'Your order ORD-5541 was shipped on 2026-09-01 via FedEx #FDX-9988.',
      'case-2-refund-eligibility': 'Item ITEM-90 is non-refundable unfortunately.',
      'case-3-missing-info-clarify': 'Could you please clarify your order ID so I can process the cancellation?',
      'case-4-previously-failing-edge-case': 'VIP tier costs $99/mo and is not free.',
    };

    const suiteResult = await runSuite('support-model-v2', dataset, (testCase: TestCase) => {
      return modelV2Responses[testCase.id] || '';
    });

    // Verify metrics
    expect(suiteResult.metrics.totalCases).toBe(4);
    expect(suiteResult.metrics.passedCases).toBe(3);
    expect(suiteResult.metrics.failedCases).toBe(1);
    expect(suiteResult.metrics.regressionsCount).toBe(1);
    expect(suiteResult.metrics.fixesCount).toBe(1);

    // Verify newly failing cases (regression)
    expect(suiteResult.newlyFailingCases).toHaveLength(1);
    expect(suiteResult.newlyFailingCases[0]?.caseId).toBe('case-2-refund-eligibility');
    const failureCodes = suiteResult.newlyFailingCases[0]?.primaryResult.failures.map(f => f.code);
    expect(failureCodes).toContain('FACT_CONTRADICTION');

    // Verify newly passing cases (fix)
    expect(suiteResult.newlyPassingCases).toHaveLength(1);
    expect(suiteResult.newlyPassingCases[0]?.caseId).toBe('case-4-previously-failing-edge-case');

    // Evaluate CI Policy
    const policyResult = evaluatePolicy(suiteResult, standardCIPolicy);
    expect(policyResult.compliant).toBe(false); // Failed due to 1 regression
    expect(policyResult.exitCode).toBe(1);

    // Verify report generators
    const mdReport = formatMarkdownReport(suiteResult, policyResult);
    expect(mdReport).toContain('case-2-refund-eligibility');
    expect(mdReport).toContain('FACT_CONTRADICTION');

    const htmlReport = formatHtmlReport(suiteResult, policyResult);
    expect(htmlReport).toContain('support-model-v2');
    expect(htmlReport).toContain('REGRESSION');
  });
});
