import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { runCli } from '../../src/cli/index.js';

describe('CLI Integration Tests', () => {
  const tmpDir = path.resolve('./node_modules/.tmp_test_cli');

  beforeAll(async () => {
    await fs.mkdir(tmpDir, { recursive: true });
  });

  it('llm-contract --help should return exit code 0', async () => {
    const code = await runCli(['--help']);
    expect(code).toBe(0);
  });

  it('llm-contract validate should evaluate ad-hoc outputs', async () => {
    const code = await runCli([
      'validate',
      '--input', 'Hello',
      '--output', 'Hello there!',
    ]);
    expect(code).toBe(0);
  });

  it('llm-contract run should execute test cases and generate report files', async () => {
    const testCasesPath = path.join(tmpDir, 'test-cases.json');
    const htmlReportPath = path.join(tmpDir, 'report.html');
    const jsonReportPath = path.join(tmpDir, 'result.json');

    const cases = [
      {
        id: 'cli-test-01',
        input: 'Test input',
        output: '{"status": "ok"}',
      },
    ];

    await fs.writeFile(testCasesPath, JSON.stringify(cases), 'utf-8');

    const code = await runCli([
      'run',
      '--suite', testCasesPath,
      '--preset', 'standard',
      '--html', htmlReportPath,
      '--output', jsonReportPath,
    ]);

    expect(code).toBe(0);

    const htmlContent = await fs.readFile(htmlReportPath, 'utf-8');
    expect(htmlContent).toContain('cli-test-01');

    const jsonContent = await fs.readFile(jsonReportPath, 'utf-8');
    const parsed = JSON.parse(jsonContent);
    expect(parsed.suite.metrics.totalCases).toBe(1);
  });

  it('llm-contract run loads an executable contract module', async () => {
    const testCasesPath = path.join(tmpDir, 'contract-cases.json');
    const contractPath = path.join(tmpDir, 'contract.mjs');
    await fs.writeFile(testCasesPath, JSON.stringify([{
      id: 'contract-case', input: 'test', output: 'missing marker',
    }]), 'utf-8');
    await fs.writeFile(contractPath, `export default {
      name: 'loaded-contract',
      invariants: [{ name: 'marker', code: 'MISSING_REQUIRED_INFORMATION', check: c => c.output?.includes?.('REQUIRED') ?? c.rawOutput.includes('REQUIRED') }]
    };`, 'utf-8');

    const code = await runCli(['run', '--suite', testCasesPath, '--contract', contractPath]);
    expect(code).toBe(1);
  });
});
