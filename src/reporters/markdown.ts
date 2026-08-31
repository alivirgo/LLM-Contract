import type { SuiteResult } from '../types/suite.js';
import type { PolicyEvaluationResult } from '../types/policy.js';

/**
 * Generates a Markdown summary suitable for GitHub PR comments and CI summaries.
 */
export function formatMarkdownReport(
  suiteResult: SuiteResult,
  policyResult?: PolicyEvaluationResult
): string {
  const m = suiteResult.metrics;
  const lines: string[] = [];

  const statusBadge = policyResult
    ? policyResult.compliant
      ? '🟢 **PASSED CI POLICY**'
      : '🔴 **FAILED CI POLICY**'
    : m.passRate >= 0.95
      ? '🟢 **PASSED**'
      : '🔴 **FAILED**';

  lines.push(`## 🛡️ LLM Behavioral Contract Report: \`${suiteResult.suiteName}\``);
  lines.push('');
  lines.push(`> Status: ${statusBadge} | Pass Rate: **${(m.passRate * 100).toFixed(1)}%** | Avg Score: **${(m.averageScore * 100).toFixed(1)}%**`);
  lines.push('');

  // Summary Table
  lines.push('### 📊 Summary Metrics');
  lines.push('| Metric | Value |');
  lines.push('| :--- | :--- |');
  lines.push(`| **Total Cases** | ${m.totalCases} |`);
  lines.push(`| **Passed Cases** | ${m.passedCases} |`);
  lines.push(`| **Failed Cases** | ${m.failedCases} |`);
  lines.push(`| **Pass Rate** | ${(m.passRate * 100).toFixed(1)}% |`);
  lines.push(`| **Average Score** | ${(m.averageScore * 100).toFixed(1)}% |`);
  lines.push(`| **Regressions (New Failures)** | ${m.regressionsCount > 0 ? `🚨 **${m.regressionsCount}**` : '0'} |`);
  lines.push(`| **Fixes (New Passes)** | ${m.fixesCount > 0 ? `✨ **${m.fixesCount}**` : '0'} |`);
  lines.push(`| **Flaky Cases** | ${m.flakyCasesCount > 0 ? `⚠️ **${m.flakyCasesCount}**` : '0'} |`);
  lines.push(`| **Duration** | ${m.totalDurationMs}ms |`);
  lines.push('');

  // Regressions
  if (suiteResult.newlyFailingCases.length > 0) {
    lines.push('### 🚨 Regressions Detected');
    lines.push('The following test cases passed in baseline but now fail:');
    lines.push('');
    for (const c of suiteResult.newlyFailingCases) {
      lines.push(`<details><summary><b>❌ Case: <code>${c.caseId}</code></b> (Score: ${(c.score * 100).toFixed(0)}%)</summary>`);
      lines.push('');
      lines.push('**Failures:**');
      for (const f of c.primaryResult.failures) {
        lines.push(`- \`${f.code}\`: ${f.message}`);
      }
      lines.push('');
      lines.push('**Input:**');
      lines.push('```json');
      lines.push(typeof c.input === 'string' ? c.input : JSON.stringify(c.input, null, 2));
      lines.push('```');
      lines.push('');
      lines.push('**Output:**');
      lines.push('```');
      lines.push(c.primaryResult.rawOutput);
      lines.push('```');
      lines.push('</details>');
      lines.push('');
    }
  }

  // Category Breakdown
  const catEntries = Object.entries(m.failureRateByCategory);
  if (catEntries.length > 0) {
    lines.push('### 📋 Failure Categories');
    lines.push('| Category | Count |');
    lines.push('| :--- | :--- |');
    for (const [code, count] of catEntries) {
      lines.push(`| \`${code}\` | ${count} |`);
    }
    lines.push('');
  }

  // CI Policy
  if (policyResult) {
    lines.push(`### ⚖️ CI Policy: \`${policyResult.policyName}\``);
    if (policyResult.compliant) {
      lines.push('All CI policy thresholds satisfied.');
    } else {
      lines.push('**Policy Violations:**');
      for (const v of policyResult.violations) {
        lines.push(`- ❌ **${v.rule}**: ${v.message} *(expected: ${v.expected}, actual: ${v.actual})*`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
