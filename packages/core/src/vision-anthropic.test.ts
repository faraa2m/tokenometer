import { describe, expect, it } from 'vitest';
import { visionTokens } from './vision-anthropic.js';

describe('anthropicVisionTokens', () => {
  it('uses ceil(width*height/750) below the cap', () => {
    expect(visionTokens({ width: 100, height: 100 })).toBe(Math.ceil((100 * 100) / 750));
    expect(visionTokens({ width: 300, height: 200 })).toBe(Math.ceil((300 * 200) / 750));
  });

  it('caps at 1600 tokens for very large images', () => {
    expect(visionTokens({ width: 4000, height: 4000 })).toBe(1600);
    expect(visionTokens({ width: 10_000, height: 10_000 })).toBe(1600);
  });

  it('treats square / portrait / landscape symmetrically (area-based)', () => {
    expect(visionTokens({ width: 600, height: 200 })).toBe(
      visionTokens({ width: 200, height: 600 }),
    );
  });

  it('rounds up tiny non-zero areas to at least 1 token', () => {
    expect(visionTokens({ width: 1, height: 1 })).toBe(1);
  });

  it('hits the cap exactly at the threshold', () => {
    // ceil(area/750) === 1600 when area / 750 just exceeds 1599.
    // pick area = 750 * 1600 → exactly 1600 tokens, still capped.
    expect(visionTokens({ width: 1200, height: 1000 })).toBe(1600);
  });

  it('throws on non-positive dimensions', () => {
    expect(() => visionTokens({ width: 0, height: 100 })).toThrow();
    expect(() => visionTokens({ width: 100, height: -1 })).toThrow();
  });
});
