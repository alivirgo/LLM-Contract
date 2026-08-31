import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { SuiteResult } from '../../types/suite.js';

export async function compareCommand(baselinePath: string, currentPath: string): Promise<number> {
  const baseRaw = await fs.readFile(path.resolve(baselinePath), 'utf-8');
  const currRaw = await fs.readFile(path.resolve(currentPath), 'utf-8');

  const baseData = JSON.parse(baseRaw);
  const currData = JSON.parse(currRaw);

  const baseSuite: SuiteResult = baseData.suite ?? baseData;
  const currSuite: SuiteResult = currData.suite ?? currData;

  const regressions = currSuite.newlyFailingCases || [];
  const fixes = currSuite.newlyPassingCases || [];

  console.log('\n\x1b[1m\x1b[36m═══ Baseline Comparison Summary ═══\x1b[0m\n');
  console.log(`  Baseline Suite: ${baseSuite.suiteName} (${(baseSuite.metrics.passRate * 100).toFixed(1)}% pass rate)`);
  console.log(`  Current Suite:  ${currSuite.suiteName} (${(currSuite.metrics.passRate * 100).toFixed(1)}% pass rate)`);
  console.log('');

  if (regressions.length > 0) {
    console.log(`  \x1b[41m\x1b[37m\x1b[1m REGRESSIONS (${regressions.length}) \x1b[0m`);
    for (const r of regressions) {
      console.log(`    \x1b[31m✖ ${r.caseId}\x1b[0m: score dropped from ${(r.baselineComparison?.previousScore ?? 1) * 100}% to ${(r.score * 100).toFixed(0)}%`);
    }
    console.log('');
  } else {
    console.log('  \x1b[32m✓ Zero regressions detected.\x1b[0m\n');
  }

  if (fixes.length > 0) {
    console.log(`  \x1b[42m\x1b[37m\x1b[1m FIXES (${fixes.length}) \x1b[0m`);
    for (const f of fixes) {
      console.log(`    \x1b[32m✓ ${f.caseId}\x1b[0m: now passing with score ${(f.score * 100).toFixed(0)}%`);
    }
    console.log('');
  }

  return regressions.length === 0 ? 0 : 1;
}
