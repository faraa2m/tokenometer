import type { TokenizeResult } from '@tokenometer/core';
import { describe, expect, it } from 'vitest';
import { renderSummary, renderTable } from './render.js';

const sample: TokenizeResult[] = [
  {
    format: 'json',
    inputCost: 0.001,
    inputTokens: 100,
    model: 'claude-opus-4-7',
    provider: 'anthropic',
  },
  {
    format: 'yaml',
    inputCost: 0.0008,
    inputTokens: 80,
    model: 'claude-opus-4-7',
    provider: 'anthropic',
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
});

describe('renderSummary', () => {
  it('reports cheapest and priciest when results differ', () => {
    const out = renderSummary(sample);
    expect(out).toContain('Cheapest');
    expect(out).toContain('Priciest');
    expect(out).toContain('yaml');
  });

  it('returns empty string for a single-result list', () => {
    expect(renderSummary([sample[0] as TokenizeResult])).toBe('');
  });
});
