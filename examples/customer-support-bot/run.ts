import { customerSupportContract } from './contract.js';
import { runSuite, loadCasesFromJson, evaluatePolicy, standardCIPolicy, formatSuiteTerminal } from '../../src/index.js';
import * as path from 'node:path';

async function main() {
  const casesPath = path.resolve('examples/customer-support-bot/cases.json');
  const cases = await loadCasesFromJson(casesPath);

  // Attach contract to cases
  for (const c of cases) {
    c.contract = customerSupportContract;
  }

  console.log('Running Customer Support Contract Suite...\n');
  const suiteResult = await runSuite('customer-support-eval', cases, undefined, {
    concurrency: 2,
    runsPerCase: 1,
  });

  const policyResult = evaluatePolicy(suiteResult, standardCIPolicy);
  console.log(formatSuiteTerminal(suiteResult, policyResult));

  process.exit(policyResult.exitCode);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
