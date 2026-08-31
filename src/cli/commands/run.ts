import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { runSuite } from '../../suite/runner.js';
import { loadCasesFromJson, loadBaselineFromJson } from '../../suite/loader.js';
import { evaluatePolicy } from '../../policy/evaluator.js';
import { standardCIPolicy, strictCIPolicy, permissiveCIPolicy } from '../../policy/default-policies.js';
import { formatSuiteTerminal } from '../../reporters/terminal.js';
import { formatJsonReport } from '../../reporters/json.js';
import { formatMarkdownReport } from '../../reporters/markdown.js';
import { formatHtmlReport } from '../../reporters/html.js';
import { defineContract } from '../../core/define-contract.js';
import type { CIPolicy } from '../../types/policy.js';
import type { ContractDefinition } from '../../types/contract.js';
import { pathToFileURL } from 'node:url';

export interface RunCommandOptions {
  suitePath: string;
  baselinePath?: string;
  policyPreset?: 'strict' | 'standard' | 'permissive';
  policyPath?: string;
  runsPerCase?: number;
  concurrency?: number;
  jsonOutput?: boolean;
  htmlOutput?: string;
  markdownOutput?: string;
  outputPath?: string;
  contractPath?: string;
}

export async function runCommand(options: RunCommandOptions): Promise<number> {
  const cases = await loadCasesFromJson(options.suitePath);

  // If baseline is provided, augment cases with baseline outcome
  if (options.baselinePath) {
    const baseline = await loadBaselineFromJson(options.baselinePath);
    for (const c of cases) {
      if (baseline.cases && baseline.cases[c.id]) {
        const prior = baseline.cases[c.id]!;
        c.baselineOutcome = {
          passed: prior.passed,
          score: prior.score,
          failureCodes: prior.failures,
          output: prior.output,
        };
      }
    }
  }

  const suiteName = path.basename(options.suitePath, path.extname(options.suitePath));

  const fallbackContract = defineContract({
    name: 'default-cli-contract',
    invariants: [
      {
        name: 'non-empty-output',
        check: ctx => ctx.rawOutput.trim().length > 0,
      },
    ],
  });
  const defaultContract = options.contractPath
    ? await loadContractModule(options.contractPath)
    : fallbackContract;

  const suiteResult = await runSuite(suiteName, cases, undefined, {
    concurrency: options.concurrency ?? 4,
    runsPerCase: options.runsPerCase ?? 1,
    defaultContract,
  });

  // Resolve CI Policy
  let policy: CIPolicy | undefined = undefined;
  if (options.policyPath) {
    const rawPolicy = await fs.readFile(path.resolve(options.policyPath), 'utf-8');
    policy = JSON.parse(rawPolicy);
  } else if (options.policyPreset) {
    switch (options.policyPreset) {
      case 'strict': policy = strictCIPolicy; break;
      case 'standard': policy = standardCIPolicy; break;
      case 'permissive': policy = permissiveCIPolicy; break;
    }
  }

  const policyResult = policy ? evaluatePolicy(suiteResult, policy) : undefined;

  // Render outputs
  if (options.jsonOutput) {
    console.log(formatJsonReport({ suite: suiteResult, policy: policyResult, timestamp: new Date().toISOString() }));
  } else {
    console.log(formatSuiteTerminal(suiteResult, policyResult));
  }

  if (options.outputPath) {
    await fs.writeFile(
      path.resolve(options.outputPath),
      formatJsonReport({ suite: suiteResult, policy: policyResult, timestamp: new Date().toISOString() }),
      'utf-8'
    );
  }

  if (options.markdownOutput) {
    await fs.writeFile(
      path.resolve(options.markdownOutput),
      formatMarkdownReport(suiteResult, policyResult),
      'utf-8'
    );
  }

  if (options.htmlOutput) {
    await fs.writeFile(
      path.resolve(options.htmlOutput),
      formatHtmlReport(suiteResult, policyResult),
      'utf-8'
    );
  }

  return policyResult ? policyResult.exitCode : suiteResult.metrics.failedCases === 0 ? 0 : 1;
}

async function loadContractModule(filePath: string): Promise<ContractDefinition> {
  const absolutePath = path.resolve(filePath);
  const moduleUrl = pathToFileURL(absolutePath).href;
  const loaded = await import(moduleUrl) as Record<string, unknown>;
  const candidate = loaded.default ?? loaded.contract;

  if (!candidate || typeof candidate !== 'object' || typeof (candidate as ContractDefinition).name !== 'string') {
    throw new Error(`Contract module '${filePath}' must export a contract as default or as named export 'contract'.`);
  }

  return candidate as ContractDefinition;
}
