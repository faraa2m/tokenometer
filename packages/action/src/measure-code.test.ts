import { describe, expect, it } from 'vitest';
import type { ExtractedPrompt } from './detectors/extracted-prompt.js';
import { measureExtractedPrompts } from './measure-code.js';

const make = (
  overrides: Partial<ExtractedPrompt> & Pick<ExtractedPrompt, 'matchId' | 'text'>,
): ExtractedPrompt => ({
  file: 'src/a.ts',
  line: 10,
  col: 1,
  source: 'annotation',
  ...overrides,
});

describe('measureExtractedPrompts', () => {
  it('matches by matchId and produces a single row per pair', () => {
    const base: ExtractedPrompt[] = [make({ matchId: 'm1', text: 'hello world' })];
    const head: ExtractedPrompt[] = [make({ matchId: 'm1', text: 'hello there world' })];
    const rows = measureExtractedPrompts(base, head, ['gpt-4o'], ['text']);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    if (!row) throw new Error('expected row');
    expect(row.model).toBe('gpt-4o');
    expect(row.baseTokens).toBeGreaterThan(0);
    expect(row.headTokens).toBeGreaterThan(row.baseTokens);
    expect(row.costDelta).toBeGreaterThan(0);
  });

  it('treats unmatched head as added (baseTokens=0)', () => {
    const base: ExtractedPrompt[] = [];
    const head: ExtractedPrompt[] = [make({ matchId: 'mAdd', text: 'new prompt added' })];
    const rows = measureExtractedPrompts(base, head, ['gpt-4o'], ['text']);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    if (!row) throw new Error('expected row');
    expect(row.baseTokens).toBe(0);
    expect(row.baseCost).toBe(0);
    expect(row.headTokens).toBeGreaterThan(0);
    expect(row.costDelta).toBeGreaterThan(0);
  });

  it('treats unmatched base as removed (headTokens=0)', () => {
    const base: ExtractedPrompt[] = [make({ matchId: 'mDel', text: 'old prompt removed' })];
    const head: ExtractedPrompt[] = [];
    const rows = measureExtractedPrompts(base, head, ['gpt-4o'], ['text']);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    if (!row) throw new Error('expected row');
    expect(row.headTokens).toBe(0);
    expect(row.headCost).toBe(0);
    expect(row.baseTokens).toBeGreaterThan(0);
    expect(row.costDelta).toBeLessThan(0);
  });

  it('falls back to Levenshtein when matchId changes within a file (ratio >= 0.6)', () => {
    const base: ExtractedPrompt[] = [
      make({ matchId: 'oldId', text: 'You are a helpful assistant.' }),
    ];
    const head: ExtractedPrompt[] = [
      make({ matchId: 'newId', text: 'You are a helpful assistant for code.' }),
    ];
    const rows = measureExtractedPrompts(base, head, ['gpt-4o'], ['text']);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    if (!row) throw new Error('expected row');
    expect(row.baseTokens).toBeGreaterThan(0);
    expect(row.headTokens).toBeGreaterThan(0);
  });

  it('does not fuzzy-match prompts in different files', () => {
    const base: ExtractedPrompt[] = [
      make({ file: 'src/x.ts', matchId: 'oldX', text: 'You are a helpful assistant.' }),
    ];
    const head: ExtractedPrompt[] = [
      make({ file: 'src/y.ts', matchId: 'newY', text: 'You are a helpful assistant.' }),
    ];
    const rows = measureExtractedPrompts(base, head, ['gpt-4o'], ['text']);
    expect(rows).toHaveLength(2);
  });

  it('prefers the prompt-annotated model over defaultModels[0]', () => {
    const base: ExtractedPrompt[] = [
      make({ matchId: 'm1', text: 'hello', model: 'claude-opus-4-7' }),
    ];
    const head: ExtractedPrompt[] = [
      make({ matchId: 'm1', text: 'hello world', model: 'claude-opus-4-7' }),
    ];
    const rows = measureExtractedPrompts(base, head, ['gpt-4o'], ['text']);
    expect(rows[0]?.model).toBe('claude-opus-4-7');
  });

  it('returns empty when defaultModels is empty', () => {
    const rows = measureExtractedPrompts(
      [make({ matchId: 'm1', text: 'hello' })],
      [],
      [],
      ['text'],
    );
    expect(rows).toEqual([]);
  });

  it('reports the location as file:line', () => {
    const base: ExtractedPrompt[] = [];
    const head: ExtractedPrompt[] = [
      make({ file: 'src/router.ts', line: 42, matchId: 'm1', text: 'hi' }),
    ];
    const rows = measureExtractedPrompts(base, head, ['gpt-4o'], ['text']);
    expect(rows[0]?.location).toBe('src/router.ts:42');
  });
});
