import type { TokenizeResult } from '@tokenometer/core';
import { describe, expect, it } from 'vitest';
import { renderModelLimits, renderSummary, renderTable } from './render.js';

const sample: TokenizeResult[] = [
  {
    approximate: false,
    format: 'json',
    inputCost: 0.001,
    inputTokens: 100,
    model: 'gpt-4o',
    provider: 'openai',
    tokenizer: 'o200k_base',
  },
  {
    approximate: true,
    format: 'yaml',
    inputCost: 0.0008,
    inputTokens: 80,
    model: 'claude-opus-4-7',
    provider: 'anthropic',
    tokenizer: 'cl100k_base',
  },
];

describe('renderTable', () => {
  it('returns a placeholder for an empty result list', () => {
    expect(renderTable([])).toContain('no results');
  });

  it('includes a header row', () => {
    const out = renderTable(sample);
    expect(out).toContain('model');
    expect(out).toContain('format');
    expect(out).toContain('tokens');
    expect(out).toContain('est. cost');
  });

  it('includes one row per result', () => {
    const out = renderTable(sample);
    const lines = out.split('\n');
    expect(lines.length).toBe(2 + sample.length);
  });

  it('marks approximate counts with a tilde', () => {
    const out = renderTable(sample);
    expect(out).toMatch(/~80/);
  });
});

describe('renderModelLimits', () => {
  it('returns empty string for an empty result list', () => {
    expect(renderModelLimits([])).toBe('');
  });

  it('lists each unique model once with context window', () => {
    const out = renderModelLimits(sample);
    expect(out).toContain('Limits:');
    expect(out).toContain('gpt-4o');
    expect(out).toContain('claude-opus-4-7');
    expect(out).toContain('ctx 128k');
    expect(out).toContain('ctx 200k');
    const occurrences = out.match(/gpt-4o/g)?.length ?? 0;
    expect(occurrences).toBe(1);
  });
});

describe('renderSummary', () => {
  it('reports cheapest and priciest when results differ', () => {
    const out = renderSummary(sample);
    expect(out).toContain('Cheapest');
    expect(out).toContain('Priciest');
  });

  it('returns empty string for a single-result list', () => {
    expect(renderSummary([sample[0] as TokenizeResult])).toBe('');
  });
});
