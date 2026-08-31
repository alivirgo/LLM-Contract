import type { Invariant, AssertionContext } from '../types/contract.js';
import type { SchemaAdapter } from '../types/adapter.js';

export interface SchemaAssertionOptions {
  name?: string;
}

/**
 * Validates output against a SchemaAdapter (Zod, Valibot, JSON Schema, etc.)
 */
export function assertSchema<T>(
  schema: SchemaAdapter<T>,
  options?: SchemaAssertionOptions
): Invariant<T> {
  const name = options?.name ?? `assertSchema(${schema.name})`;

  return {
    name,
    code: 'SCHEMA_VIOLATION',
    severity: 'error',
    check: async (ctx: AssertionContext<T>) => {
      let dataToValidate: unknown = ctx.parsedOutput;

      if (dataToValidate === undefined) {
        try {
          dataToValidate = JSON.parse(ctx.normalizedOutput);
        } catch (err: any) {
          return {
            pass: false,
            score: 0.0,
            code: 'PARSE_ERROR',
            message: `Cannot validate schema: output is not valid JSON (${err.message})`,
            actual: ctx.normalizedOutput,
          };
        }
      }

      const result = await schema.validate(dataToValidate);

      if (result.success) {
        return {
          pass: true,
          score: 1.0,
        };
      }

      const firstError = result.errors[0];
      return {
        pass: false,
        score: 0.0,
        code: 'SCHEMA_VIOLATION',
        message: firstError ? firstError.message : 'Schema validation failed',
        evidence: { errors: result.errors },
        path: firstError?.path,
        expected: firstError?.expected,
        actual: firstError?.actual,
      };
    },
  };
}
