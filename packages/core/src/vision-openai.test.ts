import { describe, expect, it } from 'vitest';
import { visionTokens } from './vision-openai.js';

describe('openaiVisionTokens', () => {
  it('returns 85 for low detail regardless of size', () => {
    expect(visionTokens({ width: 100, height: 100, detail: 'low' })).toBe(85);
    expect(visionTokens({ width: 5000, height: 5000, detail: 'low' })).toBe(85);
  });

  it('high detail uses 85 + 170 * tiles after resize', () => {
    // 512x512 → 1 tile → 85 + 170 = 255
    expect(visionTokens({ width: 512, height: 512, detail: 'high' })).toBe(85 + 170);
    // 1024x1024 → 2x2 tiles → 85 + 170*4 = 765
    // (1024 ≤ 2048, so step 1 no-op; min side 1024 > 768 → scales to 768x768 → 2x2 tiles)
    expect(visionTokens({ width: 1024, height: 1024, detail: 'high' })).toBe(85 + 170 * 4);
  });

  it('defaults to high detail when detail is omitted', () => {
    expect(visionTokens({ width: 512, height: 512 })).toBe(
      visionTokens({ width: 512, height: 512, detail: 'high' }),
    );
  });

  it("treats 'auto' as high detail", () => {
    expect(visionTokens({ width: 512, height: 512, detail: 'auto' })).toBe(85 + 170);
  });

  it('caps the longest side at 2048 then the shortest at 768 (landscape)', () => {
    // 4096x2048 → step1 caps longest at 2048 → 2048x1024 → step2 shortest 1024>768 → scales by 768/1024
    // → 1536x768 → tiles: ceil(1536/512)=3, ceil(768/512)=2 → 6 tiles → 85 + 170*6 = 1105
    expect(visionTokens({ width: 4096, height: 2048, detail: 'high' })).toBe(85 + 170 * 6);
  });

  it('handles portrait by symmetry', () => {
    expect(visionTokens({ width: 2048, height: 4096, detail: 'high' })).toBe(
      visionTokens({ width: 4096, height: 2048, detail: 'high' }),
    );
  });

  it('a small square still costs base + one tile', () => {
    // 100x100: no resize, ceil(100/512)=1 each → 1 tile.
    expect(visionTokens({ width: 100, height: 100, detail: 'high' })).toBe(85 + 170);
  });

  it('768x768 stays 768x768 (boundary, no shrink) → 2x2 tiles', () => {
    expect(visionTokens({ width: 768, height: 768, detail: 'high' })).toBe(85 + 170 * 4);
  });

  it('throws on non-positive dimensions', () => {
    expect(() => visionTokens({ width: 0, height: 100 })).toThrow();
    expect(() => visionTokens({ width: 100, height: -10, detail: 'high' })).toThrow();
  });
});
