import { describe, it, expect } from 'vitest';
import { normalizeOutput } from '../../src/core/normalizer.js';
import { malformedJsonOutputs } from '../fixtures/malformed-output.js';

describe('Conservative Output Normalizer', () => {
  it('should return raw output unchanged when no normalization options are provided', () => {
    const raw = '   {"foo": "bar"}   ';
    const result = normalizeOutput(raw);
    expect(result.normalized).toBe(raw);
    expect(result.raw).toBe(raw);
    expect(result.wasModified).toBe(false);
  });

  it('should strip markdown code fences only when stripCodeFences is true', () => {
    const raw = malformedJsonOutputs.wrappedInMarkdown;
    const result = normalizeOutput(raw, { stripCodeFences: true });
    expect(result.normalized).toBe('{"name": "Alice", "age": 30}');
    expect(result.raw).toBe(raw);
    expect(result.wasModified).toBe(true);
    expect(result.appliedTransforms).toContain('stripCodeFences');
  });

  it('should strip markdown code fences without language tag', () => {
    const raw = malformedJsonOutputs.wrappedInMarkdownNoLang;
    const result = normalizeOutput(raw, { stripCodeFences: true });
    expect(result.normalized).toBe('{"name": "Alice", "age": 30}');
    expect(result.wasModified).toBe(true);
  });

  it('should extract balanced JSON structure from conversational filler when enabled', () => {
    const raw = malformedJsonOutputs.surroundedByConversationalFiller;
    const result = normalizeOutput(raw, { extractJsonBlock: true });
    expect(result.normalized).toBe('{"name": "Alice", "age": 30}');
    expect(result.wasModified).toBe(true);
  });

  it('should trim whitespace when trimWhitespace is true', () => {
    const raw = '  \n hello world \t ';
    const result = normalizeOutput(raw, { trimWhitespace: true });
    expect(result.normalized).toBe('hello world');
    expect(result.wasModified).toBe(true);
  });

  it('should apply custom transformation without corrupting raw output', () => {
    const raw = 'VALUE:123';
    const result = normalizeOutput(raw, {
      customTransform: s => s.replace('VALUE:', ''),
    });
    expect(result.normalized).toBe('123');
    expect(result.raw).toBe(raw);
  });
});
