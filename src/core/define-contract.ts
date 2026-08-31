import type {
  ContractDefinition,
  ContractOptions,
  Invariant,
  Assertion,
  AssertionFunction,
} from '../types/contract.js';
import type { SchemaAdapter } from '../types/adapter.js';

export interface ContractBuilder<
  TOutput = unknown,
  TContext = unknown,
  TMeta = Record<string, unknown>
> {
  withSchema<TNewOutput>(
    schema: SchemaAdapter<TNewOutput>
  ): ContractBuilder<TNewOutput, TContext, TMeta>;
  addInvariant(
    invariant: Invariant<TOutput, TContext, TMeta> | AssertionFunction<TOutput, TContext, TMeta>
  ): ContractBuilder<TOutput, TContext, TMeta>;
  addAssertion(
    assertion: Assertion<TOutput, TContext, TMeta> | AssertionFunction<TOutput, TContext, TMeta>
  ): ContractBuilder<TOutput, TContext, TMeta>;
  setOptions(options: ContractOptions): ContractBuilder<TOutput, TContext, TMeta>;
  build(): ContractDefinition<TOutput, TContext, TMeta>;
}

export function defineContract<
  TOutput = unknown,
  TContext = unknown,
  TMeta = Record<string, unknown>
>(
  definition: ContractDefinition<TOutput, TContext, TMeta>
): ContractDefinition<TOutput, TContext, TMeta> {
  if (!definition.name || typeof definition.name !== 'string') {
    throw new Error('Contract name is required and must be a non-empty string.');
  }

  return {
    name: definition.name,
    description: definition.description,
    version: definition.version ?? '1.0.0',
    schema: definition.schema,
    normalization: definition.normalization ?? {},
    invariants: definition.invariants ? [...definition.invariants] : [],
    assertions: definition.assertions ? [...definition.assertions] : [],
    options: {
      bailOnParseError: false,
      bailOnSchemaError: false,
      timeoutMs: 5000,
      ...definition.options,
    },
  };
}

export function createContractBuilder<
  TOutput = unknown,
  TContext = unknown,
  TMeta = Record<string, unknown>
>(name: string, description?: string): ContractBuilder<TOutput, TContext, TMeta> {
  const definition: ContractDefinition<TOutput, TContext, TMeta> = {
    name,
    description,
    invariants: [],
    assertions: [],
    normalization: {},
    options: {},
  };

  const builder: ContractBuilder<TOutput, TContext, TMeta> = {
    withSchema<TNewOutput>(schema: SchemaAdapter<TNewOutput>) {
      (definition as any).schema = schema;
      return builder as unknown as ContractBuilder<TNewOutput, TContext, TMeta>;
    },
    addInvariant(inv) {
      definition.invariants = definition.invariants || [];
      definition.invariants.push(inv);
      return builder;
    },
    addAssertion(ass) {
      definition.assertions = definition.assertions || [];
      definition.assertions.push(ass);
      return builder;
    },
    setOptions(opts) {
      definition.options = { ...definition.options, ...opts };
      return builder;
    },
    build() {
      return defineContract(definition);
    },
  };

  return builder;
}
