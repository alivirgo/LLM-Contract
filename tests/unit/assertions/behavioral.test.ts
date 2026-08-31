import { describe, it, expect } from 'vitest';
import {
  mustAskWhenUncertain,
  mustRefuse,
  mustNotRefuse,
  assertRequiredTopicsCovered,
  assertForbiddenPhrases,
} from '../../../src/assertions/behavioral.js';
import { defineContract } from '../../../src/core/define-contract.js';
import { evaluate } from '../../../src/core/evaluate.js';
import {
  ambiguousClarificationOutputs,
  adversarialOutputs,
} from '../../fixtures/behavioral-fixtures.js';

describe('Behavioral Assertions', () => {
  it('mustAskWhenUncertain should enforce asking clarifying questions', async () => {
    const contract = defineContract({
      name: 'uncertainty-contract',
      invariants: [mustAskWhenUncertain()],
    });

    const passRes = await evaluate(contract, {
      input: ambiguousClarificationOutputs.ambiguousQuery,
      output: ambiguousClarificationOutputs.correctClarification,
    });
    expect(passRes.passed).toBe(true);

    const failRes = await evaluate(contract, {
      input: ambiguousClarificationOutputs.ambiguousQuery,
      output: ambiguousClarificationOutputs.incorrectAssumption,
    });
    expect(failRes.passed).toBe(false);
    expect(failRes.failures[0]?.code).toBe('UNCERTAINTY_VIOLATION');
  });

  it('mustRefuse should enforce refusal on adversarial attacks', async () => {
    const contract = defineContract({
      name: 'refusal-contract',
      invariants: [mustRefuse({ isHard: true })],
    });

    const passRes = await evaluate(contract, {
      input: adversarialOutputs.injectionPrompt,
      output: adversarialOutputs.safeRefusal,
    });
    expect(passRes.passed).toBe(true);

    const failRes = await evaluate(contract, {
      input: adversarialOutputs.injectionPrompt,
      output: adversarialOutputs.unsafeBypass,
    });
    expect(failRes.passed).toBe(false);
    expect(failRes.failures[0]?.code).toBe('REFUSAL_EXPECTED_BUT_MISSING');
  });

  it('mustNotRefuse should prevent false refusals on benign prompts', async () => {
    const contract = defineContract({
      name: 'benign-contract',
      invariants: [mustNotRefuse()],
    });

    const passRes = await evaluate(contract, {
      input: 'How do I tie a shoelace?',
      output: 'To tie a shoelace, cross the two laces and loop them together.',
    });
    expect(passRes.passed).toBe(true);

    const failRes = await evaluate(contract, {
      input: 'How do I tie a shoelace?',
      output: "I cannot fulfill this request as an AI assistant.",
    });
    expect(failRes.passed).toBe(false);
    expect(failRes.failures[0]?.code).toBe('UNEXPECTED_REFUSAL');
  });

  it('assertRequiredTopicsCovered should enforce concept presence', async () => {
    const contract = defineContract({
      name: 'topics-contract',
      assertions: [
        assertRequiredTopicsCovered(['refund', 'shipping label', '30 days']),
      ],
    });

    const passRes = await evaluate(contract, {
      input: 'How to return?',
      output: 'You can request a refund within 30 days. We provide a prepaid shipping label.',
    });
    expect(passRes.score).toBe(1.0);

    const partialRes = await evaluate(contract, {
      input: 'How to return?',
      output: 'You can request a refund within 30 days.',
    });
    expect(partialRes.score).toBeCloseTo(2 / 3, 2);
  });

  it('assertForbiddenPhrases should detect banned terms', async () => {
    const contract = defineContract({
      name: 'forbidden-contract',
      invariants: [
        assertForbiddenPhrases(['hallucination_secret_key', 'unverified_medical_claim']),
      ],
    });

    const passRes = await evaluate(contract, {
      input: 'Tell me facts',
      output: 'Here is verified scientific info.',
    });
    expect(passRes.passed).toBe(true);

    const failRes = await evaluate(contract, {
      input: 'Tell me facts',
      output: 'Here is unverified_medical_claim for you.',
    });
    expect(failRes.passed).toBe(false);
    expect(failRes.failures[0]?.code).toBe('FORBIDDEN_PHRASE_DETECTED');
  });
});
