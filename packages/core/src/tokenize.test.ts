import { describe, expect, it } from 'vitest';
import { countTokens, tokenize, tokenizeMatrix } from './tokenize.js';

describe('countTokens', () => {
  it('returns OpenAI counts as exact (o200k_base)', () => {
    const result = countTokens('Hello, world!', 'openai');
    expect(result.approximate).toBe(false);
    expect(result.tokenizer).toBe('o200k_base');
    expect(result.count).toBeGreaterThan(0);
  });

  it('flags Anthropic counts as approximate (cl100k_base proxy)', () => {
    const result = countTokens('Hello, world!', 'anthropic');
    expect(result.approximate).toBe(true);
    expect(result.tokenizer).toBe('cl100k_base');
  });

  it('flags Google counts as approximate (heuristic only)', () => {
    const result = countTokens('Hello, world!', 'google');
    expect(result.approximate).toBe(true);
    expect(result.tokenizer).toBe('heuristic');
  });

  it('count scales with input length', () => {
    const short = countTokens('hi', 'openai');
    const long = countTokens('hi'.repeat(200), 'openai');
    expect(long.count).toBeGreaterThan(short.count);
  });
});

describe('tokenize', () => {
  it('returns a non-zero cost for non-empty input', () => {
    const result = tokenize({
      format: 'json',
      modelId: 'claude-opus-4-7',
      prompt: '{"hello":"world"}',
    });
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(result.inputCost).toBeGreaterThan(0);
    expect(result.provider).toBe('anthropic');
  });

  it('different formats produce different token counts for the same input', () => {
    const sample = '{"items":[{"id":1,"label":"a"},{"id":2,"label":"b"}]}';
    const j = tokenize({ format: 'json', modelId: 'gpt-4o', prompt: sample });
    const x = tokenize({ format: 'xml', modelId: 'gpt-4o', prompt: sample });
    expect(j.inputTokens).not.toBe(x.inputTokens);
  });

  it('marks gpt models as exact, claude/gemini as approximate', () => {
    const sample = 'plain prompt';
    expect(tokenize({ format: 'text', modelId: 'gpt-4o', prompt: sample }).approximate).toBe(false);
    expect(tokenize({ format: 'text', modelId: 'claude-opus-4-7', prompt: sample }).approximate).toBe(
      true,
    );
    expect(tokenize({ format: 'text', modelId: 'gemini-2.5-pro', prompt: sample }).approximate).toBe(
      true,
    );
  });
});

describe('tokenizeMatrix', () => {
  it('returns N x M results', () => {
    const results = tokenizeMatrix({
      formats: ['json', 'yaml'],
      modelIds: ['claude-opus-4-7', 'gpt-4o'],
      prompt: '{"a":1}',
    });
    expect(results).toHaveLength(4);
  });
});
