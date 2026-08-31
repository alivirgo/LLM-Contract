import type { JudgeAdapter } from '../../types/adapter.js';

export interface CreateJudgeOptions {
  name?: string;
  evaluateClaim?: (
    claim: string,
    context: string,
    options?: Record<string, unknown>
  ) => Promise<{ supported: boolean; confidence: number; explanation?: string }>;
  evaluateSemanticSimilarity?: (
    actual: string,
    expected: string,
    options?: Record<string, unknown>
  ) => Promise<{ similarity: number; confidence: number; explanation?: string }>;
}

/**
 * Creates an external judge adapter for semantic and probabilistic evaluations.
 * Always isolated from deterministic core checks.
 */
export function createJudgeAdapter(options: CreateJudgeOptions): JudgeAdapter {
  return {
    name: options.name ?? 'CustomJudge',
    evaluateClaim: options.evaluateClaim,
    evaluateSemanticSimilarity: options.evaluateSemanticSimilarity,
  };
}
