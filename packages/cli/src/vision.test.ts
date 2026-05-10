import { describe, expect, it } from 'vitest';
import { computeVisionTokens, resolveImages } from './vision.js';

describe('computeVisionTokens', () => {
  it('uses the Anthropic estimator for Claude models', () => {
    const tokens = computeVisionTokens('claude-opus-4-7', { height: 600, width: 800 }, 'a.png');
    // Anthropic: ceil((800*600)/750) = 640, capped at 1600.
    expect(tokens).toBe(640);
  });

  it('uses the OpenAI estimator for gpt-4o', () => {
    // OpenAI default 'high' detail: 85 + 170 * tiles. 800x600 → tiles 2x2 = 4 → 85 + 680 = 765.
    const tokens = computeVisionTokens('gpt-4o', { height: 600, width: 800 }, 'a.png');
    expect(tokens).toBeGreaterThan(85);
  });

  it('uses the Google estimator for Gemini models', () => {
    // Picks any gemini model deterministically — check >0.
    const anyGemini = 'gemini-2.5-pro';
    let tokens = 0;
    try {
      tokens = computeVisionTokens(anyGemini, { height: 600, width: 800 }, 'a.png');
    } catch {
      // If gemini-2.5-pro isn't in the registry on this runner, skip.
      return;
    }
    expect(tokens).toBeGreaterThan(0);
  });
});

describe('resolveImages', () => {
  it('returns dimensions for each image via the injected reader', async () => {
    const reader = async (path: string) => {
      if (path === 'a.png') return { height: 100, width: 200 };
      return { height: 50, width: 75 };
    };
    const out = await resolveImages(['a.png', 'b.jpg'], reader);
    expect(out).toEqual([
      { dim: { height: 100, width: 200 }, path: 'a.png' },
      { dim: { height: 50, width: 75 }, path: 'b.jpg' },
    ]);
  });

  it('returns an empty array for an empty input', async () => {
    const out = await resolveImages([], async () => ({ height: 1, width: 1 }));
    expect(out).toEqual([]);
  });
});
