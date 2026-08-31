import type { FailureDetail } from './failure.js';
import type { GroundingEvidence } from './grounding.js';

export interface CheckResult {
  name: string;
  type: 'syntax' | 'schema' | 'invariant' | 'assertion';
  pass: boolean;
  score: number;
  weight: number;
  isHard: boolean;
  durationMs: number;
  message?: string;
  failure?: FailureDetail;
  evidence?: unknown;
}

export interface ScoreContribution {
  name: string;
  score: number;
  weight: number;
  weightedScore: number;
  contributionPercentage: number;
}

export interface ScoreBreakdown {
  finalScore: number; // 0.0 to 1.0
  totalWeight: number;
  hardAssertionsPassed: boolean;
  contributions: ScoreContribution[];
}

export interface EvaluationResult<TOutput = unknown> {
  contractName: string;
  contractVersion?: string;
  passed: boolean;
  score: number; // 0.0 to 1.0
  scoreBreakdown: ScoreBreakdown;
  failures: FailureDetail[];
  warnings: FailureDetail[];
  checks: CheckResult[];
  evidence?: Partial<GroundingEvidence> & Record<string, unknown>;
  rawOutput: string;
  normalizedOutput: string;
  parsedOutput?: TOutput;
  durationMs: number;
  timestamp: string;
}
