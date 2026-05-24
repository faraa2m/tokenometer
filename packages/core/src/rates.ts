import type { ProvidersCatalog } from '@tokenlens/core';
import anthropicProvider from '@tokenlens/models/anthropic';
import googleProvider from '@tokenlens/models/google';
import mistralProvider from '@tokenlens/models/mistral';
import openaiProvider from '@tokenlens/models/openai';
import { getContext, getTokenCosts } from 'tokenlens';
import { UserFacingError } from './errors.js';
import type { ModelDescriptor, Provider, RateEntry } from './types.js';

export const RATES_VERSION = '2026-05-23';

// `@tokenlens/models` does not yet ship a Cohere catalog (verified against
// node_modules/@tokenlens/models/dist/providers/ at v1.3.0). When upstream
// adds it, drop the Cohere LOCAL_OVERRIDES entry and add the import here.
const CATALOG: ProvidersCatalog = {
  anthropic: anthropicProvider,
  google: googleProvider,
  mistral: mistralProvider,
  openai: openaiProvider,
};

const PROVIDERS: readonly Provider[] = ['anthropic', 'google', 'mistral', 'openai'];

interface RegistryEntry {
  rate: RateEntry;
  descriptor: ModelDescriptor;
}

// Bleeding-edge models tokenlens hasn't picked up from upstream yet.
// Remove an entry once `scripts/check-overrides.mjs` reports it landed.
//
// Cohere entries are also here because `@tokenlens/models` does not yet
// ship a Cohere catalog at all (v1.3.0). Pricing pulled from the published
// Cohere pricing page (cohere.com/pricing) at RATES_VERSION date.
const LOCAL_OVERRIDES: Record<string, RegistryEntry> = {
  'claude-haiku-4-5': {
    rate: { cachedInputPer1k: 0.0001, inputPer1k: 0.001, outputPer1k: 0.005 },
    descriptor: {
      contextWindow: 200_000,
      id: 'claude-haiku-4-5',
      maxOutputTokens: 64_000,
      pricingSource: 'local',
      provider: 'anthropic',
    },
  },
  'claude-opus-4-7': {
    rate: { cachedInputPer1k: 0.0005, inputPer1k: 0.005, outputPer1k: 0.025 },
    descriptor: {
      contextWindow: 200_000,
      id: 'claude-opus-4-7',
      maxOutputTokens: 32_000,
      pricingSource: 'local',
      provider: 'anthropic',
    },
  },
  'claude-sonnet-4-6': {
    rate: { cachedInputPer1k: 0.0003, inputPer1k: 0.003, outputPer1k: 0.015 },
    descriptor: {
      contextWindow: 200_000,
      id: 'claude-sonnet-4-6',
      maxOutputTokens: 64_000,
      pricingSource: 'local',
      provider: 'anthropic',
    },
  },
  'command-r': {
    rate: { inputPer1k: 0.0005, outputPer1k: 0.0015 },
    descriptor: {
      contextWindow: 128_000,
      id: 'command-r',
      maxOutputTokens: 4096,
      pricingSource: 'local',
      provider: 'cohere',
    },
  },
  'command-r-plus': {
    rate: { inputPer1k: 0.0025, outputPer1k: 0.01 },
    descriptor: {
      contextWindow: 128_000,
      id: 'command-r-plus',
      maxOutputTokens: 4096,
      pricingSource: 'local',
      provider: 'cohere',
    },
  },
};

// Raw models.dev catalog data has no explicit status field; infer "preview" from
// id naming conventions. Anything with "-preview" (or starting "preview-") is
// dropped so the curated registry only includes generally-available models.
const PREVIEW_ID_PATTERN = /(^|-)preview(-|$)/i;

const buildFromTokenlens = (): Record<string, RegistryEntry> => {
  const out: Record<string, RegistryEntry> = {};
  for (const provider of PROVIDERS) {
    const providerInfo = CATALOG[provider];
    if (!providerInfo) continue;

    for (const bareId of Object.keys(providerInfo.models)) {
      if (PREVIEW_ID_PATTERN.test(bareId)) continue;

      const namespacedId = `${provider}:${bareId}`;

      const cost = getTokenCosts({
        modelId: namespacedId,
        providers: CATALOG,
        usage: { input: 1000, output: 1000 },
      });
      if (!cost.inputUSD || !cost.outputUSD) continue;

      const ctx = getContext({ modelId: namespacedId, providers: CATALOG });
      const contextWindow = ctx.combinedMax ?? ctx.maxTotal ?? ctx.inputMax;
      const maxOutputTokens = ctx.outputMax ?? ctx.maxOutput;

      const rate: RateEntry = {
        inputPer1k: cost.inputUSD,
        outputPer1k: cost.outputUSD,
        ...(cost.cacheReadUSD ? { cachedInputPer1k: cost.cacheReadUSD } : {}),
      };

      const descriptor: ModelDescriptor = {
        id: bareId,
        pricingSource: 'tokenlens',
        provider,
        ...(contextWindow ? { contextWindow } : {}),
        ...(maxOutputTokens ? { maxOutputTokens } : {}),
      };

      const existing = out[bareId];
      if (existing && existing.descriptor.provider !== provider) {
        // Same bare id from a different provider — keep the first, warn loudly.
        // eslint-disable-next-line no-console
        console.warn(
          `[tokenometer] bare id collision for "${bareId}": ${existing.descriptor.provider} vs ${provider}; keeping ${existing.descriptor.provider}.`,
        );
        continue;
      }

      out[bareId] = { descriptor, rate };
    }
  }
  return out;
};

const REGISTRY: Record<string, RegistryEntry> = (() => {
  const out = buildFromTokenlens();
  for (const [id, entry] of Object.entries(LOCAL_OVERRIDES)) {
    out[id] = entry;
  }
  return out;
})();

export const RATES: Record<string, RateEntry> = Object.fromEntries(
  Object.entries(REGISTRY).map(([id, e]) => [id, e.rate]),
);

export const MODELS: Record<string, ModelDescriptor> = Object.fromEntries(
  Object.entries(REGISTRY).map(([id, e]) => [id, e.descriptor]),
);

export const KNOWN_MODELS: readonly string[] = Object.keys(REGISTRY).sort();

export const getRate = (modelId: string): RateEntry => {
  const entry = REGISTRY[modelId];
  if (!entry) {
    throw new UserFacingError(
      `Unknown model "${modelId}". Known models: ${KNOWN_MODELS.join(', ')}.`,
    );
  }
  return entry.rate;
};

export const getModel = (modelId: string): ModelDescriptor => {
  const entry = REGISTRY[modelId];
  if (!entry) {
    throw new UserFacingError(
      `Unknown model "${modelId}". Known models: ${KNOWN_MODELS.join(', ')}.`,
    );
  }
  return entry.descriptor;
};
