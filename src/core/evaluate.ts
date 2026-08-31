import type {
  ContractDefinition,
  EvaluationContext,
  AssertionContext,
  AssertionResult,
  Invariant,
  Assertion,
  AssertionFunction,
} from '../types/contract.js';
import type { EvaluationResult, CheckResult } from '../types/result.js';
import type { FailureDetail, FailureSeverity } from '../types/failure.js';
import { normalizeOutput } from './normalizer.js';
import { calculateScoreBreakdown } from './scoring.js';

/**
 * Evaluates an AI model output against a defined behavioral contract.
 */
export async function evaluate<
  TOutput = unknown,
  TContext = unknown,
  TMeta = Record<string, unknown>
>(
  contract: ContractDefinition<TOutput, TContext, TMeta>,
  context: EvaluationContext<TContext, TMeta>
): Promise<EvaluationResult<TOutput>> {
  const startTime = Date.now();
  const rawOutput = context.output ?? '';
  const failures: FailureDetail[] = [];
  const warnings: FailureDetail[] = [];
  const checks: CheckResult[] = [];
  const aggregatedEvidence: Record<string, unknown> = {};

  // 1. Normalization
  const normResult = normalizeOutput(rawOutput, contract.normalization);
  const normalizedOutput = normResult.normalized;

  let parsedOutput: TOutput | undefined = undefined;
  let syntaxOrSchemaFailed = false;

  // 2. Syntactic / Schema Validation
  if (contract.schema) {
    const schemaStartTime = Date.now();
    let jsonParsed: unknown;
    let parseError: Error | null = null;

    try {
      jsonParsed = JSON.parse(normalizedOutput);
    } catch (err: any) {
      parseError = err;
    }

    if (parseError) {
      const failure: FailureDetail = {
        code: 'PARSE_ERROR',
        message: `Failed to parse output as JSON: ${parseError.message}`,
        severity: 'error',
        assertionName: 'Syntactic JSON Parse',
        actual: normalizedOutput,
      };
      failures.push(failure);
      checks.push({
        name: 'Syntactic JSON Parse',
        type: 'syntax',
        pass: false,
        score: 0,
        weight: 1.0,
        isHard: true,
        durationMs: Date.now() - schemaStartTime,
        message: failure.message,
        failure,
      });
      syntaxOrSchemaFailed = true;
    } else {
      checks.push({
        name: 'Syntactic JSON Parse',
        type: 'syntax',
        pass: true,
        score: 1.0,
        weight: 1.0,
        isHard: true,
        durationMs: Date.now() - schemaStartTime,
      });

      // Run schema adapter
      const adapterStartTime = Date.now();
      const valResult = await contract.schema.validate(jsonParsed);

      if (valResult.success) {
        parsedOutput = valResult.data;
        checks.push({
          name: `Schema Validation (${contract.schema.name})`,
          type: 'schema',
          pass: true,
          score: 1.0,
          weight: 1.0,
          isHard: true,
          durationMs: Date.now() - adapterStartTime,
        });
      } else {
        syntaxOrSchemaFailed = true;
        for (const err of valResult.errors) {
          failures.push(err);
          checks.push({
            name: `Schema Validation (${contract.schema.name})`,
            type: 'schema',
            pass: false,
            score: 0,
            weight: 1.0,
            isHard: true,
            durationMs: Date.now() - adapterStartTime,
            message: err.message,
            failure: err,
          });
        }
      }
    }
  }

  // Check bail options
  const shouldBail =
    syntaxOrSchemaFailed &&
    (contract.options?.bailOnParseError || contract.options?.bailOnSchemaError);

  const assertionCtx: AssertionContext<TOutput, TContext, TMeta> = {
    input: context.input,
    rawOutput,
    normalizedOutput,
    parsedOutput,
    context: context.context,
    metadata: context.metadata,
  };

  // 3. Run Invariants (Hard checks)
  if (!shouldBail && contract.invariants && contract.invariants.length > 0) {
    for (const invariantItem of contract.invariants) {
      const invCheck = normalizeInvariant(invariantItem);
      const invStartTime = Date.now();

      try {
        const timeoutMs = contract.options?.timeoutMs ?? 5000;
        const res = await withTimeout(
          Promise.resolve(invCheck.check(assertionCtx)),
          timeoutMs,
          `Invariant '${invCheck.name}' timed out after ${timeoutMs}ms`
        );

        const checkRes = normalizeAssertionResult(res, invCheck.name, invCheck.code, 'error');

        if (checkRes.evidence) {
          mergeEvidence(aggregatedEvidence, invCheck.name, checkRes.evidence);
        }

        const durationMs = Date.now() - invStartTime;

        if (checkRes.pass) {
          checks.push({
            name: invCheck.name,
            type: 'invariant',
            pass: true,
            score: checkRes.score ?? 1.0,
            weight: checkRes.weight ?? 1.0,
            isHard: true,
            durationMs,
            message: checkRes.message,
            evidence: checkRes.evidence,
          });
        } else {
          const failure: FailureDetail = {
            code: checkRes.code ?? invCheck.code ?? 'CUSTOM_INVARIANT_FAILURE',
            message: checkRes.message ?? `Invariant '${invCheck.name}' failed.`,
            severity: checkRes.severity ?? invCheck.severity ?? 'error',
            assertionName: invCheck.name,
            path: checkRes.path,
            evidence: checkRes.evidence,
            expected: checkRes.expected,
            actual: checkRes.actual,
          };

          failures.push(failure);
          checks.push({
            name: invCheck.name,
            type: 'invariant',
            pass: false,
            score: checkRes.score ?? 0.0,
            weight: checkRes.weight ?? 1.0,
            isHard: true,
            durationMs,
            message: failure.message,
            failure,
            evidence: checkRes.evidence,
          });
        }
      } catch (err: any) {
        const failure: FailureDetail = {
          code: 'CUSTOM_INVARIANT_FAILURE',
          message: `Error executing invariant '${invCheck.name}': ${err.message}`,
          severity: 'error',
          assertionName: invCheck.name,
        };
        failures.push(failure);
        checks.push({
          name: invCheck.name,
          type: 'invariant',
          pass: false,
          score: 0.0,
          weight: 1.0,
          isHard: true,
          durationMs: Date.now() - invStartTime,
          message: failure.message,
          failure,
        });
      }
    }
  }

  // 4. Run Assertions (Soft evaluators or configurable hard assertions)
  if (!shouldBail && contract.assertions && contract.assertions.length > 0) {
    for (const assertionItem of contract.assertions) {
      const assertion = normalizeAssertion(assertionItem);
      const assStartTime = Date.now();

      try {
        const timeoutMs = contract.options?.timeoutMs ?? 5000;
        const res = await withTimeout(
          Promise.resolve(assertion.check(assertionCtx)),
          timeoutMs,
          `Assertion '${assertion.name}' timed out after ${timeoutMs}ms`
        );

        const checkRes = normalizeAssertionResult(
          res,
          assertion.name,
          assertion.code,
          assertion.severity ?? 'warning'
        );

        if (checkRes.evidence) {
          mergeEvidence(aggregatedEvidence, assertion.name, checkRes.evidence);
        }

        const durationMs = Date.now() - assStartTime;
        const isHard = assertion.isHardAssertion ?? false;
        const weight = checkRes.weight ?? assertion.weight ?? 1.0;

        if (checkRes.pass) {
          checks.push({
            name: assertion.name,
            type: 'assertion',
            pass: true,
            score: checkRes.score ?? 1.0,
            weight,
            isHard,
            durationMs,
            message: checkRes.message,
            evidence: checkRes.evidence,
          });
        } else {
          const detail: FailureDetail = {
            code: checkRes.code ?? assertion.code ?? 'FORMAT_VIOLATION',
            message: checkRes.message ?? `Assertion '${assertion.name}' failed.`,
            severity: isHard ? 'error' : (checkRes.severity ?? 'warning'),
            assertionName: assertion.name,
            path: checkRes.path,
            evidence: checkRes.evidence,
            expected: checkRes.expected,
            actual: checkRes.actual,
          };

          if (isHard) {
            failures.push(detail);
          } else {
            warnings.push(detail);
          }

          checks.push({
            name: assertion.name,
            type: 'assertion',
            pass: false,
            score: checkRes.score ?? 0.0,
            weight,
            isHard,
            durationMs,
            message: detail.message,
            failure: detail,
            evidence: checkRes.evidence,
          });
        }
      } catch (err: any) {
        const isHard = assertion.isHardAssertion ?? false;
        const detail: FailureDetail = {
          code: 'FORMAT_VIOLATION',
          message: `Error executing assertion '${assertion.name}': ${err.message}`,
          severity: isHard ? 'error' : 'warning',
          assertionName: assertion.name,
        };
        if (isHard) {
          failures.push(detail);
        } else {
          warnings.push(detail);
        }
        checks.push({
          name: assertion.name,
          type: 'assertion',
          pass: false,
          score: 0.0,
          weight: assertion.weight ?? 1.0,
          isHard,
          durationMs: Date.now() - assStartTime,
          message: detail.message,
          failure: detail,
        });
      }
    }
  }

  // 5. Score Calculation
  const scoreBreakdown = calculateScoreBreakdown(checks);

  // Passed condition:
  // - All hard assertions and invariants passed
  // - If minPassingScore is explicitly set, finalScore >= minPassingScore
  const hasErrorFailures = failures.some(f => f.severity === 'error') || !scoreBreakdown.hardAssertionsPassed;
  const meetsMinScore =
    contract.options?.minPassingScore !== undefined
      ? scoreBreakdown.finalScore >= contract.options.minPassingScore
      : true;
  const passed = !hasErrorFailures && meetsMinScore;

  const durationMs = Date.now() - startTime;

  return {
    contractName: contract.name,
    contractVersion: contract.version,
    passed,
    score: scoreBreakdown.finalScore,
    scoreBreakdown,
    failures,
    warnings,
    checks,
    evidence: aggregatedEvidence,
    rawOutput,
    normalizedOutput,
    parsedOutput,
    durationMs,
    timestamp: new Date().toISOString(),
  };
}

function normalizeInvariant<TOutput, TContext, TMeta>(
  item: Invariant<TOutput, TContext, TMeta> | AssertionFunction<TOutput, TContext, TMeta>
): Invariant<TOutput, TContext, TMeta> {
  if (typeof item === 'function') {
    return {
      name: item.name || 'anonymous_invariant',
      code: 'CUSTOM_INVARIANT_FAILURE',
      severity: 'error',
      check: item,
    };
  }
  return item;
}

function normalizeAssertion<TOutput, TContext, TMeta>(
  item: Assertion<TOutput, TContext, TMeta> | AssertionFunction<TOutput, TContext, TMeta>
): Assertion<TOutput, TContext, TMeta> {
  if (typeof item === 'function') {
    return {
      name: item.name || 'anonymous_assertion',
      code: 'FORMAT_VIOLATION',
      severity: 'warning',
      weight: 1.0,
      isHardAssertion: false,
      check: item,
    };
  }
  return item;
}

function normalizeAssertionResult(
  res: AssertionResult | boolean,
  defaultName: string,
  defaultCode?: string,
  defaultSeverity: FailureSeverity = 'error'
): AssertionResult {
  if (typeof res === 'boolean') {
    return {
      pass: res,
      name: defaultName,
      code: defaultCode,
      severity: defaultSeverity,
      score: res ? 1.0 : 0.0,
    };
  }
  return {
    ...res,
    name: res.name || defaultName,
    code: res.code || defaultCode,
    severity: res.severity || defaultSeverity,
    score: res.score !== undefined ? res.score : res.pass ? 1.0 : 0.0,
  };
}

function mergeEvidence(target: Record<string, unknown>, key: string, evidence: unknown) {
  // Evidence is namespaced by check. Flattening objects allowed unrelated
  // assertions to silently overwrite one another's keys.
  if (!(key in target)) {
    target[key] = evidence;
    return;
  }

  const existing = target[key];
  target[key] = Array.isArray(existing) ? [...existing, evidence] : [existing, evidence];
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
