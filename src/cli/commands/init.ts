import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface InitOptions {
  directory?: string;
  force?: boolean;
  agents?: boolean;
}

const CONTRACT = `import {
  defineContract,
  assertForbiddenPhrases,
  assertRequiredTopicsCovered,
} from 'llm-contract';

// Start small. Add rules only for behavior your product truly requires.
export default defineContract({
  name: 'my-ai-response',
  normalization: { trimWhitespace: true, stripCodeFences: true },
  invariants: [
    assertForbiddenPhrases(['I made that up'], { isHard: true }),
  ],
  assertions: [
    assertRequiredTopicsCovered(['help'], { minCoveredCount: 1 }),
  ],
});
`;

const CASES = JSON.stringify([
  {
    id: 'helpful-answer',
    input: 'How can you help me?',
    output: 'I can help explain the next steps.',
  },
  {
    id: 'no-invented-admission',
    input: 'Answer using only known information.',
    output: 'I can help, but I need more information first.',
  },
], null, 2) + '\n';

const README = `# AI behavior tests

Run the starter suite:

\`\`\`bash
npm run test:ai
\`\`\`

- \`contract.mjs\` defines behavior that must remain stable.
- \`cases.json\` contains representative inputs and captured model outputs.
- Replace each sample \`output\` with output from your app, or generate this JSON in your existing test setup.
- Add a baseline later with \`llm-contract run --suite ./evals/cases.json --contract ./evals/contract.mjs --output ./evals/baseline.json\`.

The package is provider-agnostic: keep using your existing OpenAI, Anthropic, Gemini, local-model, or agent SDK.
`;

const AGENT_GUIDE = `## AI behavior checks

This project uses \`llm-contract\`. Before changing prompts, models, tools, RAG retrieval, schemas, or agent orchestration:

1. Read \`evals/contract.mjs\` and preserve its hard invariants.
2. Add or update a representative case in \`evals/cases.json\`.
3. Run \`npm run test:ai\`.
4. Explain any behavioral regression; never weaken a contract merely to make a failing change pass.

Keep deterministic checks separate from optional model-based judges. Do not add network calls, telemetry, or provider credentials to the contract file.
`;

const CURSOR_GUIDE = `---
description: Preserve and test required AI behavior
globs: "**/*.{ts,tsx,js,mjs,json}"
alwaysApply: false
---

${AGENT_GUIDE}`;

export async function initCommand(options: InitOptions = {}): Promise<number> {
  const root = path.resolve(options.directory ?? process.cwd());
  const evalDir = path.join(root, 'evals');
  const files = new Map<string, string>([
    [path.join(evalDir, 'contract.mjs'), CONTRACT],
    [path.join(evalDir, 'cases.json'), CASES],
    [path.join(evalDir, 'README.md'), README],
  ]);

  if (options.agents !== false) {
    files.set(path.join(root, 'AGENTS.md'), AGENT_GUIDE);
    files.set(path.join(root, 'CLAUDE.md'), AGENT_GUIDE);
    files.set(path.join(root, 'GEMINI.md'), AGENT_GUIDE);
    files.set(path.join(root, '.cursor', 'rules', 'llm-contract.mdc'), CURSOR_GUIDE);
  }

  const existing: string[] = [];
  for (const file of files.keys()) {
    try {
      await fs.access(file);
      existing.push(path.relative(root, file));
    } catch {
      // File is available to create.
    }
  }

  if (existing.length > 0 && !options.force) {
    console.error(`Init stopped: these files already exist: ${existing.join(', ')}`);
    console.error('Run again with --force to replace only these generated targets.');
    return 1;
  }

  for (const [file, content] of files) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content, 'utf8');
  }

  const packagePath = path.join(root, 'package.json');
  try {
    const pkg = JSON.parse(await fs.readFile(packagePath, 'utf8'));
    pkg.scripts ??= {};
    pkg.scripts['test:ai'] ??= 'llm-contract run --suite ./evals/cases.json --contract ./evals/contract.mjs --preset standard';
    await fs.writeFile(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  } catch (error: any) {
    if (error?.code !== 'ENOENT') throw error;
  }

  console.log('Created a runnable AI behavior test in ./evals');
  console.log('Next: npm run test:ai');
  return 0;
}
