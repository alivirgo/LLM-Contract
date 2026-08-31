import type { ModelAdapter } from '../../types/adapter.js';

export interface MockModelOptions {
  responses?: Record<string, string> | Map<string, string>;
  defaultResponse?: string;
  delayMs?: number;
  deterministicSeed?: number;
}

/**
 * Creates a mock model adapter for testing and deterministic regression verification.
 */
export function mockModelAdapter(
  responsesOrFn:
    | Record<string, string>
    | ((input: unknown, context?: unknown) => string | Promise<string>),
  options?: MockModelOptions
): ModelAdapter {
  return async (input: unknown, context?: unknown) => {
    if (options?.delayMs && options.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, options.delayMs));
    }

    if (typeof responsesOrFn === 'function') {
      return responsesOrFn(input, context);
    }

    const inputKey = typeof input === 'string' ? input : JSON.stringify(input);

    if (responsesOrFn instanceof Map) {
      if (responsesOrFn.has(inputKey)) {
        return responsesOrFn.get(inputKey)!;
      }
    } else if (typeof responsesOrFn === 'object' && responsesOrFn !== null) {
      if (inputKey in responsesOrFn) {
        return responsesOrFn[inputKey]!;
      }
    }

    return options?.defaultResponse ?? '{"status": "ok"}';
  };
}
