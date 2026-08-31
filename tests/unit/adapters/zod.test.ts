import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { zodAdapter } from '../../../src/adapters/schema/zod.js';
import { defineContract } from '../../../src/core/define-contract.js';
import { evaluate } from '../../../src/core/evaluate.js';

describe('Zod Schema Adapter', () => {
  const UserSchema = z.object({
    id: z.string().min(3),
    role: z.enum(['admin', 'user', 'guest']),
    age: z.number().int().min(18),
  });

  it('should validate and parse compliant JSON payload', async () => {
    const adapter = zodAdapter(UserSchema);
    const contract = defineContract({
      name: 'zod-user-contract',
      schema: adapter,
    });

    const validPayload = JSON.stringify({
      id: 'USR-101',
      role: 'admin',
      age: 30,
    });

    const res = await evaluate(contract, { input: '', output: validPayload });
    expect(res.passed).toBe(true);
    expect(res.parsedOutput).toEqual({ id: 'USR-101', role: 'admin', age: 30 });
  });

  it('should flag schema violation with specific path and error details', async () => {
    const adapter = zodAdapter(UserSchema);
    const contract = defineContract({
      name: 'zod-user-contract',
      schema: adapter,
    });

    const invalidPayload = JSON.stringify({
      id: 'USR-101',
      role: 'superadmin', // Invalid enum
      age: 15, // Age under 18
    });

    const res = await evaluate(contract, { input: '', output: invalidPayload });
    expect(res.passed).toBe(false);
    expect(res.failures.length).toBeGreaterThanOrEqual(1);
    expect(res.failures[0]?.code).toBe('SCHEMA_VIOLATION');
  });
});
