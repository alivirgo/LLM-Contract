/**
 * llm-contract: Production-grade behavioral contract testing & regression suite for AI systems.
 */

// Types
export * from './types/index.js';

// Core Engine
export { defineContract, createContractBuilder } from './core/define-contract.js';
export { evaluate } from './core/evaluate.js';
export { normalizeOutput } from './core/normalizer.js';
export { calculateScoreBreakdown } from './core/scoring.js';

// Assertions & Invariants
export {
  assertValidJson,
  assertCodeBlock,
  assertSchema,
  assertNumericRange,
  assertEnum,
  assertNoDuplicates,
  assertCustom,
  mustAskWhenUncertain,
  mustRefuse,
  mustNotRefuse,
  assertRequiredTopicsCovered,
  assertForbiddenPhrases,
  mustPreserveFacts,
  mustNotInvent,
  assertNoContradiction,
  assertCitationsPresent,
} from './assertions/index.js';

// Suite & Regression Testing
export {
  runSuite,
  compareWithBaseline,
  analyzeStability,
  loadCasesFromJson,
  loadBaselineFromJson,
} from './suite/index.js';

// CI Policies
export {
  evaluatePolicy,
  strictCIPolicy,
  standardCIPolicy,
  permissiveCIPolicy,
} from './policy/index.js';

// Schema & Model Adapters
export {
  zodAdapter,
  valibotAdapter,
  jsonSchemaAdapter,
  mockModelAdapter,
  createJudgeAdapter,
} from './adapters/index.js';

// Reporters
export {
  formatEvaluationTerminal,
  formatSuiteTerminal,
  formatJsonReport,
  formatMarkdownReport,
  formatHtmlReport,
} from './reporters/index.js';
