import { describe, it, expect } from 'vitest';
import { defineContract, createContractBuilder } from '../../src/core/define-contract.js';

describe('defineContract and Builder', () => {
  it('should create contract with default options', () => {
    const contract = defineContract({
      name: 'test-contract',
    });

    expect(contract.name).toBe('test-contract');
    expect(contract.version).toBe('1.0.0');
    expect(contract.invariants).toHaveLength(0);
    expect(contract.assertions).toHaveLength(0);
  });

  it('should throw when contract name is empty', () => {
    expect(() => defineContract({ name: '' })).toThrow();
  });

  it('should support builder syntax', () => {
    const contract = createContractBuilder('builder-test')
      .addInvariant({
        name: 'inv1',
        check: () => true,
      })
      .addAssertion({
        name: 'ass1',
        check: () => ({ pass: true, score: 0.9 }),
      })
      .setOptions({ minPassingScore: 0.85 })
      .build();

    expect(contract.name).toBe('builder-test');
    expect(contract.invariants).toHaveLength(1);
    expect(contract.assertions).toHaveLength(1);
    expect(contract.options?.minPassingScore).toBe(0.85);
  });
});
