import { describe, expect, it } from 'vitest';
import { priceUsage } from './usage-cost.js';

describe('priceUsage', () => {
  it('prices actual usage with a known model id from the registry', () => {
    const result = priceUsage({
      modelId: 'claude-sonnet-4-6',
      usage: { inputTokens: 1000, outputTokens: 2000 },
    });

    expect(result.model).toBe('claude-sonnet-4-6');
    expect(result.inputTokens).toBe(1000);
    expect(result.outputTokens).toBe(2000);
    expect(result.inputUsd).toBeCloseTo(0.003, 12);
    expect(result.outputUsd).toBeCloseTo(0.03, 12);
    expect(result.totalUsd).toBeCloseTo(0.033, 12);
  });

  it('prices actual usage with explicit per-million token rates', () => {
    const result = priceUsage({
      pricing: { inputUsdPerMtok: 2, outputUsdPerMtok: 10 },
      usage: { inputTokens: 500_000, outputTokens: 10_000 },
    });

    expect(result.inputUsd).toBeCloseTo(1, 12);
    expect(result.outputUsd).toBeCloseTo(0.1, 12);
    expect(result.totalUsd).toBeCloseTo(1.1, 12);
  });

  it('prices cached input separately when cached usage and a cached rate are available', () => {
    const result = priceUsage({
      modelId: 'claude-sonnet-4-6',
      usage: { cachedInputTokens: 500, inputTokens: 1000, outputTokens: 0 },
    });

    expect(result.inputTokens).toBe(1000);
    expect(result.cachedInputTokens).toBe(500);
    expect(result.billableInputTokens).toBe(500);
    expect(result.inputUsd).toBeCloseTo(0.0015, 12);
    expect(result.cachedInputUsd).toBeCloseTo(0.00015, 12);
    expect(result.totalUsd).toBeCloseTo(0.00165, 12);
  });

  it('allows zero-token usage', () => {
    const result = priceUsage({
      pricing: { inputUsdPerMtok: 1, outputUsdPerMtok: 1 },
      usage: { inputTokens: 0, outputTokens: 0 },
    });

    expect(result.totalUsd).toBe(0);
  });

  it('rejects negative and non-finite usage values', () => {
    expect(() =>
      priceUsage({
        pricing: { inputUsdPerMtok: 1, outputUsdPerMtok: 1 },
        usage: { inputTokens: -1, outputTokens: 0 },
      }),
    ).toThrow(/inputTokens/);

    expect(() =>
      priceUsage({
        pricing: { inputUsdPerMtok: 1, outputUsdPerMtok: 1 },
        usage: { inputTokens: 1, outputTokens: Number.NaN },
      }),
    ).toThrow(/outputTokens/);
  });
});
