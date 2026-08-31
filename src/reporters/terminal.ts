import type { SuiteResult } from '../types/suite.js';
import type { EvaluationResult } from '../types/result.js';
import type { PolicyEvaluationResult } from '../types/policy.js';

// ANSI color helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

/**
 * Formats a single evaluation result for the terminal.
 */
export function formatEvaluationTerminal(result: EvaluationResult): string {
  const lines: string[] = [];
  const statusBadge = result.passed
    ? `${colors.bgGreen}${colors.white}${colors.bold} PASS ${colors.reset}`
    : `${colors.bgRed}${colors.white}${colors.bold} FAIL ${colors.reset}`;

  lines.push('');
  lines.push(`${statusBadge} ${colors.bold}${result.contractName}${colors.reset} (Score: ${(result.score * 100).toFixed(1)}% | ${result.durationMs}ms)`);
  lines.push(`${colors.dim}─`.repeat(70) + colors.reset);

  // Checks breakdown
  for (const check of result.checks) {
    const icon = check.pass ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    const hardLabel = check.isHard ? `${colors.dim}[hard]${colors.reset}` : `${colors.dim}[soft]${colors.reset}`;
    const weightLabel = `${colors.dim}(weight: ${check.weight})${colors.reset}`;
    lines.push(`  ${icon} ${check.name} ${hardLabel} ${weightLabel} - score: ${(check.score * 100).toFixed(0)}%`);

    if (!check.pass && check.failure) {
      lines.push(`    ${colors.red}↳ ${check.failure.code}: ${check.failure.message}${colors.reset}`);
      if (check.failure.path) {
        lines.push(`      ${colors.dim}path: ${JSON.stringify(check.failure.path)}${colors.reset}`);
      }
    }
  }

  // Warnings
  if (result.warnings.length > 0) {
    lines.push('');
    lines.push(`  ${colors.yellow}${colors.bold}Warnings (${result.warnings.length}):${colors.reset}`);
    for (const w of result.warnings) {
      lines.push(`    ${colors.yellow}⚠ [${w.code}] ${w.message}${colors.reset}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Formats a comprehensive test suite result for the terminal with regression highlights.
 */
export function formatSuiteTerminal(
  suiteResult: SuiteResult,
  policyResult?: PolicyEvaluationResult
): string {
  const lines: string[] = [];
  const m = suiteResult.metrics;

  lines.push('');
  lines.push(`${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════════════${colors.reset}`);
  lines.push(`${colors.bold}${colors.cyan}  llm-contract suite: ${suiteResult.suiteName}${colors.reset}`);
  lines.push(`${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════════════${colors.reset}`);
  lines.push('');

  // Summary Grid
  const passColor = m.passRate >= 0.95 ? colors.green : m.passRate >= 0.8 ? colors.yellow : colors.red;
  lines.push(`  ${colors.bold}Total Cases:${colors.reset} ${m.totalCases}   |   ${colors.bold}Passed:${colors.reset} ${colors.green}${m.passedCases}${colors.reset}   |   ${colors.bold}Failed:${colors.reset} ${m.failedCases > 0 ? colors.red : colors.dim}${m.failedCases}${colors.reset}`);
  lines.push(`  ${colors.bold}Pass Rate:${colors.reset}   ${passColor}${colors.bold}${(m.passRate * 100).toFixed(1)}%${colors.reset}   |   ${colors.bold}Avg Score:${colors.reset} ${(m.averageScore * 100).toFixed(1)}%   |   ${colors.bold}Duration:${colors.reset} ${m.totalDurationMs}ms`);
  lines.push('');

  // 1. Prominent Regressions Callout (Critical!)
  if (suiteResult.newlyFailingCases.length > 0) {
    lines.push(`  ${colors.bgRed}${colors.white}${colors.bold} REGRESSIONS DETECTED (${suiteResult.newlyFailingCases.length}) ${colors.reset}`);
    lines.push(`  ${colors.red}The following test cases passed in baseline but FAILED in current run:${colors.reset}`);
    for (const c of suiteResult.newlyFailingCases) {
      lines.push(`    ${colors.bold}${colors.red}✖ Case ID: ${c.caseId}${colors.reset} (Score: ${(c.score * 100).toFixed(0)}%, was ${(c.baselineComparison?.previousScore ?? 1) * 100}%)`);
      for (const fail of c.primaryResult.failures) {
        lines.push(`      ${colors.red}↳ [${fail.code}] ${fail.message}${colors.reset}`);
      }
    }
    lines.push('');
  }

  // 2. Fixes Callout
  if (suiteResult.newlyPassingCases.length > 0) {
    lines.push(`  ${colors.bgGreen}${colors.white}${colors.bold} FIXES DETECTED (${suiteResult.newlyPassingCases.length}) ${colors.reset}`);
    lines.push(`  ${colors.green}The following test cases previously failed but now PASS:${colors.reset}`);
    for (const c of suiteResult.newlyPassingCases) {
      lines.push(`    ${colors.green}✓ Case ID: ${c.caseId} (Score: ${(c.score * 100).toFixed(0)}%)${colors.reset}`);
    }
    lines.push('');
  }

  // 3. Flaky Cases
  if (suiteResult.flakyCases.length > 0) {
    lines.push(`  ${colors.bgYellow}${colors.white}${colors.bold} FLAKY CASES DETECTED (${suiteResult.flakyCases.length}) ${colors.reset}`);
    for (const c of suiteResult.flakyCases) {
      const passCount = c.attempts.filter(a => a.result.passed).length;
      lines.push(`    ${colors.yellow}⚠ Case ID: ${c.caseId} passed ${passCount}/${c.attempts.length} attempts (stability: ${(c.stabilityScore * 100).toFixed(0)}%)${colors.reset}`);
    }
    lines.push('');
  }

  // 4. Failure Categories Breakdown
  const catEntries = Object.entries(m.failureRateByCategory);
  if (catEntries.length > 0) {
    lines.push(`  ${colors.bold}Failure Categories Breakdown:${colors.reset}`);
    for (const [code, count] of catEntries) {
      lines.push(`    - ${colors.yellow}${code.padEnd(28)}${colors.reset} : ${count} failure(s)`);
    }
    lines.push('');
  }

  // 5. CI Policy Result
  if (policyResult) {
    lines.push(`${colors.dim}─`.repeat(70) + colors.reset);
    if (policyResult.compliant) {
      lines.push(`  ${colors.green}${colors.bold}✓ CI Policy Compliant:${colors.reset} ${policyResult.policyName}`);
    } else {
      lines.push(`  ${colors.red}${colors.bold}✖ CI Policy VIOLATED:${colors.reset} ${policyResult.policyName}`);
      for (const v of policyResult.violations) {
        lines.push(`    ${colors.red}• [${v.rule}] ${v.message} (Expected: ${v.expected}, Got: ${v.actual})${colors.reset}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
