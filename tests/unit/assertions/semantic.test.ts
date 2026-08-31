import { describe, it, expect } from 'vitest';
import {
  assertNumericRange,
  assertEnum,
  assertNoDuplicates,
  assertCustom,
} from '../../../src/assertions/semantic.js';
import { defineContract } from '../../../src/core/define-contract.js';
import { evaluate } from '../../../src/core/evaluate.js';

describe('Semantic Assertions', () => {
  it('assertNumericRange should validate min/max bounds on structured fields', async () => {
    const contract = defineContract({
      name: 'range-contract',
      invariants: [
        assertNumericRange('price', { min: 10, max: 100 }),
      ],
    });

    const passRes = await evaluate(contract, {
      input: '',
      output: JSON.stringify({ price: 49.99 }),
    });
    expect(passRes.passed).toBe(true);

    const failLow = await evaluate(contract, {
      input: '',
      output: JSON.stringify({ price: 5 }),
    });
    expect(failLow.passed).toBe(false);
    expect(failLow.failures[0]?.code).toBe('NUMERIC_OUT_OF_BOUNDS');

    const failHigh = await evaluate(contract, {
      input: '',
      output: JSON.stringify({ price: 150 }),
    });
    expect(failHigh.passed).toBe(false);
  });

  it('assertEnum should enforce allowed value sets', async () => {
    const contract = defineContract({
      name: 'enum-contract',
      invariants: [
        assertEnum('status', ['pending', 'completed', 'failed']),
      ],
    });

    const passRes = await evaluate(contract, {
      input: '',
      output: JSON.stringify({ status: 'completed' }),
    });
    expect(passRes.passed).toBe(true);

    const failRes = await evaluate(contract, {
      input: '',
      output: JSON.stringify({ status: 'unknown_status' }),
    });
    expect(failRes.passed).toBe(false);
    expect(failRes.failures[0]?.code).toBe('ENUM_VIOLATION');
  });

  it('assertNoDuplicates should identify duplicate entries in lists', async () => {
    const contract = defineContract({
      name: 'duplicates-contract',
      invariants: [
        assertNoDuplicates('tags'),
      ],
    });

    const passRes = await evaluate(contract, {
      input: '',
      output: JSON.stringify({ tags: ['ai', 'typescript', 'testing'] }),
    });
    expect(passRes.passed).toBe(true);

    const failRes = await evaluate(contract, {
      input: '',
      output: JSON.stringify({ tags: ['ai', 'testing', 'ai'] }),
    });
    expect(failRes.passed).toBe(false);
    expect(failRes.failures[0]?.code).toBe('DUPLICATE_CONTENT_DETECTED');
  });

  it('assertCustom should support custom async validation logic and failure codes', async () => {
    const contract = defineContract({
      name: 'custom-contract',
      invariants: [
        assertCustom('verify-even', async ctx => {
          const num = Number(ctx.normalizedOutput);
          return {
            pass: num % 2 === 0,
            code: 'CUSTOM_INVARIANT_FAILURE',
            message: 'Number must be even.',
          };
        }),
      ],
    });

    const passRes = await evaluate(contract, { input: '', output: '42' });
    expect(passRes.passed).toBe(true);

    const failRes = await evaluate(contract, { input: '', output: '41' });
    expect(failRes.passed).toBe(false);
  });
});
