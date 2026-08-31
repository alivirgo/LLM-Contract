import type { NormalizationOptions } from '../types/contract.js';

export interface NormalizationResult {
  raw: string;
  normalized: string;
  wasModified: boolean;
  appliedTransforms: string[];
}

/**
 * Conservative output normalizer.
 * Only applies explicitly enabled transformations and never silently alters semantic values.
 */
export function normalizeOutput(
  raw: string,
  options?: NormalizationOptions
): NormalizationResult {
  if (!options || typeof raw !== 'string') {
    return {
      raw: raw ?? '',
      normalized: raw ?? '',
      wasModified: false,
      appliedTransforms: [],
    };
  }

  let current = raw;
  const applied: string[] = [];

  // 1. Strip Markdown code fences if enabled
  if (options.stripCodeFences) {
    const stripped = stripMarkdownCodeFences(current);
    if (stripped !== current) {
      current = stripped;
      applied.push('stripCodeFences');
    }
  }

  // 2. Extract JSON block if surrounded by conversational filler and enabled
  if (options.extractJsonBlock) {
    const extracted = extractFirstJsonStructure(current);
    if (extracted !== current) {
      current = extracted;
      applied.push('extractJsonBlock');
    }
  }

  // 3. Trim leading/trailing whitespace if enabled
  if (options.trimWhitespace) {
    const trimmed = current.trim();
    if (trimmed !== current) {
      current = trimmed;
      applied.push('trimWhitespace');
    }
  }

  // 4. Custom transformation if supplied
  if (options.customTransform) {
    const customResult = options.customTransform(current);
    if (customResult !== current) {
      current = customResult;
      applied.push('customTransform');
    }
  }

  return {
    raw,
    normalized: current,
    wasModified: applied.length > 0,
    appliedTransforms: applied,
  };
}

/**
 * Strips markdown code blocks: ```json ... ``` or ``` ... ```
 */
function stripMarkdownCodeFences(text: string): string {
  const fenceRegex = /^\s*```(?:[a-zA-Z0-9_-]+)?\r?\n([\s\S]*?)\r?\n\s*```\s*$/;
  const match = text.match(fenceRegex);
  if (match && match[1] !== undefined) {
    return match[1];
  }
  return text;
}

/**
 * Safely extracts the first outermost balanced JSON object `{...}` or array `[...]`
 */
function extractFirstJsonStructure(text: string): string {
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');

  let startIndex = -1;
  let openChar = '{';
  let closeChar = '}';

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
    openChar = '{';
    closeChar = '}';
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    openChar = '[';
    closeChar = ']';
  } else {
    return text;
  }

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === openChar) {
        depth++;
      } else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          return text.slice(startIndex, i + 1);
        }
      }
    }
  }

  return text;
}
