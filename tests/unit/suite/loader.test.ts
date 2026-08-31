import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { loadBaselineFromJson } from '../../../src/suite/loader.js';

describe('baseline loader', () => {
  it('accepts a saved JSON reporter document', async () => {
    const target = path.resolve('./node_modules/.tmp-baseline-report.json');
    await fs.writeFile(target, JSON.stringify({ suite: {
      suiteName: 'previous', timestamp: '2026-01-01T00:00:00.000Z', metrics: {},
      results: [{
        caseId: 'case-1', passed: false, score: 0.4,
        primaryResult: { rawOutput: 'bad', failures: [] },
        aggregateResult: { failures: [{ code: 'SCHEMA_VIOLATION' }] },
      }],
    } }), 'utf8');

    const baseline = await loadBaselineFromJson(target);
    expect(baseline.cases['case-1']).toEqual({
      passed: false, score: 0.4, failures: ['SCHEMA_VIOLATION'], output: 'bad',
    });
  });
});
