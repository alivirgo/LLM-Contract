import { describe, it, expect } from 'vitest';
import { assertValidJson, assertCodeBlock } from '../../../src/assertions/syntactic.js';
import { defineContract } from '../../../src/core/define-contract.js';
import { evaluate } from '../../../src/core/evaluate.js';

describe('Syntactic Assertions', () => {
  it('assertValidJson should pass on valid JSON and fail on malformed JSON', async () => {
    const contract = defineContract({
      name: 'json-contract',
      invariants: [assertValidJson()],
    });

    const passRes = await evaluate(contract, { input: '', output: '{"status": "ok", "items": [1, 2]}' });
    expect(passRes.passed).toBe(true);

    const failRes = await evaluate(contract, { input: '', output: '{"status": "ok", broken' });
    expect(failRes.passed).toBe(false);
    expect(failRes.failures[0]?.code).toBe('PARSE_ERROR');
  });

  it('assertCodeBlock should validate presence and language tags', async () => {
    const contract = defineContract({
      name: 'code-contract',
      invariants: [assertCodeBlock({ language: 'typescript' })],
    });

    const passRes = await evaluate(contract, {
      input: '',
      output: '```typescript\nconst x: number = 42;\n```',
    });
    expect(passRes.passed).toBe(true);

    const failRes = await evaluate(contract, {
      input: '',
      output: '```python\nx = 42\n```',
    });
    expect(failRes.passed).toBe(false);
    expect(failRes.failures[0]?.code).toBe('FORMAT_VIOLATION');
  });
});
