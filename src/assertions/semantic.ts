import type {
  Assertion,
  AssertionContext,
  AssertionFunction,
} from '../types/contract.js';
import type { FailureCode, FailureSeverity } from '../types/failure.js';

export type ValueExtractor<TOutput = any> =
  | string
  | (string | number)[]
  | ((ctx: AssertionContext<TOutput>) => unknown);

export interface RangeOptions {
  min?: number;
  max?: number;
  inclusive?: boolean;
  name?: string;
  isHard?: boolean;
}

/**
 * Safely extracts a nested value by path or extractor function.
 */
export function extractValue(target: unknown, pathOrExtractor: ValueExtractor, ctx?: AssertionContext): unknown {
  if (typeof pathOrExtractor === 'function' && ctx) {
    return pathOrExtractor(ctx);
  }

  let obj = target;
  if (typeof obj === 'string' && (obj.trim().startsWith('{') || obj.trim().startsWith('['))) {
    try {
      obj = JSON.parse(obj);
    } catch {
      // Keep as string if not valid JSON
    }
  }

  if (obj === undefined || obj === null) {
    return undefined;
  }

  const keys = Array.isArray(pathOrExtractor)
    ? pathOrExtractor
    : typeof pathOrExtractor === 'string'
      ? pathOrExtractor.split('.').filter(Boolean)
      : [];

  let current: any = obj;
  for (const key of keys) {
    if (current === undefined || current === null || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

/**
 * Asserts that a numerical field falls within the specified range.
 */
export function assertNumericRange(
  pathOrExtractor: ValueExtractor,
  options: RangeOptions
): Assertion {
  const inclusive = options.inclusive !== false;
  const pathLabel = typeof pathOrExtractor === 'string' ? pathOrExtractor : 'numericValue';
  const name = options.name ?? `assertNumericRange(${pathLabel})`;

  return {
    name,
    code: 'NUMERIC_OUT_OF_BOUNDS',
    isHardAssertion: options.isHard ?? true,
    check: (ctx: AssertionContext) => {
      const val = extractValue(ctx.parsedOutput ?? ctx.normalizedOutput, pathOrExtractor, ctx);

      if (val === undefined || val === null) {
        return {
          pass: false,
          score: 0.0,
          code: 'NUMERIC_OUT_OF_BOUNDS',
          message: `Field '${pathLabel}' not found or is null/undefined.`,
          path: pathLabel,
        };
      }

      const num = typeof val === 'number' ? val : Number(val);
      if (isNaN(num)) {
        return {
          pass: false,
          score: 0.0,
          code: 'NUMERIC_OUT_OF_BOUNDS',
          message: `Field '${pathLabel}' is not a valid number (got ${JSON.stringify(val)}).`,
          path: pathLabel,
          actual: val,
        };
      }

      let passes = true;
      if (options.min !== undefined) {
        passes = inclusive ? num >= options.min : num > options.min;
      }
      if (passes && options.max !== undefined) {
        passes = inclusive ? num <= options.max : num < options.max;
      }

      if (!passes) {
        return {
          pass: false,
          score: 0.0,
          code: 'NUMERIC_OUT_OF_BOUNDS',
          message: `Value ${num} at '${pathLabel}' is outside required range [${options.min ?? '-∞'}, ${options.max ?? '+∞'}].`,
          path: pathLabel,
          expected: { min: options.min, max: options.max, inclusive },
          actual: num,
        };
      }

      return {
        pass: true,
        score: 1.0,
        evidence: { path: pathLabel, value: num },
      };
    },
  };
}

export interface EnumOptions {
  name?: string;
  isHard?: boolean;
}

/**
 * Asserts that a value belongs to an allowed set of enum values.
 */
export function assertEnum<TVal extends string | number | boolean>(
  pathOrExtractor: ValueExtractor,
  allowedValues: readonly TVal[] | TVal[],
  options?: EnumOptions
): Assertion {
  const pathLabel = typeof pathOrExtractor === 'string' ? pathOrExtractor : 'enumValue';
  const name = options?.name ?? `assertEnum(${pathLabel})`;
  const allowedSet = new Set(allowedValues);

  return {
    name,
    code: 'ENUM_VIOLATION',
    isHardAssertion: options?.isHard ?? true,
    check: (ctx: AssertionContext) => {
      const val = extractValue(ctx.parsedOutput ?? ctx.normalizedOutput, pathOrExtractor, ctx);

      if (val === undefined || !allowedSet.has(val as TVal)) {
        return {
          pass: false,
          score: 0.0,
          code: 'ENUM_VIOLATION',
          message: `Value ${JSON.stringify(val)} at '${pathLabel}' is not one of allowed values: [${allowedValues.join(', ')}].`,
          path: pathLabel,
          expected: allowedValues,
          actual: val,
        };
      }

      return {
        pass: true,
        score: 1.0,
        evidence: { path: pathLabel, value: val },
      };
    },
  };
}

export interface NoDuplicatesOptions {
  name?: string;
  key?: string; // Optional property key if array contains objects
  isHard?: boolean;
}

/**
 * Asserts that an array in the output contains no duplicate items or keys.
 */
export function assertNoDuplicates(
  pathOrExtractor: ValueExtractor,
  options?: NoDuplicatesOptions
): Assertion {
  const pathLabel = typeof pathOrExtractor === 'string' ? pathOrExtractor : 'array';
  const name = options?.name ?? `assertNoDuplicates(${pathLabel})`;

  return {
    name,
    code: 'DUPLICATE_CONTENT_DETECTED',
    isHardAssertion: options?.isHard ?? false,
    check: (ctx: AssertionContext) => {
      const val = extractValue(ctx.parsedOutput ?? ctx.normalizedOutput, pathOrExtractor, ctx);

      if (!Array.isArray(val)) {
        return {
          pass: false,
          score: 0.0,
          code: 'DUPLICATE_CONTENT_DETECTED',
          message: `Target at '${pathLabel}' is not an array.`,
          path: pathLabel,
        };
      }

      const seen = new Set<string>();
      const duplicates: any[] = [];

      for (const item of val) {
        let serialized: string;
        if (options?.key && item && typeof item === 'object') {
          serialized = JSON.stringify(item[options.key]);
        } else {
          serialized = JSON.stringify(item);
        }

        if (seen.has(serialized)) {
          duplicates.push(item);
        } else {
          seen.add(serialized);
        }
      }

      if (duplicates.length > 0) {
        return {
          pass: false,
          score: 0.0,
          code: 'DUPLICATE_CONTENT_DETECTED',
          message: `Found ${duplicates.length} duplicate item(s) in '${pathLabel}'.`,
          path: pathLabel,
          evidence: { duplicates },
          actual: val,
        };
      }

      return {
        pass: true,
        score: 1.0,
        evidence: { totalItems: val.length },
      };
    },
  };
}

export interface CustomAssertionOptions {
  description?: string;
  code?: FailureCode;
  severity?: FailureSeverity;
  weight?: number;
  isHard?: boolean;
}

/**
 * Helper to build custom synchronous or asynchronous assertions.
 */
export function assertCustom<TOutput = unknown, TContext = unknown, TMeta = Record<string, unknown>>(
  name: string,
  checkFn: AssertionFunction<TOutput, TContext, TMeta>,
  options?: CustomAssertionOptions
): Assertion<TOutput, TContext, TMeta> {
  return {
    name,
    description: options?.description,
    code: options?.code ?? 'CUSTOM_INVARIANT_FAILURE',
    severity: options?.severity ?? (options?.isHard ? 'error' : 'warning'),
    weight: options?.weight ?? 1.0,
    isHardAssertion: options?.isHard ?? false,
    check: checkFn,
  };
}
