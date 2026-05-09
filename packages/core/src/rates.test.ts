import { describe, expect, it } from 'vitest';
import { KNOWN_MODELS, MODELS, RATES, getModel, getRate } from './rates.js';

describe('rates', () => {
  it('every known model has a matching rate entry with positive prices', () => {
    expect(KNOWN_MODELS.length).toBeGreaterThanOrEqual(15);
    for (const modelId of KNOWN_MODELS) {
      expect(RATES[modelId]).toBeDefined();
      expect(RATES[modelId]?.inputPer1k).toBeGreaterThan(0);
      expect(RATES[modelId]?.outputPer1k).toBeGreaterThan(0);
    }
  });

  it('cached input rate is cheaper than fresh input rate when present', () => {
    for (const modelId of KNOWN_MODELS) {
      const rate = RATES[modelId];
      if (rate?.cachedInputPer1k !== undefined) {
        expect(rate.cachedInputPer1k).toBeLessThan(rate.inputPer1k);
      }
    }
  });

  it('every model carries a provider', () => {
    for (const modelId of KNOWN_MODELS) {
      expect(MODELS[modelId]?.provider).toMatch(/^(anthropic|google|openai)$/);
    }
  });

  it('canary pricing for stable upstream models matches expected dollars', () => {
    expect(getRate('gpt-4o').inputPer1k).toBe(0.0025);
    expect(getRate('gpt-4o').outputPer1k).toBe(0.01);
    expect(getRate('gpt-4o-mini').inputPer1k).toBe(0.00015);
    expect(getRate('gpt-4o-mini').outputPer1k).toBe(0.0006);
  });

  it('local-overridden Claude models keep tokenometer-controlled prices', () => {
    expect(getRate('claude-opus-4-7')).toEqual({
      cachedInputPer1k: 0.0015,
      inputPer1k: 0.015,
      outputPer1k: 0.075,
    });
    expect(getModel('claude-opus-4-7').pricingSource).toBe('local');
  });

  it('tokenlens-sourced models include context-window metadata', () => {
    const gpt4o = getModel('gpt-4o');
    expect(gpt4o.contextWindow).toBeGreaterThan(0);
    expect(gpt4o.maxOutputTokens).toBeGreaterThan(0);
    expect(gpt4o.pricingSource).toBe('tokenlens');
  });

  it('getRate throws on unknown model', () => {
    expect(() => getRate('not-a-model')).toThrow(/Unknown model/);
  });

  it('getModel throws on unknown model', () => {
    expect(() => getModel('not-a-model')).toThrow(/Unknown model/);
  });

  it('getModel returns provider for a known id', () => {
    expect(getModel('claude-opus-4-7').provider).toBe('anthropic');
    expect(getModel('gpt-4o').provider).toBe('openai');
    expect(getModel('gemini-2.5-pro').provider).toBe('google');
  });
});
