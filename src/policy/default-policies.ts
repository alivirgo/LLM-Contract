import type { CIPolicy } from '../types/policy.js';

export const strictCIPolicy: CIPolicy = {
  name: 'Strict CI Policy',
  description: 'Zero tolerance for any regression, schema violation, or ungrounded claim; 100% pass rate required.',
  minimumPassRate: 1.0,
  maximumRegressionRate: 0.0,
  maximumFlakyRate: 0.0,
  zeroToleranceFailures: [
    'SCHEMA_VIOLATION',
    'UNSUPPORTED_CLAIM',
    'FACT_CONTRADICTION',
    'PARSE_ERROR',
  ],
};

export const standardCIPolicy: CIPolicy = {
  name: 'Standard CI Policy',
  description: 'Production standard policy: >=95% pass rate, zero regressions, max 5% flaky rate.',
  minimumPassRate: 0.95,
  maximumRegressionRate: 0.0,
  maximumFlakyRate: 0.05,
  minimumAverageScore: 0.9,
  zeroToleranceFailures: ['SCHEMA_VIOLATION', 'PARSE_ERROR'],
};

export const permissiveCIPolicy: CIPolicy = {
  name: 'Permissive CI Policy',
  description: 'Relaxed policy for early exploration: >=80% pass rate, max 5% regression rate.',
  minimumPassRate: 0.8,
  maximumRegressionRate: 0.05,
  maximumFlakyRate: 0.15,
};
