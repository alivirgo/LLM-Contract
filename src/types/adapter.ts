import type { FailureDetail } from './failure.js';

export interface SchemaValidationSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface SchemaValidationFailure {
  success: false;
  errors: FailureDetail[];
}

export type SchemaValidationResult<T = unknown> =
  | SchemaValidationSuccess<T>
  | SchemaValidationFailure;

/**
 * Universal schema adapter interface allowing Zod, Valibot, JSON Schema, or custom validators.
 */
export interface SchemaAdapter<T = unknown> {
  name: string;
  validate(data: unknown): Promise<SchemaValidationResult<T>> | SchemaValidationResult<T>;
  toJSONSchema?(): Record<string, unknown>;
}

/**
 * Lightweight generic model generation adapter.
 */
export type ModelAdapter = (
  input: string | unknown,
  context?: string | Record<string, unknown>,
  options?: Record<string, unknown>
) => Promise<string> | string;

/**
 * Isolated LLM-as-a-judge / semantic judge adapter.
 */
export interface JudgeAdapter {
  name: string;
  evaluateClaim?(
    claim: string,
    context: string,
    options?: Record<string, unknown>
  ): Promise<{ supported: boolean; confidence: number; explanation?: string }>;
  evaluateSemanticSimilarity?(
    actual: string,
    expected: string,
    options?: Record<string, unknown>
  ): Promise<{ similarity: number; confidence: number; explanation?: string }>;
}
