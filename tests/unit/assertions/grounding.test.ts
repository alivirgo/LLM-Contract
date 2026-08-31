import { describe, it, expect } from 'vitest';
import {
  mustPreserveFacts,
  mustNotInvent,
  assertNoContradiction,
  assertCitationsPresent,
} from '../../../src/assertions/grounding.js';
import { defineContract } from '../../../src/core/define-contract.js';
import { evaluate } from '../../../src/core/evaluate.js';
import {
  unsupportedClaimsOutputs,
  contradictoryClaimsOutputs,
} from '../../fixtures/behavioral-fixtures.js';

describe('Grounding & Anti-Hallucination Assertions', () => {
  it('mustPreserveFacts should ensure entities/numbers in context are present in response', async () => {
    const contract = defineContract({
      name: 'preserve-facts',
      invariants: [
        mustPreserveFacts(['AA-102', '14:30', 'Gate 4B', 'LHR']),
      ],
    });

    const passRes = await evaluate(contract, {
      input: 'Flight details?',
      context: unsupportedClaimsOutputs.flightContext,
      output: unsupportedClaimsOutputs.groundedResponse,
    });
    expect(passRes.passed).toBe(true);

    const failRes = await evaluate(contract, {
      input: 'Flight details?',
      context: unsupportedClaimsOutputs.flightContext,
      output: unsupportedClaimsOutputs.hallucinatedFlightNumber,
    });
    expect(failRes.passed).toBe(false);
    expect(failRes.failures[0]?.code).toBe('FACT_CONTRADICTION');
  });

  it('mustNotInvent should detect ungrounded entities in strict mode', async () => {
    const contract = defineContract({
      name: 'anti-invent',
      invariants: [
        mustNotInvent({ mode: 'strict' }),
      ],
    });

    const passRes = await evaluate(contract, {
      input: 'Flight details?',
      context: unsupportedClaimsOutputs.flightContext,
      output: unsupportedClaimsOutputs.groundedResponse,
    });
    expect(passRes.passed).toBe(true);

    const failRes = await evaluate(contract, {
      input: 'Flight details?',
      context: unsupportedClaimsOutputs.flightContext,
      output: unsupportedClaimsOutputs.inventedMealAndAmenities,
    });
    expect(failRes.passed).toBe(false);
    expect(failRes.failures[0]?.code).toBe('UNSUPPORTED_CLAIM');
  });

  it('assertNoContradiction should detect explicit contradictions against context', async () => {
    const contract = defineContract({
      name: 'no-contradiction',
      invariants: [assertNoContradiction()],
    });

    const passRes = await evaluate(contract, {
      input: 'Plan status?',
      context: contradictoryClaimsOutputs.subscriptionContext,
      output: contradictoryClaimsOutputs.consistentOutput,
    });
    expect(passRes.passed).toBe(true);

    const failRes = await evaluate(contract, {
      input: 'Plan status?',
      context: contradictoryClaimsOutputs.subscriptionContext,
      output: contradictoryClaimsOutputs.contradictoryRefundPolicy,
    });
    expect(failRes.passed).toBe(false);
    expect(failRes.failures[0]?.code).toBe('FACT_CONTRADICTION');
  });

  it('assertCitationsPresent should validate presence and format of citations', async () => {
    const contract = defineContract({
      name: 'citations-contract',
      invariants: [
        assertCitationsPresent({ requiredSources: ['doc1', 'doc2'] }),
      ],
    });

    const passRes = await evaluate(contract, {
      input: 'Provide info',
      output: 'According to policy [doc1], returns take 3 days [doc2].',
    });
    expect(passRes.passed).toBe(true);

    const failRes = await evaluate(contract, {
      input: 'Provide info',
      output: 'Returns take 3 days without any source citation.',
    });
    expect(failRes.passed).toBe(false);
    expect(failRes.failures[0]?.code).toBe('CITATION_MISSING');
  });
});
