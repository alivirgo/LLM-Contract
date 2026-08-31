import {
  defineContract,
  mustPreserveFacts,
  mustNotInvent,
  assertCitationsPresent,
  assertNoContradiction,
  runSuite,
  evaluatePolicy,
  strictCIPolicy,
  formatSuiteTerminal,
  formatMarkdownReport,
  type TestCase,
} from '../../src/index.js';

export const ragContract = defineContract({
  name: 'rag-grounding-contract',
  invariants: [
    mustPreserveFacts({ threshold: 1.0 }),
    mustNotInvent({ mode: 'strict' }),
    assertNoContradiction(),
  ],
  assertions: [
    assertCitationsPresent({ pattern: /\[(?:doc\d+|ref\d+)\]/i }),
  ],
});

const ragTestCases: TestCase[] = [
  {
    id: 'rag-01',
    input: 'What are the travel cancellation terms?',
    context: 'Trips cancelled within 24 hours receive a 100% refund. After 24 hours, a $50 cancellation fee applies. [doc1]',
    contract: ragContract,
    metadata: {
      output: 'Under the policy, trips cancelled within 24 hours receive a 100% refund [doc1]. After 24 hours, a $50 cancellation fee applies [doc1].',
    },
    baselineOutcome: { passed: true, score: 1.0 },
  },
];

async function main() {
  const result = await runSuite('rag-eval-suite', ragTestCases);
  const policy = evaluatePolicy(result, strictCIPolicy);

  console.log(formatSuiteTerminal(result, policy));
  console.log('\n--- GitHub PR Markdown Summary ---');
  console.log(formatMarkdownReport(result, policy));
}

main().catch(console.error);
