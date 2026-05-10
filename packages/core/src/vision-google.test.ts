import { describe, expect, it } from 'vitest';
import { visionTokens } from './vision-google.js';

describe('googleVisionTokens', () => {
  it('returns 258 flat for images at or below 384x384', () => {
    expect(visionTokens({ width: 100, height: 100 })).toBe(258);
    expect(visionTokens({ width: 384, height: 384 })).toBe(258);
    expect(visionTokens({ width: 200, height: 380 })).toBe(258);
  });

  it('crosses the threshold at 385 on either axis', () => {
    expect(visionTokens({ width: 385, height: 384 })).toBe(
      258 * Math.ceil(385 / 768) * Math.ceil(384 / 768),
    );
    expect(visionTokens({ width: 384, height: 385 })).toBe(
      258 * Math.ceil(384 / 768) * Math.ceil(385 / 768),
    );
  });

  it('tiles by 768 above the threshold (square)', () => {
    expect(visionTokens({ width: 768, height: 768 })).toBe(258 * 1 * 1);
    expect(visionTokens({ width: 1024, height: 1024 })).toBe(258 * 2 * 2);
    expect(visionTokens({ width: 1536, height: 1536 })).toBe(258 * 2 * 2);
    expect(visionTokens({ width: 1537, height: 1537 })).toBe(258 * 3 * 3);
  });

  it('handles portrait and landscape', () => {
    expect(visionTokens({ width: 2000, height: 600 })).toBe(
      258 * Math.ceil(2000 / 768) * Math.ceil(600 / 768),
    );
    expect(visionTokens({ width: 600, height: 2000 })).toBe(
      258 * Math.ceil(600 / 768) * Math.ceil(2000 / 768),
    );
  });

  it('treats portrait/landscape symmetrically', () => {
    expect(visionTokens({ width: 1024, height: 2048 })).toBe(
      visionTokens({ width: 2048, height: 1024 }),
    );
  });

  it('respects the floor of 1 tile per axis above the small threshold', () => {
    // 500x100 falls into the >384 branch on width; ceil(500/768)=1, ceil(100/768)=1.
    expect(visionTokens({ width: 500, height: 100 })).toBe(258);
  });

  it('throws on non-positive dimensions', () => {
    expect(() => visionTokens({ width: 0, height: 1000 })).toThrow();
    expect(() => visionTokens({ width: 1000, height: 0 })).toThrow();
  });
});
