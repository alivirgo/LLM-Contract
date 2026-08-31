/**
 * Grounding verification modes:
 * - 'strict': Every factual entity/claim must map directly to supplied context/evidence.
 * - 'assistive': Flags suspicious ungrounded claims with confidence scores without hard-failing unless configured.
 * - 'judge': Uses an optional external evaluator or model to verify semantic claim support with confidence.
 */
export type GroundingMode = 'strict' | 'assistive' | 'judge';

export interface Claim {
  text: string;
  sourceSpan?: [number, number];
  entities?: string[];
  numbers?: number[];
  dates?: string[];
  confidence?: number;
  supported?: boolean;
  contradicted?: boolean;
  evidenceSnippet?: string;
}

export interface FactMatch {
  key: string;
  foundInContext: boolean;
  foundInOutput: boolean;
  canonicalValue?: unknown;
  actualValue?: unknown;
  matchScore: number;
}

export interface FactPreservationOptions {
  keyFacts?: string[] | Record<string, string | number | boolean>;
  mode?: GroundingMode;
  caseSensitive?: boolean;
  allowParaphrase?: boolean;
  threshold?: number;
}

export interface GroundingEvidence {
  mode: GroundingMode;
  preservedFacts: FactMatch[];
  unsupportedClaims: Claim[];
  contradictoryClaims: Claim[];
  citationsFound: string[];
  groundingScore: number;
}
