/**
 * Stable, machine-readable failure codes for AI behavioral contracts.
 */
export type FailureCode =
  | 'PARSE_ERROR'
  | 'SCHEMA_VIOLATION'
  | 'MISSING_REQUIRED_INFORMATION'
  | 'UNSUPPORTED_CLAIM'
  | 'FACT_CONTRADICTION'
  | 'UNCERTAINTY_VIOLATION'
  | 'FORMAT_VIOLATION'
  | 'FORBIDDEN_PHRASE_DETECTED'
  | 'REQUIRED_TOPIC_MISSING'
  | 'NUMERIC_OUT_OF_BOUNDS'
  | 'ENUM_VIOLATION'
  | 'DUPLICATE_CONTENT_DETECTED'
  | 'CITATION_MISSING'
  | 'REFUSAL_EXPECTED_BUT_MISSING'
  | 'UNEXPECTED_REFUSAL'
  | 'GENERATION_ERROR'
  | 'CUSTOM_INVARIANT_FAILURE'
  | (string & {});

export type FailureSeverity = 'error' | 'warning' | 'info';

export interface FailureDetail {
  code: FailureCode;
  message: string;
  severity: FailureSeverity;
  path?: string | (string | number)[];
  assertionName?: string;
  evidence?: unknown;
  expected?: unknown;
  actual?: unknown;
}
