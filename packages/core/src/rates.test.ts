import { describe, expect, it } from 'vitest';
import { UserFacingError } from './errors.js';
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
      expect(MODELS[modelId]?.provider).toMatch(/^(anthropic|cohere|google|mistral|openai)$/);
    }
  });

  it('catalog includes Mistral models from tokenlens', () => {
    // open-mistral-7b is a stable id Mistral has shipped since 2023.
    expect(KNOWN_MODELS).toContain('open-mistral-7b');
    expect(MODELS['open-mistral-7b']?.provider).toBe('mistral');
    // mistral-nemo is the canary Tekken-family model.
    expect(KNOWN_MODELS).toContain('mistral-nemo');
    expect(MODELS['mistral-nemo']?.provider).toBe('mistral');
  });

  it('catalog includes Cohere models via local overrides', () => {
    // tokenlens does not ship a Cohere catalog at v1.3.0 — these come from
    // LOCAL_OVERRIDES. Update once tokenlens adds Cohere upstream.
    expect(KNOWN_MODELS).toContain('command-r-plus');
    expect(MODELS['command-r-plus']?.provider).toBe('cohere');
    expect(MODELS['command-r-plus']?.pricingSource).toBe('local');
    expect(KNOWN_MODELS).toContain('command-r');
    expect(MODELS['command-r']?.provider).toBe('cohere');
  });

  it('canary pricing for stable upstream models matches expected dollars', () => {
    expect(getRate('gpt-4o').inputPer1k).toBe(0.0025);
    expect(getRate('gpt-4o').outputPer1k).toBe(0.01);
    expect(getRate('gpt-4o-mini').inputPer1k).toBe(0.00015);
    expect(getRate('gpt-4o-mini').outputPer1k).toBe(0.0006);
  });

  it('local-overridden Claude models keep tokenometer-controlled prices', () => {
    expect(getRate('claude-opus-4-7')).toEqual({
      cachedInputPer1k: 0.0005,
      inputPer1k: 0.005,
      outputPer1k: 0.025,
    });
    expect(getModel('claude-opus-4-7').pricingSource).toBe('local');
  });

  it('local-overridden Cohere Command R matches Cohere legacy API pricing', () => {
    expect(getRate('command-r')).toEqual({
      inputPer1k: 0.0005,
      outputPer1k: 0.0015,
    });
    expect(getModel('command-r').pricingSource).toBe('local');
  });

  it('tokenlens-sourced models include context-window metadata', () => {
    const gpt4o = getModel('gpt-4o');
    expect(gpt4o.contextWindow).toBeGreaterThan(0);
    expect(gpt4o.maxOutputTokens).toBeGreaterThan(0);
    expect(gpt4o.pricingSource).toBe('tokenlens');
  });

  it('getRate throws UserFacingError on unknown model', () => {
    expect(() => getRate('not-a-model')).toThrow(UserFacingError);
    expect(() => getRate('not-a-model')).toThrow(/Unknown model/);
  });

  it('getModel throws UserFacingError on unknown model', () => {
    expect(() => getModel('not-a-model')).toThrow(UserFacingError);
    expect(() => getModel('not-a-model')).toThrow(/Unknown model/);
  });

  it('getModel returns provider for a known id', () => {
    expect(getModel('claude-opus-4-7').provider).toBe('anthropic');
    expect(getModel('gpt-4o').provider).toBe('openai');
    expect(getModel('gemini-2.5-pro').provider).toBe('google');
  });
});
