import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import { valibotAdapter } from '../../../src/adapters/schema/valibot.js';
import { defineContract } from '../../../src/core/define-contract.js';
import { evaluate } from '../../../src/core/evaluate.js';

describe('Valibot Schema Adapter', () => {
  const ProductSchema = v.object({
    sku: v.string(),
    price: v.pipe(v.number(), v.minValue(1)),
  });

  it('should validate and parse compliant Valibot payload', async () => {
    const adapter = valibotAdapter(ProductSchema);
    const contract = defineContract({
      name: 'valibot-product-contract',
      schema: adapter,
    });

    const res = await evaluate(contract, {
      input: '',
      output: JSON.stringify({ sku: 'PROD-99', price: 29.99 }),
    });

    expect(res.passed).toBe(true);
    expect(res.parsedOutput).toEqual({ sku: 'PROD-99', price: 29.99 });
  });

  it('should report failure when schema is violated', async () => {
    const adapter = valibotAdapter(ProductSchema);
    const contract = defineContract({
      name: 'valibot-product-contract',
      schema: adapter,
    });

    const res = await evaluate(contract, {
      input: '',
      output: JSON.stringify({ sku: 'PROD-99', price: -5 }),
    });

    expect(res.passed).toBe(false);
    expect(res.failures[0]?.code).toBe('SCHEMA_VIOLATION');
  });
});
