import { describe, expect, it } from 'vitest';
import { KNOWN_MODELS, RATES, getModel, getRate } from './rates.js';

describe('rates', () => {
  it('every known model has a matching rate entry', () => {
    for (const modelId of KNOWN_MODELS) {
      expect(RATES[modelId]).toBeDefined();
      expect(RATES[modelId]?.inputPer1k).toBeGreaterThan(0);
      expect(RATES[modelId]?.outputPer1k).toBeGreaterThan(0);
    }
  });

  it('cached input rate is always cheaper than fresh input rate when present', () => {
    for (const modelId of KNOWN_MODELS) {
      const rate = RATES[modelId];
      if (rate?.cachedInputPer1k !== undefined) {
        expect(rate.cachedInputPer1k).toBeLessThan(rate.inputPer1k);
      }
    }
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
