import { runCommand } from './commands/run.js';
import { compareCommand } from './commands/compare.js';
import { reportCommand } from './commands/report.js';
import { validateCommand } from './commands/validate.js';
import { initCommand } from './commands/init.js';

interface ParsedArgs {
  flags: Record<string, string | boolean>;
  positionals: string[];
}

export async function runCli(argv: string[]): Promise<number> {
  const command = argv[0];

  if (!command || command === '--help' || command === '-h' || command === 'help') {
    printHelp();
    return 0;
  }

  if (command === '--version' || command === '-v') {
    console.log('llm-contract v0.10.1');
    return 0;
  }

  const { flags, positionals } = parseArgs(argv.slice(1));

  try {
    switch (command) {
      case 'init':
        return await initCommand({
          directory: getString(flags, '--dir', '-d') || positionals[0],
          force: Boolean(flags['--force']),
          agents: !Boolean(flags['--no-agents']),
        });

      case 'run': {
        const suitePath = getString(flags, '--suite', '-s') || positionals[0];
        if (!suitePath) {
          console.error('Error: Missing required argument --suite <path>');
          return 1;
        }

        const runsVal = getString(flags, '--runs-per-case');
        const concVal = getString(flags, '--concurrency');

        return await runCommand({
          suitePath,
          baselinePath: getString(flags, '--baseline', '-b'),
          policyPreset: getString(flags, '--preset', '--policy-preset') as any,
          policyPath: getString(flags, '--policy', '-p'),
          runsPerCase: runsVal ? parseInt(runsVal, 10) : 1,
          concurrency: concVal ? parseInt(concVal, 10) : 4,
          jsonOutput: Boolean(flags['--json']),
          htmlOutput: getString(flags, '--html'),
          markdownOutput: getString(flags, '--markdown', '--md'),
          outputPath: getString(flags, '--output', '-o'),
          contractPath: getString(flags, '--contract'),
        });
      }

      case 'compare': {
        const baseline = getString(flags, '--baseline', '-b') || positionals[0];
        const current = getString(flags, '--current', '-c') || positionals[1];

        if (!baseline || !current) {
          console.error('Error: Missing required arguments --baseline <file> and --current <file>');
          return 1;
        }

        return await compareCommand(baseline, current);
      }

      case 'report': {
        const filePath = getString(flags, '--file', '-f') || positionals[0];
        const format = (getString(flags, '--format') || 'terminal') as 'html' | 'markdown' | 'terminal';
        const outputPath = getString(flags, '--output', '-o');

        if (!filePath) {
          console.error('Error: Missing required argument --file <path>');
          return 1;
        }

        return await reportCommand({ filePath, format, outputPath });
      }

      case 'validate': {
        const input = getString(flags, '--input', '-i') || '';
        const output = getString(flags, '--output', '-o') || '';
        const context = getString(flags, '--context');

        if (!output) {
          console.error('Error: Missing required argument --output <str>');
          return 1;
        }

        return await validateCommand({ input, output, context });
      }

      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        return 1;
    }
  } catch (err: any) {
    console.error(`Execution error: ${err.message}`);
    return 1;
  }
}

function getString(flags: Record<string, string | boolean>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const val = flags[k];
    if (typeof val === 'string') return val;
  }
  return undefined;
}

function parseArgs(args: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg.startsWith('--') || arg.startsWith('-')) {
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        flags[arg] = next;
        i++;
      } else {
        flags[arg] = true;
      }
    } else {
      positionals.push(arg);
    }
  }

  return { flags, positionals };
}

function printHelp() {
  console.log(`
🛡️  llm-contract - Behavioral Contract Testing & Regression Suite for AI Systems

Usage:
  llm-contract <command> [options]

Commands:
  init       Create a runnable starter suite and instructions for AI coding agents
  run        Run behavioral contracts across a dataset of test cases
  compare    Compare current evaluation run against historical baseline to detect regressions
  report     Convert saved JSON evaluation run into HTML, Markdown, or terminal report
  validate   Quick single-instance validation of an AI output

Options for 'run':
  --suite, -s <path>          Path to test cases JSON file (Required)
  --baseline, -b <path>       Path to historical baseline run JSON file
  --contract <path>           ESM module exporting default contract or named 'contract'
  --policy, -p <path>         Path to CI policy JSON file
  --preset <name>             CI policy preset ('strict' | 'standard' | 'permissive')
  --runs-per-case <number>    Number of runs per case for flakiness / stability estimation (default: 1)
  --concurrency <number>      Concurrent test worker count (default: 4)
  --json                      Output raw JSON to stdout
  --html <path>               Generate interactive HTML dashboard at path
  --markdown, --md <path>     Generate GitHub PR markdown summary at path
  --output, -o <path>         Save evaluation result JSON to path

Options for 'compare':
  --baseline, -b <path>       Path to baseline run JSON
  --current, -c <path>        Path to current run JSON

Options for 'report':
  --file, -f <path>           Path to evaluation run JSON
  --format <type>             Format: 'html', 'markdown', or 'terminal'
  --output, -o <path>         Write formatted output to file

Examples:
  npx llm-contract init
  npm run test:ai
  llm-contract run --suite ./cases.json --contract ./contract.mjs --baseline ./baseline.json --preset standard
  llm-contract compare --baseline ./run-v1.json --current ./run-v2.json
  llm-contract report --file ./run.json --format html --output ./report.html
`);
}
