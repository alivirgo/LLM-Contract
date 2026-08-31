import type { FailureCode, FailureSeverity } from './failure.js';
import type { SchemaAdapter } from './adapter.js';

export interface EvaluationContext<TContext = unknown, TMeta = Record<string, unknown>> {
  input: string | unknown;
  output: string;
  context?: TContext;
  metadata?: TMeta;
}

export interface NormalizationOptions {
  /** Strip markdown code fences (```json ... ``` or ``` ... ```) if present. Default: false */
  stripCodeFences?: boolean;
  /** Trim leading/trailing whitespace. Default: false */
  trimWhitespace?: boolean;
  /** Extract first JSON object or array from surrounding free text. Default: false */
  extractJsonBlock?: boolean;
  /** Custom non-destructive transformer function */
  customTransform?: (raw: string) => string;
}

export interface AssertionContext<TOutput = unknown, TContext = unknown, TMeta = Record<string, unknown>> {
  input: string | unknown;
  rawOutput: string;
  normalizedOutput: string;
  parsedOutput?: TOutput;
  context?: TContext;
  metadata?: TMeta;
}

export interface AssertionResult {
  pass: boolean;
  name?: string;
  code?: FailureCode;
  message?: string;
  severity?: FailureSeverity;
  score?: number; // 0.0 to 1.0 (defaults to 1.0 for pass, 0.0 for fail)
  weight?: number; // weight used for score calculation (default: 1.0)
  path?: string | (string | number)[];
  evidence?: unknown;
  expected?: unknown;
  actual?: unknown;
}

export type AssertionFunction<TOutput = unknown, TContext = unknown, TMeta = Record<string, unknown>> = (
  ctx: AssertionContext<TOutput, TContext, TMeta>
) => Promise<AssertionResult | boolean> | AssertionResult | boolean;

export interface Invariant<TOutput = unknown, TContext = unknown, TMeta = Record<string, unknown>> {
  name: string;
  description?: string;
  code?: FailureCode;
  severity?: FailureSeverity;
  check: AssertionFunction<TOutput, TContext, TMeta>;
}

export interface Assertion<TOutput = unknown, TContext = unknown, TMeta = Record<string, unknown>> {
  name: string;
  description?: string;
  code?: FailureCode;
  severity?: FailureSeverity;
  weight?: number;
  isHardAssertion?: boolean; // If true, assertion failure causes contract failure (default: false for soft evaluators, true for invariants)
  check: AssertionFunction<TOutput, TContext, TMeta>;
}

export interface ContractOptions {
  /** If true, parsing error will immediately abort subsequent assertions */
  bailOnParseError?: boolean;
  /** If true, schema violation will immediately abort subsequent assertions */
  bailOnSchemaError?: boolean;
  /** Minimum aggregate score required for contract to pass (default: 1.0 if all hard assertions pass) */
  minPassingScore?: number;
  /** Default timeout per assertion in ms (default: 5000) */
  timeoutMs?: number;
}

export interface ContractDefinition<
  TOutput = unknown,
  TContext = unknown,
  TMeta = Record<string, unknown>
> {
  name: string;
  description?: string;
  version?: string;
  schema?: SchemaAdapter<TOutput>;
  normalization?: NormalizationOptions;
  invariants?: (Invariant<TOutput, TContext, TMeta> | AssertionFunction<TOutput, TContext, TMeta>)[];
  assertions?: (Assertion<TOutput, TContext, TMeta> | AssertionFunction<TOutput, TContext, TMeta>)[];
  options?: ContractOptions;
}
