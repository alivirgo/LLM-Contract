import type { SuiteResult } from '../types/suite.js';
import type { EvaluationResult } from '../types/result.js';
import type { PolicyEvaluationResult } from '../types/policy.js';

export interface JSONReportPayload {
  suite?: SuiteResult;
  evaluation?: EvaluationResult;
  policy?: PolicyEvaluationResult;
  timestamp: string;
}

/**
 * Serializes suite results or evaluation results into structured JSON.
 */
export function formatJsonReport(
  payload: JSONReportPayload | SuiteResult | EvaluationResult,
  pretty = true
): string {
  return JSON.stringify(payload, null, pretty ? 2 : undefined);
}
