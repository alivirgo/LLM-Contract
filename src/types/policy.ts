import type { FailureCode } from './failure.js';
import type { RunMetrics } from './suite.js';

export interface CIPolicy {
  name?: string;
  description?: string;
  /** Minimum acceptable pass rate (e.g. 0.95 for 95%) */
  minimumPassRate?: number;
  /** Maximum acceptable regression rate compared to baseline (e.g. 0.00 for 0%) */
  maximumRegressionRate?: number;
  /** Maximum allowed proportion of flaky test cases (e.g. 0.05 for 5%) */
  maximumFlakyRate?: number;
  /** Minimum average score across all tests (e.g. 0.85) */
  minimumAverageScore?: number;
  /** Failure codes that must NEVER occur in any test case (e.g. ['SCHEMA_VIOLATION', 'UNSUPPORTED_CLAIM']) */
  zeroToleranceFailures?: FailureCode[];
  /** Maximum allowed failures per specific category */
  categoryFailureLimits?: Partial<Record<FailureCode, number>>;
}

export interface PolicyViolation {
  rule: string;
  expected: string | number;
  actual: string | number;
  message: string;
  severity: 'error' | 'warning';
}

export interface PolicyEvaluationResult {
  policyName: string;
  compliant: boolean;
  exitCode: number; // 0 for compliant, 1 for failure
  violations: PolicyViolation[];
  warnings: PolicyViolation[];
  metrics: RunMetrics;
}
