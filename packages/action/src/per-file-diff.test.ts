import { describe, expect, it } from 'vitest';
import { type PerFileInput, aggregatePerFileDiff, renderPerFileMarkdown } from './per-file-diff.js';

const cell = (tokens: number, cost: number) => ({ cost, tokens });

const modified = (path: string, baseTokens: number, headTokens: number): PerFileInput => ({
  base: [cell(baseTokens, baseTokens * 0.000015)],
  head: [cell(headTokens, headTokens * 0.000015)],
  path,
});

const added = (path: string, headTokens: number): PerFileInput => ({
  base: null,
  head: [cell(headTokens, headTokens * 0.000015)],
  path,
});

const deleted = (path: string, baseTokens: number): PerFileInput => ({
  base: [cell(baseTokens, baseTokens * 0.000015)],
  head: [],
  path,
});

const noChange = (path: string, tokens: number): PerFileInput => ({
  base: [cell(tokens, tokens * 0.000015)],
  head: [cell(tokens, tokens * 0.000015)],
  path,
});

describe('aggregatePerFileDiff', () => {
  it('sums (model, format) cells per file', () => {
    const result = aggregatePerFileDiff(
      [
        {
          base: [cell(100, 0.001), cell(80, 0.0008)],
          head: [cell(150, 0.0015), cell(120, 0.0012)],
          path: 'prompts/agent.md',
        },
      ],
      { topN: 5 },
    );
    expect(result.totalFiles).toBe(1);
    const row = result.topRows[0];
    if (!row) throw new Error('expected row');
    expect(row.baseTokens).toBe(180);
    expect(row.headTokens).toBe(270);
    expect(row.tokensDelta).toBe(90);
    expect(row.baseCost).toBeCloseTo(0.0018, 8);
    expect(row.headCost).toBeCloseTo(0.0027, 8);
    expect(row.costDelta).toBeCloseTo(0.0009, 8);
    expect(row.status).toBe('modified');
  });

  it('marks added files (base=null) and deleted files (head=[])', () => {
    const result = aggregatePerFileDiff(
      [added('new.md', 200), deleted('gone.md', 300), noChange('keep.md', 50)],
      { topN: 5 },
    );
    const byPath = Object.fromEntries(result.allRows.map((r) => [r.path, r]));
    const newRow = byPath['new.md'];
    const goneRow = byPath['gone.md'];
    const keepRow = byPath['keep.md'];
    if (!newRow || !goneRow || !keepRow) throw new Error('rows missing');
    expect(newRow.status).toBe('added');
    expect(newRow.baseTokens).toBe(0);
    expect(newRow.tokensDelta).toBe(200);
    expect(goneRow.status).toBe('deleted');
    expect(goneRow.headTokens).toBe(0);
    expect(goneRow.tokensDelta).toBe(-300);
    expect(keepRow.status).toBe('modified');
    expect(keepRow.tokensDelta).toBe(0);
    expect(keepRow.costDelta).toBe(0);
  });

  it('sorts by |Δ USD| desc → tokens Δ desc → path lex asc', () => {
    const inputs: PerFileInput[] = [
      // Same |Δ USD|, different tokensDelta — higher token delta should win
      {
        base: [cell(0, 0)],
        head: [cell(100, 0.0005)],
        path: 'b.md',
      },
      {
        base: [cell(0, 0)],
        head: [cell(50, 0.0005)],
        path: 'a.md',
      },
      // Big positive delta
      {
        base: [cell(0, 0)],
        head: [cell(1000, 0.005)],
        path: 'big.md',
      },
      // Big negative delta — same |Δ USD| as big.md, lex tiebreak after tokensDelta
      {
        base: [cell(1000, 0.005)],
        head: [cell(0, 0)],
        path: 'shrink.md',
      },
      // Zero delta — last
      noChange('zero.md', 100),
    ];
    const result = aggregatePerFileDiff(inputs, { topN: 10 });
    expect(result.allRows.map((r) => r.path)).toEqual([
      // big.md and shrink.md tie on |Δ USD|, big.md wins on tokensDelta (positive vs negative)
      'big.md',
      'shrink.md',
      // b.md and a.md tie on |Δ USD|, b.md wins on tokensDelta (100 > 50)
      'b.md',
      'a.md',
      'zero.md',
    ]);
  });

  it('truncates topRows to topN and returns full list as allRows', () => {
    const inputs = Array.from({ length: 10 }, (_, i) => modified(`f${i}.md`, 0, (i + 1) * 100));
    const result = aggregatePerFileDiff(inputs, { topN: 3 });
    expect(result.totalFiles).toBe(10);
    expect(result.topRows.length).toBe(3);
    expect(result.allRows.length).toBe(10);
    // Largest delta first
    expect(result.topRows[0]?.path).toBe('f9.md');
    expect(result.topRows[2]?.path).toBe('f7.md');
  });

  it('clamps topN to [1, 20]', () => {
    const inputs = Array.from({ length: 25 }, (_, i) => modified(`f${i}.md`, 0, i + 1));
    expect(aggregatePerFileDiff(inputs, { topN: 0 }).topRows.length).toBe(1);
    expect(aggregatePerFileDiff(inputs, { topN: -5 }).topRows.length).toBe(1);
    expect(aggregatePerFileDiff(inputs, { topN: 50 }).topRows.length).toBe(20);
    expect(aggregatePerFileDiff(inputs, { topN: 7 }).topRows.length).toBe(7);
  });

  it('handles 1 / 5 / 10 / 50 file inputs without truncation regression', () => {
    for (const n of [1, 5, 10, 50]) {
      const inputs = Array.from({ length: n }, (_, i) => modified(`f${i}.md`, i, i + 5));
      const result = aggregatePerFileDiff(inputs, { topN: 5 });
      expect(result.totalFiles).toBe(n);
      expect(result.topRows.length).toBe(Math.min(5, n));
      expect(result.allRows.length).toBe(n);
      // Sum of tokensDelta should equal sum across all rows regardless of truncation
      const totalDelta = result.allRows.reduce((acc, r) => acc + r.tokensDelta, 0);
      expect(totalDelta).toBe(n * 5);
    }
  });
});

describe('renderPerFileMarkdown', () => {
  it('returns empty string when no files', () => {
    const out = renderPerFileMarkdown(aggregatePerFileDiff([], { topN: 5 }));
    expect(out).toBe('');
  });

  it('omits the <details> block when totalFiles <= topN', () => {
    const inputs = Array.from({ length: 3 }, (_, i) => modified(`p${i}.md`, 0, (i + 1) * 100));
    const out = renderPerFileMarkdown(aggregatePerFileDiff(inputs, { topN: 5 }));
    expect(out).not.toContain('<details>');
    expect(out).toContain('### Top changed files (3)');
  });

  it('includes the <details> block when totalFiles > topN', () => {
    const inputs = Array.from({ length: 10 }, (_, i) => modified(`p${i}.md`, 0, (i + 1) * 100));
    const out = renderPerFileMarkdown(aggregatePerFileDiff(inputs, { topN: 5 }));
    expect(out).toContain('<details><summary>All 10 files</summary>');
    expect(out).toContain('### Top changed files (5)');
    expect(out).toContain('</details>');
  });

  it('marks added files with (+) and deleted files with (−)', () => {
    const inputs = [added('new.md', 100), deleted('gone.md', 200)];
    const out = renderPerFileMarkdown(aggregatePerFileDiff(inputs, { topN: 5 }));
    expect(out).toContain('`new.md` (+)');
    expect(out).toContain('`gone.md` (−)');
  });

  it('matches snapshot for canonical fixture sizes (1 / 5 / 10 / 50)', () => {
    for (const n of [1, 5, 10, 50]) {
      const inputs = Array.from({ length: n }, (_, i) => {
        // Mix added / deleted / modified for richer snapshot
        if (i % 7 === 0 && i > 0) return added(`a${i}.md`, (i + 1) * 50);
        if (i % 11 === 0 && i > 0) return deleted(`d${i}.md`, (i + 1) * 30);
        return modified(`m${i}.md`, i * 10, (i + 1) * 75);
      });
      const out = renderPerFileMarkdown(aggregatePerFileDiff(inputs, { topN: 5 }));
      expect(out).toMatchSnapshot(`fixture-${n}-files`);
    }
  });
});
