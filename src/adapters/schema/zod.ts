import type { SchemaAdapter, SchemaValidationResult } from '../../types/adapter.js';
import type { FailureDetail } from '../../types/failure.js';

/**
 * Universal adapter for Zod schemas.
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { zodAdapter } from 'llm-contract/adapters/zod';
 *
 * const schema = z.object({
 *   name: z.string(),
 *   age: z.number().min(0)
 * });
 *
 * const adapter = zodAdapter(schema);
 * ```
 */
export function zodAdapter<T = any>(zodSchema: {
  safeParseAsync?: (data: unknown) => Promise<{ success: boolean; data?: any; error?: any }>;
  safeParse?: (data: unknown) => { success: boolean; data?: any; error?: any };
  description?: string;
}): SchemaAdapter<T> {
  return {
    name: 'ZodSchema',
    async validate(data: unknown): Promise<SchemaValidationResult<T>> {
      let parseResult: any;

      if (typeof zodSchema.safeParseAsync === 'function') {
        parseResult = await zodSchema.safeParseAsync(data);
      } else if (typeof zodSchema.safeParse === 'function') {
        parseResult = zodSchema.safeParse(data);
      } else {
        throw new Error('Provided schema object is not a valid Zod schema.');
      }

      if (parseResult.success) {
        return {
          success: true,
          data: parseResult.data as T,
        };
      }

      const errors: FailureDetail[] = [];
      const zodIssues = parseResult.error?.issues ?? [];

      for (const issue of zodIssues) {
        const pathStr = issue.path ? issue.path.join('.') : undefined;
        errors.push({
          code: 'SCHEMA_VIOLATION',
          message: issue.message || `Schema validation error at ${pathStr ?? 'root'}`,
          severity: 'error',
          path: issue.path,
          expected: issue.expected ?? issue.code,
          actual: issue.received,
          evidence: issue,
        });
      }

      return {
        success: false,
        errors,
      };
    },
  };
}
