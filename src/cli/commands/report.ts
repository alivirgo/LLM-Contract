import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { formatHtmlReport } from '../../reporters/html.js';
import { formatMarkdownReport } from '../../reporters/markdown.js';
import { formatSuiteTerminal } from '../../reporters/terminal.js';
import type { SuiteResult } from '../../types/suite.js';

export interface ReportCommandOptions {
  filePath: string;
  format: 'html' | 'markdown' | 'terminal';
  outputPath?: string;
}

export async function reportCommand(options: ReportCommandOptions): Promise<number> {
  const content = await fs.readFile(path.resolve(options.filePath), 'utf-8');
  const parsed = JSON.parse(content);
  const suite: SuiteResult = parsed.suite ?? parsed;
  const policy = parsed.policy;

  let outputStr = '';

  switch (options.format) {
    case 'html':
      outputStr = formatHtmlReport(suite, policy);
      break;
    case 'markdown':
      outputStr = formatMarkdownReport(suite, policy);
      break;
    case 'terminal':
      outputStr = formatSuiteTerminal(suite, policy);
      break;
  }

  if (options.outputPath) {
    await fs.writeFile(path.resolve(options.outputPath), outputStr, 'utf-8');
    console.log(`Report written to ${options.outputPath}`);
  } else {
    console.log(outputStr);
  }

  return 0;
}
