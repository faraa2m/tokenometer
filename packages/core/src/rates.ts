import type { ModelDescriptor, RateEntry } from './types.js';

export const RATES_VERSION = '2026-05-07';

export const RATES: Record<string, RateEntry> = {
  'claude-haiku-4-5': { cachedInputPer1k: 0.0001, inputPer1k: 0.001, outputPer1k: 0.005 },
  'claude-opus-4-7': { cachedInputPer1k: 0.0015, inputPer1k: 0.015, outputPer1k: 0.075 },
  'claude-sonnet-4-6': { cachedInputPer1k: 0.0003, inputPer1k: 0.003, outputPer1k: 0.015 },
  'gemini-2.5-flash': { inputPer1k: 0.000075, outputPer1k: 0.0003 },
  'gemini-2.5-pro': { inputPer1k: 0.00125, outputPer1k: 0.005 },
  'gpt-4o': { inputPer1k: 0.0025, outputPer1k: 0.01 },
  'gpt-4o-mini': { inputPer1k: 0.00015, outputPer1k: 0.0006 },
};

export const MODELS: Record<string, ModelDescriptor> = {
  'claude-haiku-4-5': { id: 'claude-haiku-4-5', provider: 'anthropic' },
  'claude-opus-4-7': { id: 'claude-opus-4-7', provider: 'anthropic' },
  'claude-sonnet-4-6': { id: 'claude-sonnet-4-6', provider: 'anthropic' },
  'gemini-2.5-flash': { id: 'gemini-2.5-flash', provider: 'google' },
  'gemini-2.5-pro': { id: 'gemini-2.5-pro', provider: 'google' },
  'gpt-4o': { id: 'gpt-4o', provider: 'openai' },
  'gpt-4o-mini': { id: 'gpt-4o-mini', provider: 'openai' },
};

export const KNOWN_MODELS = Object.keys(MODELS);

export const getRate = (modelId: string): RateEntry => {
  const rate = RATES[modelId];
  if (!rate) {
    throw new Error(`Unknown model "${modelId}". Known models: ${KNOWN_MODELS.join(', ')}.`);
  }
  return rate;
};

export const getModel = (modelId: string): ModelDescriptor => {
  const model = MODELS[modelId];
  if (!model) {
    throw new Error(`Unknown model "${modelId}". Known models: ${KNOWN_MODELS.join(', ')}.`);
  }
  return model;
};
