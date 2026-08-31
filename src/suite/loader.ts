import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { TestCase, BaselineRunData } from '../types/suite.js';

/**
 * Loads test cases from a JSON file.
 */
export async function loadCasesFromJson<T = unknown>(filePath: string): Promise<TestCase<T>[]> {
  const absolutePath = path.resolve(filePath);
  const content = await fs.readFile(absolutePath, 'utf-8');
  const parsed = JSON.parse(content);

  if (Array.isArray(parsed)) {
    return parsed as TestCase<T>[];
  }

  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.cases)) {
    return parsed.cases as TestCase<T>[];
  }

  throw new Error(`Invalid test cases file at ${filePath}. Expected an array or { cases: [...] }.`);
}

/**
 * Loads baseline run data from a JSON file.
 */
export async function loadBaselineFromJson(filePath: string): Promise<BaselineRunData> {
  const absolutePath = path.resolve(filePath);
  const content = await fs.readFile(absolutePath, 'utf-8');
  const parsed = JSON.parse(content);
  const suite = parsed.suite ?? parsed;

  if (suite && Array.isArray(suite.results)) {
    return {
      suiteName: suite.suiteName ?? path.basename(filePath),
      timestamp: suite.timestamp ?? new Date(0).toISOString(),
      metrics: suite.metrics ?? {},
      cases: Object.fromEntries(suite.results.map((result: any) => [result.caseId, {
        passed: Boolean(result.passed),
        score: Number(result.score ?? 0),
        failures: (result.aggregateResult ?? result.primaryResult)?.failures?.map((f: any) => f.code) ?? [],
        output: result.primaryResult?.rawOutput,
      }])),
    };
  }

  if (suite && typeof suite === 'object' && suite.cases && typeof suite.cases === 'object') {
    return suite as BaselineRunData;
  }

  throw new Error(`Invalid baseline file at ${filePath}. Expected { cases: {...} } or a saved suite report.`);
}
