import { describe, it, expect } from 'vitest';
import { defineContract } from '../../src/core/define-contract.js';
import { evaluate } from '../../src/core/evaluate.js';

describe('Evaluation Engine', () => {
  it('should evaluate contract with passing invariants and assertions', async () => {
    const contract = defineContract({
      name: 'simple-pass',
      invariants: [
        {
          name: 'check-non-empty',
          check: ctx => ctx.rawOutput.length > 0,
        },
      ],
      assertions: [
        {
          name: 'soft-length-check',
          check: ctx => ({
            pass: true,
            score: 0.95,
          }),
        },
      ],
    });

    const result = await evaluate(contract, {
      input: 'Say hello',
      output: 'Hello, World!',
    });

    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
    expect(result.checks).toHaveLength(2);
    expect(result.rawOutput).toBe('Hello, World!');
    expect(result.normalizedOutput).toBe('Hello, World!');
  });

  it('should capture invariant failure with stable failure code and failure details', async () => {
    const contract = defineContract({
      name: 'failing-invariant',
      invariants: [
        {
          name: 'must-contain-keyword',
          code: 'MISSING_REQUIRED_INFORMATION',
          check: ctx => {
            const has = ctx.rawOutput.includes('URGENT');
            return {
              pass: has,
              code: 'MISSING_REQUIRED_INFORMATION',
              message: 'Output missing URGENT keyword.',
            };
          },
        },
      ],
    });

    const result = await evaluate(contract, {
      input: 'Alert message',
      output: 'Standard regular message',
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.code).toBe('MISSING_REQUIRED_INFORMATION');
    expect(result.failures[0]?.assertionName).toBe('must-contain-keyword');
  });

  it('should support plain boolean assertion functions', async () => {
    const contract = defineContract({
      name: 'boolean-fns',
      invariants: [
        ctx => ctx.normalizedOutput.startsWith('Prefix:'),
      ],
    });

    const resultPass = await evaluate(contract, { input: '', output: 'Prefix: data' });
    expect(resultPass.passed).toBe(true);

    const resultFail = await evaluate(contract, { input: '', output: 'No prefix' });
    expect(resultFail.passed).toBe(false);
    expect(resultFail.failures[0]?.code).toBe('CUSTOM_INVARIANT_FAILURE');
  });

  it('namespaces evidence so checks cannot overwrite each other', async () => {
    const contract = defineContract({
      name: 'evidence-isolation',
      invariants: [
        { name: 'first', check: () => ({ pass: true, evidence: { value: 1 } }) },
        { name: 'second', check: () => ({ pass: true, evidence: { value: 2 } }) },
      ],
    });

    const result = await evaluate(contract, { input: '', output: 'ok' });
    expect(result.evidence).toEqual({ first: { value: 1 }, second: { value: 2 } });
  });
});
