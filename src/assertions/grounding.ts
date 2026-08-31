import type { Invariant, Assertion, AssertionContext } from '../types/contract.js';
import type { GroundingMode, Claim, FactMatch } from '../types/grounding.js';
import type { JudgeAdapter } from '../types/adapter.js';

export interface PreserveFactsOptions {
  name?: string;
  keyFacts?: string[] | Record<string, string | number | boolean>;
  caseSensitive?: boolean;
  threshold?: number; // Minimum ratio of preserved facts (default: 1.0)
  isHard?: boolean;
}

/**
 * Asserts that key factual entities, identifiers, dates, and amounts from the context
 * are accurately preserved in the output.
 */
export function mustPreserveFacts(
  contextFactsOrOptions?: string[] | Record<string, string | number | boolean> | PreserveFactsOptions,
  maybeOptions?: PreserveFactsOptions
): Invariant {
  let options: PreserveFactsOptions;

  if (Array.isArray(contextFactsOrOptions)) {
    options = { keyFacts: contextFactsOrOptions, ...maybeOptions };
  } else if (
    contextFactsOrOptions &&
    typeof contextFactsOrOptions === 'object' &&
    ('name' in contextFactsOrOptions ||
      'keyFacts' in contextFactsOrOptions ||
      'threshold' in contextFactsOrOptions ||
      'caseSensitive' in contextFactsOrOptions ||
      'isHard' in contextFactsOrOptions)
  ) {
    options = { ...contextFactsOrOptions, ...maybeOptions };
  } else if (contextFactsOrOptions && typeof contextFactsOrOptions === 'object') {
    options = { keyFacts: contextFactsOrOptions as any, ...maybeOptions };
  } else {
    options = maybeOptions ?? {};
  }

  const name = options.name ?? 'mustPreserveFacts';
  const threshold = options.threshold ?? 1.0;
  const caseSensitive = options.caseSensitive ?? false;

  return {
    name,
    code: 'FACT_CONTRADICTION',
    severity: 'error',
    check: (ctx: AssertionContext) => {
      let factsToCheck: { key: string; expectedValue?: string }[] = [];

      if (Array.isArray(options.keyFacts)) {
        factsToCheck = options.keyFacts.map(f => ({ key: f, expectedValue: f }));
      } else if (options.keyFacts && typeof options.keyFacts === 'object') {
        factsToCheck = Object.entries(options.keyFacts).map(([k, v]) => ({
          key: k,
          expectedValue: String(v),
        }));
      } else if (ctx.context) {
        const contextStr = typeof ctx.context === 'string' ? ctx.context : JSON.stringify(ctx.context);
        const extracted = extractSalientEntities(contextStr);
        factsToCheck = extracted.map(e => ({ key: e, expectedValue: e }));
      }

      if (factsToCheck.length === 0) {
        return {
          pass: true,
          score: 1.0,
          message: 'No key facts to preserve were specified or extracted.',
        };
      }

      const outputText = caseSensitive ? ctx.normalizedOutput : ctx.normalizedOutput.toLowerCase();
      const matches: FactMatch[] = [];
      const missingFacts: string[] = [];

      for (const fact of factsToCheck) {
        const query = caseSensitive
          ? (fact.expectedValue ?? fact.key)
          : (fact.expectedValue ?? fact.key).toLowerCase();

        const found = outputText.includes(query);
        matches.push({
          key: fact.key,
          foundInContext: true,
          foundInOutput: found,
          canonicalValue: fact.expectedValue,
          matchScore: found ? 1.0 : 0.0,
        });

        if (!found) {
          missingFacts.push(fact.expectedValue ?? fact.key);
        }
      }

      const preservedCount = matches.filter(m => m.foundInOutput).length;
      const ratio = matches.length > 0 ? preservedCount / matches.length : 1.0;
      const pass = ratio >= threshold;

      if (!pass) {
        return {
          pass: false,
          score: ratio,
          code: 'FACT_CONTRADICTION',
          message: `Failed to preserve required facts. Missing: [${missingFacts.join(', ')}]. Preserved ${preservedCount}/${matches.length}.`,
          evidence: { preservedFacts: matches, missingFacts, preservedRatio: ratio },
          expected: factsToCheck.map(f => f.expectedValue ?? f.key),
          actual: matches.filter(m => m.foundInOutput).map(m => m.key),
        };
      }

      return {
        pass: true,
        score: ratio,
        evidence: { preservedFacts: matches, preservedRatio: ratio },
      };
    },
  };
}

export interface MustNotInventOptions {
  name?: string;
  mode?: GroundingMode; // 'strict' | 'assistive' | 'judge'
  judge?: JudgeAdapter;
  maxUnsupportedClaims?: number;
  isHard?: boolean;
}

/**
 * Asserts that the model does not invent unsupported claims, entities, dates, or numbers
 * that are absent from the provided context.
 */
export function mustNotInvent(options?: MustNotInventOptions): Assertion {
  const mode = options?.mode ?? 'strict';
  const name = options?.name ?? `mustNotInvent(${mode})`;
  const maxAllowed = options?.maxUnsupportedClaims ?? 0;

  return {
    name,
    code: 'UNSUPPORTED_CLAIM',
    isHardAssertion: options?.isHard ?? (mode === 'strict'),
    check: async (ctx: AssertionContext) => {
      const contextStr = typeof ctx.context === 'string' ? ctx.context : JSON.stringify(ctx.context ?? '');
      const outputText = ctx.normalizedOutput;

      if (!contextStr || contextStr.trim() === '""' || contextStr.trim() === '{}') {
        return {
          pass: true,
          score: 1.0,
          message: 'No context provided for grounding check.',
        };
      }

      if (mode === 'judge' && options?.judge?.evaluateClaim) {
        const sentences = splitIntoSentences(outputText);
        const unsupported: Claim[] = [];

        for (const sentence of sentences) {
          if (sentence.length < 15) continue;
          const judgeRes = await options.judge.evaluateClaim(sentence, contextStr);
          if (!judgeRes.supported) {
            unsupported.push({
              text: sentence,
              confidence: judgeRes.confidence,
              supported: false,
              evidenceSnippet: judgeRes.explanation,
            });
          }
        }

        const pass = unsupported.length <= maxAllowed;
        return {
          pass,
          score: sentences.length > 0 ? (sentences.length - unsupported.length) / sentences.length : 1.0,
          code: 'UNSUPPORTED_CLAIM',
          message: pass
            ? 'Grounding evaluation passed by external judge.'
            : `External judge flagged ${unsupported.length} unsupported claim(s).`,
          evidence: { unsupportedClaims: unsupported, mode: 'judge' },
        };
      }

      const outputEntities = extractSalientEntities(outputText);
      const contextEntities = new Set(extractSalientEntities(contextStr).map(e => e.toLowerCase()));
      const contextLower = contextStr.toLowerCase();

      const unsupportedEntities: string[] = [];

      for (const entity of outputEntities) {
        const entLower = entity.toLowerCase();
        if (!contextEntities.has(entLower) && !contextLower.includes(entLower)) {
          if (!isCommonStopword(entLower) && !isGenericAbbreviation(entity)) {
            unsupportedEntities.push(entity);
          }
        }
      }

      const unsupportedClaims: Claim[] = unsupportedEntities.map(ent => ({
        text: `Claim mentions ungrounded entity '${ent}'`,
        entities: [ent],
        supported: false,
        confidence: 0.95,
      }));

      const pass = unsupportedEntities.length <= maxAllowed;
      const score = outputEntities.length > 0
        ? Math.max(0, (outputEntities.length - unsupportedEntities.length) / outputEntities.length)
        : 1.0;

      if (!pass) {
        return {
          pass,
          score,
          code: 'UNSUPPORTED_CLAIM',
          severity: mode === 'assistive' ? 'warning' : 'error',
          message: `Detected ${unsupportedEntities.length} ungrounded entity/claim(s) not found in context: [${unsupportedEntities.slice(0, 5).join(', ')}]`,
          evidence: { unsupportedClaims, unsupportedEntities, mode },
          actual: unsupportedEntities,
        };
      }

      return {
        pass: true,
        score,
        evidence: { mode, ungroundedEntityCount: unsupportedEntities.length },
      };
    },
  };
}

export interface ContradictionOptions {
  name?: string;
  isHard?: boolean;
}

/**
 * Asserts that the output does not directly contradict context statements.
 */
export function assertNoContradiction(
  contextData?: string | Record<string, unknown>,
  options?: ContradictionOptions
): Assertion {
  const name = options?.name ?? 'assertNoContradiction';

  return {
    name,
    code: 'FACT_CONTRADICTION',
    isHardAssertion: options?.isHard ?? true,
    check: (ctx: AssertionContext) => {
      const activeContext = contextData ?? ctx.context;
      if (!activeContext) {
        return { pass: true, score: 1.0 };
      }

      const contextStr = typeof activeContext === 'string' ? activeContext : JSON.stringify(activeContext);
      const contradictions = detectDeterministicContradictions(contextStr, ctx.normalizedOutput);

      if (contradictions.length > 0) {
        return {
          pass: false,
          score: 0.0,
          code: 'FACT_CONTRADICTION',
          message: `Direct contradiction detected with context: ${contradictions[0]?.text}`,
          evidence: { contradictions },
          actual: contradictions.map(c => c.text),
        };
      }

      return {
        pass: true,
        score: 1.0,
      };
    },
  };
}

export interface CitationOptions {
  name?: string;
  pattern?: RegExp;
  requiredSources?: string[];
  isHard?: boolean;
}

/**
 * Asserts that the response includes citations or source references conforming to pattern or list.
 */
export function assertCitationsPresent(options?: CitationOptions): Assertion {
  const name = options?.name ?? 'assertCitationsPresent';
  const citationPattern = options?.pattern ?? /\[(?:(?:source|doc|ref|citation)\s*:?\s*)?([a-zA-Z0-9_.-]+|\d+)\]|\(Source:\s*[^)]+\)/gi;

  return {
    name,
    code: 'CITATION_MISSING',
    isHardAssertion: options?.isHard ?? false,
    check: (ctx: AssertionContext) => {
      const matches = Array.from(ctx.normalizedOutput.matchAll(citationPattern)).map(m => m[0]);

      if (matches.length === 0) {
        return {
          pass: false,
          score: 0.0,
          code: 'CITATION_MISSING',
          message: 'Output does not contain any citation or reference markers.',
          actual: ctx.normalizedOutput,
        };
      }

      if (options?.requiredSources && options.requiredSources.length > 0) {
        const missingSources: string[] = [];
        const fullOutput = ctx.normalizedOutput.toLowerCase();

        for (const src of options.requiredSources) {
          if (!fullOutput.includes(src.toLowerCase())) {
            missingSources.push(src);
          }
        }

        if (missingSources.length > 0) {
          return {
            pass: false,
            score: (options.requiredSources.length - missingSources.length) / options.requiredSources.length,
            code: 'CITATION_MISSING',
            message: `Missing citations for required sources: [${missingSources.join(', ')}]`,
            evidence: { citationsFound: matches, missingSources },
          };
        }
      }

      return {
        pass: true,
        score: 1.0,
        evidence: { citationsFound: matches },
      };
    },
  };
}

// ---------------- Helper Utilities ----------------

function extractSalientEntities(text: string): string[] {
  const entities = new Set<string>();

  // 1. Identifiers / codes containing numbers or hyphens
  const codeMatches = text.match(/\b[A-Za-z]+[-_][0-9A-Za-z]+\b|\b[A-Z]{2,}\d+\b|\b[A-Z]+\d+[-_]?[0-9A-Za-z]+\b/g) || [];
  codeMatches.forEach(m => entities.add(m));

  // 2. Currency amounts
  const currencyMatches = text.match(/\$\d+(?:\.\d+)?(?:\/(?:year|yr|month|mo|day))?/g) || [];
  currencyMatches.forEach(m => entities.add(m));

  // 3. Email addresses
  const emails = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [];
  emails.forEach(m => entities.add(m));

  // 4. Specific dates
  const dates = text.match(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/g) || [];
  dates.forEach(m => entities.add(m));

  // 5. Times
  const times = text.match(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g) || [];
  times.forEach(m => entities.add(m));

  return Array.from(entities);
}

const GENERIC_ABBREVIATIONS = new Set([
  'ID', 'AI', 'URL', 'VIP', 'FAQ', 'PDF', 'US', 'UK', 'AM', 'PM', 'EST', 'PST', 'UTC', 'OK', 'API', 'UI', 'CI', 'CD',
]);

function isGenericAbbreviation(term: string): boolean {
  return GENERIC_ABBREVIATIONS.has(term.toUpperCase());
}

const COMMON_STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'you', 'your', 'have', 'from',
  'are', 'was', 'were', 'will', 'not', 'can', 'has', 'had', 'been', 'all',
  'any', 'some', 'our', 'out', 'what', 'when', 'where', 'which', 'who',
  'why', 'how', 'than', 'then', 'into', 'also', 'about', 'just', 'more',
  'only', 'other', 'such', 'like', 'than', 'its', 'their', 'them', 'these',
]);

function isCommonStopword(word: string): boolean {
  return COMMON_STOPWORDS.has(word);
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function detectDeterministicContradictions(context: string, output: string): Claim[] {
  const contradictions: Claim[] = [];
  const ctxLower = context.toLowerCase();
  const outLower = output.toLowerCase();

  const ctxIsNonRefundable = ctxLower.includes('non-refundable') || ctxLower.includes('not refundable');
  const ctxIsRefundable = !ctxIsNonRefundable && ctxLower.includes('refundable');

  const outIsNonRefundable = outLower.includes('non-refundable') || outLower.includes('not refundable');
  const outIsRefundable = !outIsNonRefundable && outLower.includes('refundable');

  if (ctxIsNonRefundable && outIsRefundable) {
    contradictions.push({
      text: "Context states non-refundable, but output claims refundable",
      supported: false,
      contradicted: true,
      confidence: 1.0,
    });
  } else if (ctxIsRefundable && outIsNonRefundable) {
    contradictions.push({
      text: "Context states refundable, but output claims non-refundable",
      supported: false,
      contradicted: true,
      confidence: 1.0,
    });
  }

  const ctxIsNotFree = ctxLower.includes('not free') || ctxLower.includes('costs $') || ctxLower.includes('billed at $');
  const ctxIsFree = !ctxIsNotFree && ctxLower.includes('free');

  const outIsNotFree = outLower.includes('not free') || outLower.includes('costs $') || outLower.includes('billed at $');
  const outIsFree = !outIsNotFree && outLower.includes('free');

  if (ctxIsNotFree && outIsFree) {
    contradictions.push({
      text: "Context states service is not free, but output claims free",
      supported: false,
      contradicted: true,
      confidence: 1.0,
    });
  } else if (ctxIsFree && outIsNotFree) {
    contradictions.push({
      text: "Context states service is free, but output claims it costs money",
      supported: false,
      contradicted: true,
      confidence: 1.0,
    });
  }

  const ctxIsActive = ctxLower.includes('active') && !ctxLower.includes('inactive');
  const outIsInactive = outLower.includes('inactive') || outLower.includes('canceled') || outLower.includes('cancelled');
  if (ctxIsActive && outIsInactive) {
    contradictions.push({
      text: "Context states active, but output claims inactive/cancelled",
      supported: false,
      contradicted: true,
      confidence: 1.0,
    });
  }

  return contradictions;
}
