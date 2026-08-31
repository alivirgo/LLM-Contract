import type { CIPolicy, PolicyEvaluationResult, PolicyViolation } from '../types/policy.js';
import type { SuiteResult } from '../types/suite.js';

/**
 * Evaluates suite metrics against a CI policy to determine pass/fail status and process exit code.
 */
export function evaluatePolicy(
  suiteResult: SuiteResult,
  policy: CIPolicy
): PolicyEvaluationResult {
  const violations: PolicyViolation[] = [];
  const warnings: PolicyViolation[] = [];
  const metrics = suiteResult.metrics;

  // 1. Check minimum pass rate
  if (policy.minimumPassRate !== undefined) {
    if (metrics.passRate < policy.minimumPassRate) {
      violations.push({
        rule: 'minimumPassRate',
        expected: `${(policy.minimumPassRate * 100).toFixed(1)}%`,
        actual: `${(metrics.passRate * 100).toFixed(1)}%`,
        message: `Pass rate (${(metrics.passRate * 100).toFixed(1)}%) is below required minimum (${(policy.minimumPassRate * 100).toFixed(1)}%).`,
        severity: 'error',
      });
    }
  }

  // 2. Check maximum regression rate
  if (policy.maximumRegressionRate !== undefined) {
    if (metrics.regressionRate > policy.maximumRegressionRate) {
      violations.push({
        rule: 'maximumRegressionRate',
        expected: `< ${(policy.maximumRegressionRate * 100).toFixed(1)}%`,
        actual: `${(metrics.regressionRate * 100).toFixed(1)}% (${metrics.regressionsCount} regressions)`,
        message: `Regression rate (${(metrics.regressionRate * 100).toFixed(1)}%) exceeds maximum allowed threshold (${(policy.maximumRegressionRate * 100).toFixed(1)}%).`,
        severity: 'error',
      });
    }
  }

  // 3. Check maximum flaky rate
  if (policy.maximumFlakyRate !== undefined) {
    if (metrics.flakyRate > policy.maximumFlakyRate) {
      violations.push({
        rule: 'maximumFlakyRate',
        expected: `< ${(policy.maximumFlakyRate * 100).toFixed(1)}%`,
        actual: `${(metrics.flakyRate * 100).toFixed(1)}% (${metrics.flakyCasesCount} flaky cases)`,
        message: `Flaky rate (${(metrics.flakyRate * 100).toFixed(1)}%) exceeds maximum threshold (${(policy.maximumFlakyRate * 100).toFixed(1)}%).`,
        severity: 'error',
      });
    }
  }

  // 4. Check minimum average score
  if (policy.minimumAverageScore !== undefined) {
    if (metrics.averageScore < policy.minimumAverageScore) {
      violations.push({
        rule: 'minimumAverageScore',
        expected: policy.minimumAverageScore.toFixed(2),
        actual: metrics.averageScore.toFixed(2),
        message: `Average score (${metrics.averageScore.toFixed(2)}) is below required minimum (${policy.minimumAverageScore.toFixed(2)}).`,
        severity: 'error',
      });
    }
  }

  // 5. Check zero-tolerance failures
  if (policy.zeroToleranceFailures && policy.zeroToleranceFailures.length > 0) {
    for (const code of policy.zeroToleranceFailures) {
      const count = metrics.failureRateByCategory[code] || 0;
      if (count > 0) {
        violations.push({
          rule: `zeroToleranceFailures(${code})`,
          expected: '0',
          actual: String(count),
          message: `Zero tolerance failure detected: ${count} instance(s) of category '${code}'.`,
          severity: 'error',
        });
      }
    }
  }

  // 6. Check category limits
  if (policy.categoryFailureLimits) {
    for (const [code, limit] of Object.entries(policy.categoryFailureLimits)) {
      if (limit !== undefined) {
        const count = metrics.failureRateByCategory[code as any] || 0;
        if (count > limit) {
          violations.push({
            rule: `categoryFailureLimit(${code})`,
            expected: `max ${limit}`,
            actual: String(count),
            message: `Failure count for category '${code}' (${count}) exceeded limit (${limit}).`,
            severity: 'error',
          });
        }
      }
    }
  }

  const compliant = violations.length === 0;
  const exitCode = compliant ? 0 : 1;

  return {
    policyName: policy.name ?? 'CustomCIPolicy',
    compliant,
    exitCode,
    violations,
    warnings,
    metrics,
  };
}
