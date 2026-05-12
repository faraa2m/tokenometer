import { describe, expect, it } from 'vitest';
import type { CodePromptRow } from './measure-code.js';
import { renderCodeSection } from './render-code-section.js';

const row = (overrides: Partial<CodePromptRow>): CodePromptRow => ({
  location: 'src/a.ts:10',
  model: 'gpt-4o',
  baseTokens: 100,
  headTokens: 120,
  baseCost: 0.001,
  headCost: 0.0012,
  costDelta: 0.0002,
  ...overrides,
});

describe('renderCodeSection', () => {
  it('returns empty string for empty input', () => {
    expect(renderCodeSection([], 5)).toBe('');
  });

  it('renders a single-row table without <details>', () => {
    const out = renderCodeSection([row({})], 5);
    expect(out).toContain('### Code-Embedded Prompts (1)');
    expect(out).toContain('| `src/a.ts:10` | gpt-4o |');
    expect(out).not.toContain('<details>');
  });

  it('caps the visible table to topN and folds the rest into <details>', () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      row({ location: `src/f${i}.ts:1`, costDelta: 0.0001 * (i + 1) }),
    );
    const out = renderCodeSection(rows, 3);
    expect(out).toContain('### Code-Embedded Prompts (10)');
    expect(out).toContain('<details><summary>All 10 prompts</summary>');
    const tableSection = out.split('<details>')[0] ?? '';
    expect(tableSection).toContain('src/f9.ts:1');
    expect(tableSection).toContain('src/f8.ts:1');
    expect(tableSection).toContain('src/f7.ts:1');
  });

  it('sorts by |costDelta| desc then by |tokensDelta| desc then by location', () => {
    const rows: CodePromptRow[] = [
      row({ location: 'src/small.ts:1', costDelta: 0.0001, baseTokens: 50, headTokens: 60 }),
      row({ location: 'src/big.ts:1', costDelta: 0.001, baseTokens: 50, headTokens: 200 }),
      row({ location: 'src/mid.ts:1', costDelta: 0.0005, baseTokens: 50, headTokens: 100 }),
    ];
    const out = renderCodeSection(rows, 5);
    const lines = out.split('\n');
    const bigIdx = lines.findIndex((l) => l.includes('big.ts'));
    const midIdx = lines.findIndex((l) => l.includes('mid.ts'));
    const smallIdx = lines.findIndex((l) => l.includes('small.ts'));
    expect(bigIdx).toBeLessThan(midIdx);
    expect(midIdx).toBeLessThan(smallIdx);
  });

  it('matches snapshot for canonical fixture', () => {
    const rows: CodePromptRow[] = [
      row({
        location: 'src/router.ts:42',
        model: 'claude-opus-4-7',
        baseTokens: 100,
        headTokens: 220,
        costDelta: 0.0018,
      }),
      row({
        location: 'src/agent.ts:10',
        model: 'gpt-4o',
        baseTokens: 80,
        headTokens: 0,
        costDelta: -0.0008,
      }),
    ];
    expect(renderCodeSection(rows, 5)).toMatchSnapshot();
  });
});
