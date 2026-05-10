import type { TokenizeResult, TokenometerFileResult } from '@tokenometer/core';
import { describe, expect, it } from 'vitest';
import { renderByFile, renderModelLimits, renderSummary, renderTable } from './render.js';

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

  it('omits latency columns when no cell has latency data', () => {
    const out = renderTable(sample);
    expect(out).not.toContain('p50 ttft');
    expect(out).not.toContain('p50 total');
    expect(out).not.toContain('tokens/s');
  });

  it('adds latency columns when at least one cell has latency data', () => {
    const withLatency: TokenizeResult[] = [
      {
        ...(sample[0] as TokenizeResult),
        latency: {
          trials: [
            { ttftMs: 200, totalMs: 1500, outputTokens: 200, tokensPerSec: 153.85 },
            { ttftMs: 220, totalMs: 1600, outputTokens: 200, tokensPerSec: 144.93 },
            { ttftMs: 240, totalMs: 1700, outputTokens: 200, tokensPerSec: 136.99 },
          ],
          p50: { ttftMs: 220, totalMs: 1600, tokensPerSec: 144.93 },
          p95: { ttftMs: 240, totalMs: 1700, tokensPerSec: 153.85 },
          mean: { ttftMs: 220, totalMs: 1600, tokensPerSec: 145.26 },
        },
      },
    ];
    const out = renderTable(withLatency);
    expect(out).toContain('p50 ttft');
    expect(out).toContain('p50 total');
    expect(out).toContain('tokens/s');
    expect(out).toContain('220 ms');
    expect(out).toContain('1600 ms');
  });

  it('renders a placeholder dash for cells without latency when others have it', () => {
    const mixed: TokenizeResult[] = [
      sample[0] as TokenizeResult,
      {
        ...(sample[1] as TokenizeResult),
        latency: {
          trials: [{ ttftMs: 100, totalMs: 800, outputTokens: 200, tokensPerSec: 285.7 }],
          p50: { ttftMs: 100, totalMs: 800, tokensPerSec: 285.7 },
          p95: { ttftMs: 100, totalMs: 800, tokensPerSec: 285.7 },
          mean: { ttftMs: 100, totalMs: 800, tokensPerSec: 285.7 },
        },
      },
    ];
    const out = renderTable(mixed);
    expect(out).toContain('p50 ttft');
    // The first cell (no latency) should have placeholders.
    const dataLines = out.split('\n').slice(2);
    expect(dataLines[0]).toMatch(/-\s+-\s+-/);
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

describe('renderByFile', () => {
  const file1: TokenometerFileResult = {
    path: 'prompts/agent.md',
    results: [
      {
        approximate: false,
        format: 'json',
        inputCost: 0.0186,
        inputTokens: 1243,
        model: 'gpt-4o',
        provider: 'openai',
        tokenizer: 'o200k_base',
      },
    ],
  };
  const file2: TokenometerFileResult = {
    path: 'prompts/router.md',
    results: [
      {
        approximate: false,
        format: 'json',
        inputCost: 0.0131,
        inputTokens: 872,
        model: 'gpt-4o',
        provider: 'openai',
        tokenizer: 'o200k_base',
      },
    ],
  };

  it('returns empty for a single-file input (no-op)', () => {
    expect(renderByFile([file1])).toBe('');
  });

  it('returns empty when no files are provided', () => {
    expect(renderByFile([])).toBe('');
  });

  it('renders a per-file table for multiple files', () => {
    const out = renderByFile([file1, file2]);
    expect(out).toContain('By file:');
    expect(out).toContain('File');
    expect(out).toContain('Tokens');
    expect(out).toContain('USD');
    expect(out).toContain('prompts/agent.md');
    expect(out).toContain('prompts/router.md');
    // 1,243 with comma
    expect(out).toContain('1,243');
    expect(out).toContain('872');
  });

  it('sums tokens and cost across the cells of each file', () => {
    const file: TokenometerFileResult = {
      path: 'p.md',
      results: [
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
          approximate: false,
          format: 'yaml',
          inputCost: 0.002,
          inputTokens: 200,
          model: 'gpt-4o',
          provider: 'openai',
          tokenizer: 'o200k_base',
        },
      ],
    };
    const out = renderByFile([file, file2]);
    expect(out).toContain('300'); // 100+200 sum
  });
});
