import { describe, it, expect } from 'vitest';
import { jsonSchemaAdapter } from '../../../src/adapters/schema/json-schema.js';
import { defineContract } from '../../../src/core/define-contract.js';
import { evaluate } from '../../../src/core/evaluate.js';

describe('Zero-Dependency JSON Schema Adapter', () => {
  const schema = {
    type: 'object',
    required: ['id', 'email'],
    properties: {
      id: { type: 'string', minLength: 3 },
      email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' },
      count: { type: 'integer', minimum: 0, maximum: 100 },
    },
  };

  it('should validate valid data matching json schema', async () => {
    const adapter = jsonSchemaAdapter(schema);
    const contract = defineContract({
      name: 'json-schema-contract',
      schema: adapter,
    });

    const res = await evaluate(contract, {
      input: '',
      output: JSON.stringify({
        id: 'ABC',
        email: 'test@example.com',
        count: 10,
      }),
    });

    expect(res.passed).toBe(true);
  });

  it('should fail when required properties are missing', async () => {
    const adapter = jsonSchemaAdapter(schema);
    const contract = defineContract({
      name: 'json-schema-contract',
      schema: adapter,
    });

    const res = await evaluate(contract, {
      input: '',
      output: JSON.stringify({
        id: 'ABC',
        // missing email
      }),
    });

    expect(res.passed).toBe(false);
    expect(res.failures[0]?.code).toBe('SCHEMA_VIOLATION');
    expect(res.failures[0]?.message).toContain("Missing required property 'email'");
  });
});
