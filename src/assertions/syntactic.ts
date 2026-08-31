import type { Assertion, Invariant, AssertionContext } from '../types/contract.js';

export interface ValidJsonOptions {
  name?: string;
  isHard?: boolean;
}

/**
 * Asserts that the normalized output is valid JSON.
 */
export function assertValidJson(options?: ValidJsonOptions): Invariant {
  return {
    name: options?.name ?? 'assertValidJson',
    code: 'PARSE_ERROR',
    severity: 'error',
    check: (ctx: AssertionContext) => {
      try {
        JSON.parse(ctx.normalizedOutput);
        return {
          pass: true,
          score: 1.0,
          message: 'Output parsed successfully as JSON',
        };
      } catch (err: any) {
        return {
          pass: false,
          score: 0.0,
          code: 'PARSE_ERROR',
          message: `Output is not valid JSON: ${err.message}`,
          actual: ctx.normalizedOutput,
        };
      }
    },
  };
}

export interface CodeBlockOptions {
  language?: string;
  name?: string;
  isHard?: boolean;
}

/**
 * Asserts that the output contains a markdown code block, optionally matching a language tag.
 */
export function assertCodeBlock(options?: CodeBlockOptions): Assertion {
  const lang = options?.language ? options.language.toLowerCase() : undefined;
  const name = options?.name ?? (lang ? `assertCodeBlock(${lang})` : 'assertCodeBlock');

  return {
    name,
    code: 'FORMAT_VIOLATION',
    isHardAssertion: options?.isHard ?? false,
    check: (ctx: AssertionContext) => {
      const regex = lang
        ? new RegExp(`\`\`\`${lang}\\s*\\n([\\s\\S]*?)\`\`\``, 'i')
        : /```(?:[a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)```/;

      const match = ctx.rawOutput.match(regex);
      if (match) {
        return {
          pass: true,
          score: 1.0,
          evidence: { codeBlockContent: match[1] },
        };
      }

      return {
        pass: false,
        score: 0.0,
        code: 'FORMAT_VIOLATION',
        message: lang
          ? `Expected output to contain a \`\`\`${lang} code block.`
          : 'Expected output to contain a markdown code block.',
      };
    },
  };
}
