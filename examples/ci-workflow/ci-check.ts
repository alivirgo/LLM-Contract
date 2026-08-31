import {
  defineContract,
  runSuite,
  evaluatePolicy,
  standardCIPolicy,
  formatSuiteTerminal,
  mustPreserveFacts,
  assertNoContradiction,
  type TestCase,
} from '../../src/index.js';

/**
 * Example CI script to run in GitHub Actions / GitLab CI
 */
async function runCiCheck() {
  const contract = defineContract({
    name: 'production-safety-contract',
    invariants: [
      mustPreserveFacts(),
      assertNoContradiction(),
    ],
  });

  const cases: TestCase[] = [
    {
      id: 'prod-case-1',
      input: 'Quote for premium plan',
      context: 'Premium plan is $120/year.',
      contract,
      metadata: { output: 'The premium plan is priced at $120/year.' },
      baselineOutcome: { passed: true, score: 1.0 },
    },
  ];

  const result = await runSuite('ci-regression-check', cases);
  const policyResult = evaluatePolicy(result, standardCIPolicy);

  console.log(formatSuiteTerminal(result, policyResult));

  if (!policyResult.compliant) {
    console.error('❌ CI Policy Failed!');
    process.exit(1);
  }

  console.log('✅ CI Policy Passed!');
  process.exit(0);
}

runCiCheck().catch(err => {
  console.error(err);
  process.exit(1);
});
