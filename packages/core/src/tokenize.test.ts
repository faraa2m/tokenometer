import { describe, expect, it } from 'vitest';
import { approxTokenCount, tokenize, tokenizeMatrix } from './tokenize.js';

describe('tokenize', () => {
  it('approxTokenCount scales with input length', () => {
    const short = approxTokenCount('hello', 'anthropic');
    const long = approxTokenCount('hello'.repeat(100), 'anthropic');
    expect(long).toBeGreaterThan(short);
  });

  it('tokenize returns a non-zero cost for non-empty input', () => {
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
    const j = tokenize({ format: 'json', modelId: 'claude-opus-4-7', prompt: sample });
    const x = tokenize({ format: 'xml', modelId: 'claude-opus-4-7', prompt: sample });
    expect(j.inputTokens).not.toBe(x.inputTokens);
  });

  it('tokenizeMatrix returns N x M results', () => {
    const results = tokenizeMatrix({
      formats: ['json', 'yaml'],
      modelIds: ['claude-opus-4-7', 'gpt-4o'],
      prompt: '{"a":1}',
    });
    expect(results).toHaveLength(4);
  });
});
