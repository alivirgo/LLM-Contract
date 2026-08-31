import type { EvaluationResult } from '../types/result.js';
import type { FailureCode } from '../types/failure.js';

export interface BaselineCaseData {
  passed: boolean;
  score: number;
  failureCodes?: FailureCode[];
  output?: string;
}

export type RegressionStatus =
  | 'regression'
  | 'fix'
  | 'unchanged_pass'
  | 'unchanged_fail'
  | 'new_case';

export interface ComparisonResult {
  status: RegressionStatus;
  previousPassed?: boolean;
  previousScore?: number;
  scoreDelta?: number;
  newFailureCodes?: FailureCode[];
  resolvedFailureCodes?: FailureCode[];
}

/**
 * Compares current evaluation results with a historical baseline.
 * Uses structured assertion signals and failure categories instead of naive string diffs.
 */
export function compareWithBaseline(
  currentResult: EvaluationResult,
  baseline?: BaselineCaseData
): ComparisonResult {
  if (!baseline) {
    return {
      status: 'new_case',
    };
  }

  const currentCodes: FailureCode[] = currentResult.failures.map(f => f.code);
  const baselineCodes: FailureCode[] = baseline.failureCodes ?? [];

  const currentSet = new Set(currentCodes);
  const baselineSet = new Set(baselineCodes);

  const newFailureCodes = currentCodes.filter(c => !baselineSet.has(c));
  const resolvedFailureCodes = baselineCodes.filter(c => !currentSet.has(c));

  const scoreDelta = Math.round((currentResult.score - baseline.score) * 10000) / 10000;

  let status: RegressionStatus;

  if (baseline.passed && !currentResult.passed) {
    status = 'regression'; // Crucial: previously passing case broke!
  } else if (!baseline.passed && currentResult.passed) {
    status = 'fix'; // Previously failing case is now fixed!
  } else if (currentResult.passed && baseline.passed) {
    status = 'unchanged_pass';
  } else {
    status = 'unchanged_fail';
  }

  return {
    status,
    previousPassed: baseline.passed,
    previousScore: baseline.score,
    scoreDelta,
    newFailureCodes: newFailureCodes.length > 0 ? newFailureCodes : undefined,
    resolvedFailureCodes: resolvedFailureCodes.length > 0 ? resolvedFailureCodes : undefined,
  };
}
