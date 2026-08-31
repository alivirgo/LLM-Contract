import type {
  TestCase,
  SuiteOptions,
  SuiteResult,
  TestCaseExecutionResult,
  AttemptResult,
  RunMetrics,
} from '../types/suite.js';
import type { FailureCode } from '../types/failure.js';
import { evaluate } from '../core/evaluate.js';
import { analyzeStability } from './stability.js';
import { compareWithBaseline } from './comparator.js';

export type ModelGenerator<TOutput = any, TContext = any> =
  | ((testCase: TestCase<TOutput, TContext>) => Promise<string> | string)
  | ((input: unknown, context?: unknown) => Promise<string> | string)
  | Record<string, string>;

/**
 * Runs a regression evaluation suite across test cases.
 *
 * @example
 * ```ts
 * const result = await runSuite("support-agent", cases, async (c) => {
 *   return await callMyModel(c.input, c.context);
 * }, {
 *   concurrency: 4,
 *   runsPerCase: 3 // estimates nondeterminism and detects flakiness
 * });
 * ```
 */
export async function runSuite<
  TOutput = unknown,
  TContext = unknown,
  TMeta = Record<string, unknown>
>(
  suiteName: string,
  cases: TestCase<TOutput, TContext, TMeta>[],
  generatorOrOutputs?: ModelGenerator<TOutput, TContext>,
  options?: SuiteOptions
): Promise<SuiteResult<TOutput>> {
  const startTime = Date.now();
  const opts: SuiteOptions = {
    concurrency: 4,
    runsPerCase: 1,
    ...options,
  };

  // Filter cases by tag if requested
  let activeCases = cases;
  if (opts.tags && opts.tags.length > 0) {
    const filterTags = new Set(opts.tags);
    activeCases = cases.filter(c => c.tags?.some(t => filterTags.has(t)));
  }

  const results: TestCaseExecutionResult<TOutput>[] = [];
  const concurrency = Math.max(1, opts.concurrency ?? 4);
  const runsPerCase = Math.max(1, opts.runsPerCase ?? 1);

  // Run with worker pool
  let currentIndex = 0;
  let failureCount = 0;

  async function worker(): Promise<void> {
    while (currentIndex < activeCases.length) {
      if (opts.maxFailures && failureCount >= opts.maxFailures) {
        break;
      }

      const caseIndex = currentIndex++;
      const testCase = activeCases[caseIndex];
      if (!testCase) break;

      const contract = testCase.contract ?? opts.defaultContract;
      if (!contract) {
        throw new Error(
          `No contract specified for test case '${testCase.id}' and no defaultContract provided.`
        );
      }

      const attempts: AttemptResult<TOutput>[] = [];

      for (let run = 1; run <= runsPerCase; run++) {
        const attemptStartTime = Date.now();
        let output = '';
        let generationError: string | undefined;

        try {
          output = await resolveCaseOutput(testCase, generatorOrOutputs);
        } catch (err: any) {
          generationError = err instanceof Error ? err.message : String(err);
        }

        const evalResult = await evaluate<TOutput, TContext, TMeta>(contract, {
          input: testCase.input,
          output,
          context: testCase.context,
          metadata: testCase.metadata,
        });

        if (generationError) {
          const failure = {
            code: 'GENERATION_ERROR' as const,
            severity: 'error' as const,
            assertionName: 'Model generation',
            message: `Model generation failed: ${generationError}`,
            evidence: { error: generationError },
          };
          evalResult.failures.push(failure);
          evalResult.checks.push({
            name: 'Model generation',
            type: 'invariant',
            pass: false,
            score: 0,
            weight: 1,
            isHard: true,
            durationMs: Date.now() - attemptStartTime,
            message: failure.message,
            failure,
          });
          evalResult.passed = false;
          evalResult.score = 0;
          evalResult.scoreBreakdown.finalScore = 0;
          evalResult.scoreBreakdown.hardAssertionsPassed = false;
        }

        attempts.push({
          attemptNumber: run,
          result: evalResult,
          output,
          durationMs: Date.now() - attemptStartTime,
          generationError,
        });
      }

      const stability = analyzeStability(attempts);
      const primaryResult = attempts[0]!.result;
      const passed = stability.passCount === attempts.length; // Passed across all runs
      const score = Math.round((attempts.reduce((sum, a) => sum + a.result.score, 0) / attempts.length) * 10000) / 10000;
      const aggregateResult = aggregateAttempts(attempts, passed, score);

      if (!passed) {
        failureCount++;
      }

      // Baseline comparison
      const baselineComparison = compareWithBaseline(aggregateResult, testCase.baselineOutcome);

      const execResult: TestCaseExecutionResult<TOutput> = {
        caseId: testCase.id,
        tags: testCase.tags,
        input: testCase.input,
        context: testCase.context,
        expected: testCase.expected,
        passed,
        score,
        isFlaky: stability.isFlaky,
        stabilityScore: stability.stabilityScore,
        attempts,
        primaryResult,
        aggregateResult,
        baselineComparison,
      };

      results.push(execResult);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, activeCases.length) }, () => worker());
  await Promise.all(workers);

  // Compute metrics
  const totalCases = results.length;
  const passedCases = results.filter(r => r.passed).length;
  const failedCases = totalCases - passedCases;
  const passRate = totalCases > 0 ? Math.round((passedCases / totalCases) * 10000) / 10000 : 0;
  const averageScore =
    totalCases > 0
      ? Math.round((results.reduce((sum, r) => sum + r.score, 0) / totalCases) * 10000) / 10000
      : 0;

  // Failure category breakdown
  const failureRateByCategory: Record<FailureCode, number> = {} as any;
  for (const res of results) {
    for (const failure of res.aggregateResult.failures) {
      failureRateByCategory[failure.code] = (failureRateByCategory[failure.code] || 0) + 1;
    }
  }

  const flakyCases = results.filter(r => r.isFlaky);
  const newlyFailingCases = results.filter(r => r.baselineComparison?.status === 'regression');
  const newlyPassingCases = results.filter(r => r.baselineComparison?.status === 'fix');
  const casesRequiringReview = results.filter(
    r => r.isFlaky || r.baselineComparison?.status === 'regression' || r.aggregateResult.warnings.length > 0
  );

  const totalRuns = results.reduce((sum, r) => sum + r.attempts.length, 0);
  const flakyCount = flakyCases.length;
  const flakyRate = totalCases > 0 ? Math.round((flakyCount / totalCases) * 10000) / 10000 : 0;

  const regressionsCount = newlyFailingCases.length;
  const regressionRate = totalCases > 0 ? Math.round((regressionsCount / totalCases) * 10000) / 10000 : 0;
  const fixesCount = newlyPassingCases.length;

  const totalDurationMs = Date.now() - startTime;

  const metrics: RunMetrics = {
    totalCases,
    passedCases,
    failedCases,
    passRate,
    averageScore,
    failureRateByCategory,
    totalRuns,
    flakyCasesCount: flakyCount,
    flakyRate,
    regressionsCount,
    regressionRate,
    fixesCount,
    totalDurationMs,
  };

  return {
    suiteName,
    timestamp: new Date().toISOString(),
    options: opts,
    metrics,
    results,
    newlyFailingCases,
    newlyPassingCases,
    flakyCases,
    casesRequiringReview,
  };
}

function aggregateAttempts<TOutput>(
  attempts: AttemptResult<TOutput>[],
  passed: boolean,
  score: number
): AttemptResult<TOutput>['result'] {
  const primary = attempts[0]!.result;
  const uniqueFailures = new Map<string, typeof primary.failures[number]>();
  const uniqueWarnings = new Map<string, typeof primary.warnings[number]>();

  for (const attempt of attempts) {
    for (const failure of attempt.result.failures) {
      uniqueFailures.set(`${failure.code}:${failure.assertionName ?? ''}:${failure.path ?? ''}`, failure);
    }
    for (const warning of attempt.result.warnings) {
      uniqueWarnings.set(`${warning.code}:${warning.assertionName ?? ''}:${warning.path ?? ''}`, warning);
    }
  }

  return {
    ...primary,
    passed,
    score,
    failures: [...uniqueFailures.values()],
    warnings: [...uniqueWarnings.values()],
    checks: attempts.flatMap(a => a.result.checks),
    evidence: Object.fromEntries(attempts.map(a => [`attempt-${a.attemptNumber}`, a.result.evidence ?? {}])),
    scoreBreakdown: { ...primary.scoreBreakdown, finalScore: score, hardAssertionsPassed: passed },
  };
}

async function resolveCaseOutput<TOutput, TContext, TMeta>(
  testCase: TestCase<TOutput, TContext, TMeta>,
  generator?: ModelGenerator<TOutput, TContext>
): Promise<string> {
  if (!generator) {
    if (typeof (testCase as any).output === 'string') {
      return (testCase as any).output;
    }
    if (testCase.metadata && typeof (testCase.metadata as any).output === 'string') {
      return (testCase.metadata as any).output;
    }
    return '';
  }

  if (typeof generator === 'function') {
    // Check if generator expects (testCase) or (input, context)
    if (generator.length <= 1) {
      const res = await (generator as any)(testCase);
      if (typeof res === 'string') return res;
    }
    return await (generator as any)(testCase.input, testCase.context);
  }

  if (typeof generator === 'object' && generator !== null) {
    if (testCase.id in generator) {
      return generator[testCase.id]!;
    }
  }

  return '';
}
