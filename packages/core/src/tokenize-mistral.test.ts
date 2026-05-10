import { describe, expect, it } from 'vitest';
import { isTekken, mistralCount } from './tokenize-mistral.js';

describe('isTekken', () => {
  it('classifies known Tekken-family models as Tekken', () => {
    expect(isTekken('mistral-nemo')).toBe(true);
    expect(isTekken('pixtral-12b')).toBe(true);
    expect(isTekken('pixtral-large-latest')).toBe(true);
    expect(isTekken('mistral-medium-2505')).toBe(true);
    expect(isTekken('magistral-small')).toBe(true);
    expect(isTekken('ministral-3b-latest')).toBe(true);
    expect(isTekken('devstral-small-2505')).toBe(true);
  });

  it('classifies SentencePiece-era ids as not Tekken', () => {
    expect(isTekken('open-mistral-7b')).toBe(false);
    expect(isTekken('open-mixtral-8x7b')).toBe(false);
    expect(isTekken('open-mixtral-8x22b')).toBe(false);
    expect(isTekken('codestral-latest')).toBe(false);
    expect(isTekken('mistral-large-latest')).toBe(false);
  });
});

describe('mistralCount', () => {
  it('uses the SentencePiece tokenizer for V1/V2/V3 models', () => {
    const result = mistralCount('Hello, world!', 'open-mistral-7b');
    expect(result.tokenizer).toBe('mistral_v1_v3');
    expect(result.approximate).toBe(true);
    // mistral-tokenizer-js prepends BOS + leading space → at minimum a few tokens.
    expect(result.tokens).toBeGreaterThan(0);
  });

  it('SentencePiece counts scale with input length', () => {
    const short = mistralCount('hi', 'open-mistral-7b');
    const long = mistralCount('hi '.repeat(200), 'open-mistral-7b');
    expect(long.tokens).toBeGreaterThan(short.tokens);
  });

  it('falls back to chars/4 heuristic for Tekken models', () => {
    // 16 chars → ceil(16 / 4) = 4 tokens.
    const text = 'a'.repeat(16);
    const result = mistralCount(text, 'mistral-nemo');
    expect(result.tokenizer).toBe('heuristic');
    expect(result.approximate).toBe(true);
    expect(result.tokens).toBe(4);
  });

  it('Tekken heuristic and SentencePiece path can disagree (sanity: same input, different tokens)', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const sp = mistralCount(text, 'open-mistral-7b');
    const tk = mistralCount(text, 'mistral-nemo');
    // Different families, different counts — test only that both produce something positive.
    expect(sp.tokens).toBeGreaterThan(0);
    expect(tk.tokens).toBeGreaterThan(0);
    // Both paths are flagged approximate (the contract is uniform).
    expect(sp.approximate).toBe(true);
    expect(tk.approximate).toBe(true);
  });
});
