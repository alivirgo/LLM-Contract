import type { SchemaAdapter, SchemaValidationResult } from '../../types/adapter.js';
import type { FailureDetail } from '../../types/failure.js';

/**
 * Universal adapter for Valibot schemas.
 *
 * @example
 * ```ts
 * import * as v from 'valibot';
 * import { valibotAdapter } from 'llm-contract/adapters/valibot';
 *
 * const schema = v.object({
 *   title: v.string(),
 *   count: v.number()
 * });
 *
 * const adapter = valibotAdapter(schema);
 * ```
 */
export function valibotAdapter<T = any>(valibotSchema: any): SchemaAdapter<T> {
  return {
    name: 'ValibotSchema',
    async validate(data: unknown): Promise<SchemaValidationResult<T>> {
      try {
        // Valibot v0.30+ uses safeParse(schema, data) or safeParseAsync
        // Check if valibot is imported or schema has parse
        let res: any;
        if (typeof (valibotSchema as any)._run === 'function' || (valibotSchema as any).type) {
          // Dynamic import of safeParse or direct call if available
          const valibot = await import('valibot').catch(() => null);
          if (valibot && typeof (valibot as any).safeParse === 'function') {
            res = (valibot as any).safeParse(valibotSchema, data);
          } else {
            throw new Error('valibot package is required for valibotAdapter. Please install valibot.');
          }
        } else if (typeof valibotSchema.safeParse === 'function') {
          res = valibotSchema.safeParse(data);
        } else {
          throw new Error('Provided schema object is not a recognized Valibot schema.');
        }

        if (res.success) {
          return {
            success: true,
            data: (res.output ?? res.data) as T,
          };
        }

        const errors: FailureDetail[] = [];
        const issues = res.issues ?? [];

        for (const issue of issues) {
          const path = issue.path?.map((p: any) => p.key ?? p) ?? [];
          errors.push({
            code: 'SCHEMA_VIOLATION',
            message: issue.message || 'Valibot validation error',
            severity: 'error',
            path,
            expected: issue.expected,
            actual: issue.received,
            evidence: issue,
          });
        }

        return {
          success: false,
          errors: errors.length > 0 ? errors : [{
            code: 'SCHEMA_VIOLATION',
            message: 'Schema validation failed',
            severity: 'error',
          }],
        };
      } catch (err: any) {
        return {
          success: false,
          errors: [{
            code: 'SCHEMA_VIOLATION',
            message: `Valibot validation exception: ${err.message}`,
            severity: 'error',
          }],
        };
      }
    },
  };
}
