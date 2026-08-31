import type { ContractDefinition } from './contract.js';
import type { EvaluationResult } from './result.js';
import type { FailureCode } from './failure.js';

export interface TestCase<
  TOutput = unknown,
  TContext = unknown,
  TMeta = Record<string, unknown>
> {
  id: string;
  description?: string;
  input: string | unknown;
  context?: TContext;
  expected?: unknown;
  contract?: ContractDefinition<TOutput, TContext, TMeta>;
  tags?: string[];
  metadata?: TMeta;
  /** Historical baseline outcome for this specific test case */
  baselineOutcome?: {
    passed: boolean;
    score: number;
    failureCodes?: FailureCode[];
    output?: string;
  };
}

export interface AttemptResult<TOutput = unknown> {
  attemptNumber: number;
  result: EvaluationResult<TOutput>;
  output: string;
  durationMs: number;
  generationError?: string;
}

export interface TestCaseExecutionResult<TOutput = unknown> {
  caseId: string;
  tags?: string[];
  input: unknown;
  context?: unknown;
  expected?: unknown;
  passed: boolean;
  score: number;
  isFlaky: boolean;
  stabilityScore: number; // 1.0 = identical pass/fail across all runs, 0.0 = completely volatile
  attempts: AttemptResult<TOutput>[];
  primaryResult: EvaluationResult<TOutput>;
  /** Conservative result aggregated across every attempt. */
  aggregateResult: EvaluationResult<TOutput>;
  baselineComparison?: {
    status: 'regression' | 'fix' | 'unchanged_pass' | 'unchanged_fail' | 'new_case';
    previousPassed?: boolean;
    previousScore?: number;
    scoreDelta?: number;
    newFailureCodes?: FailureCode[];
    resolvedFailureCodes?: FailureCode[];
  };
}

export interface RunMetrics {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  passRate: number; // 0.0 to 1.0
  averageScore: number;
  failureRateByCategory: Record<FailureCode, number>;
  totalRuns: number;
  flakyCasesCount: number;
  flakyRate: number;
  regressionsCount: number;
  regressionRate: number;
  fixesCount: number;
  totalDurationMs: number;
}

export interface SuiteResult<TOutput = unknown> {
  suiteName: string;
  timestamp: string;
  options: SuiteOptions;
  metrics: RunMetrics;
  results: TestCaseExecutionResult<TOutput>[];
  newlyFailingCases: TestCaseExecutionResult<TOutput>[]; // Regressions!
  newlyPassingCases: TestCaseExecutionResult<TOutput>[]; // Fixes!
  flakyCases: TestCaseExecutionResult<TOutput>[];
  casesRequiringReview: TestCaseExecutionResult<TOutput>[];
}

export interface SuiteOptions {
  /** Default contract to use if not specified on individual test cases */
  defaultContract?: ContractDefinition<any, any, any>;
  /** Concurrency limit for executing test cases (default: 4) */
  concurrency?: number;
  /** Number of times to execute each case to estimate nondeterminism (default: 1) */
  runsPerCase?: number;
  /** Filter test cases by tag */
  tags?: string[];
  /** Stop entire suite after N failures */
  maxFailures?: number;
  /** Timeout per test case in ms */
  timeoutMs?: number;
}

export interface BaselineRunData {
  suiteName: string;
  timestamp: string;
  metrics: Partial<RunMetrics>;
  cases: Record<
    string,
    {
      passed: boolean;
      score: number;
      failures?: FailureCode[];
      output?: string;
    }
  >;
}
