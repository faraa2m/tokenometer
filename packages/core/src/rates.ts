import type { ProvidersCatalog } from '@tokenlens/core';
import anthropicProvider from '@tokenlens/models/anthropic';
import googleProvider from '@tokenlens/models/google';
import mistralProvider from '@tokenlens/models/mistral';
import openaiProvider from '@tokenlens/models/openai';
import { getContext, getTokenCosts } from 'tokenlens';
import { UserFacingError } from './errors.js';
import type { ModelDescriptor, Provider, RateEntry } from './types.js';

export const RATES_VERSION = '2026-07-04';

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

type CatalogEntry = ModelDescriptor & {
  supportsTextCostEstimate: boolean;
  supportsTokenCounting: boolean;
};

const textModalities = ['text'] as const;
const textVisionModalities = ['text', 'image'] as const;

const SOURCE_URLS = {
  anthropicModels: 'https://platform.claude.com/docs/en/about-claude/models/overview',
  anthropicPricing: 'https://platform.claude.com/docs/en/about-claude/pricing',
  cohereModels: 'https://docs.cohere.com/docs/models',
  coherePricing: 'https://docs.cohere.com/docs/how-does-cohere-pricing-work',
  googleModels: 'https://ai.google.dev/gemini-api/docs/models',
  mistralModels: 'https://docs.mistral.ai/models/overview',
  openaiModels: 'https://developers.openai.com/api/docs/models',
  openaiPricing: 'https://developers.openai.com/api/docs/pricing',
} as const;

// Bleeding-edge models tokenlens hasn't picked up from upstream yet.
// Remove an entry once `scripts/check-overrides.mjs` reports it landed.
//
// Cohere entries are also here because `@tokenlens/models` does not yet
// ship a Cohere catalog at all (v1.3.0). Pricing pulled from the published
// Cohere pricing page (cohere.com/pricing) at RATES_VERSION date.
const LOCAL_OVERRIDES: Record<string, RegistryEntry> = {
  'gpt-5.5': {
    rate: { cachedInputPer1k: 0.0005, inputPer1k: 0.005, outputPer1k: 0.03 },
    descriptor: {
      contextWindow: 400_000,
      id: 'gpt-5.5',
      maxOutputTokens: 128_000,
      modalities: textVisionModalities,
      pricingSource: 'local',
      provider: 'openai',
      sourceUrl: SOURCE_URLS.openaiPricing,
      status: 'stable',
    },
  },
  'gpt-5.4': {
    rate: { cachedInputPer1k: 0.00025, inputPer1k: 0.0025, outputPer1k: 0.015 },
    descriptor: {
      contextWindow: 400_000,
      id: 'gpt-5.4',
      maxOutputTokens: 128_000,
      modalities: textVisionModalities,
      pricingSource: 'local',
      provider: 'openai',
      sourceUrl: SOURCE_URLS.openaiPricing,
      status: 'stable',
    },
  },
  'gpt-5.4-mini': {
    rate: { cachedInputPer1k: 0.000075, inputPer1k: 0.00075, outputPer1k: 0.0045 },
    descriptor: {
      contextWindow: 200_000,
      id: 'gpt-5.4-mini',
      maxOutputTokens: 64_000,
      modalities: textVisionModalities,
      pricingSource: 'local',
      provider: 'openai',
      sourceUrl: SOURCE_URLS.openaiPricing,
      status: 'stable',
    },
  },
  'gpt-5.4-nano': {
    rate: { cachedInputPer1k: 0.00002, inputPer1k: 0.0002, outputPer1k: 0.00125 },
    descriptor: {
      contextWindow: 200_000,
      id: 'gpt-5.4-nano',
      maxOutputTokens: 64_000,
      modalities: textVisionModalities,
      pricingSource: 'local',
      provider: 'openai',
      sourceUrl: SOURCE_URLS.openaiPricing,
      status: 'stable',
    },
  },
  'claude-fable-5': {
    rate: { cachedInputPer1k: 0.001, inputPer1k: 0.01, outputPer1k: 0.05 },
    descriptor: {
      contextWindow: 200_000,
      id: 'claude-fable-5',
      maxOutputTokens: 64_000,
      modalities: textVisionModalities,
      pricingSource: 'local',
      provider: 'anthropic',
      sourceUrl: SOURCE_URLS.anthropicPricing,
      status: 'stable',
    },
  },
  'claude-opus-4-8': {
    rate: { cachedInputPer1k: 0.0005, inputPer1k: 0.005, outputPer1k: 0.025 },
    descriptor: {
      contextWindow: 200_000,
      id: 'claude-opus-4-8',
      maxOutputTokens: 32_000,
      modalities: textVisionModalities,
      pricingSource: 'local',
      provider: 'anthropic',
      sourceUrl: SOURCE_URLS.anthropicPricing,
      status: 'stable',
    },
  },
  'claude-sonnet-5': {
    rate: { cachedInputPer1k: 0.0002, inputPer1k: 0.002, outputPer1k: 0.01 },
    descriptor: {
      contextWindow: 200_000,
      id: 'claude-sonnet-5',
      maxOutputTokens: 64_000,
      modalities: textVisionModalities,
      pricingSource: 'local',
      provider: 'anthropic',
      sourceUrl: SOURCE_URLS.anthropicPricing,
      status: 'stable',
    },
  },
  'claude-haiku-4-5': {
    rate: { cachedInputPer1k: 0.0001, inputPer1k: 0.001, outputPer1k: 0.005 },
    descriptor: {
      contextWindow: 200_000,
      id: 'claude-haiku-4-5',
      maxOutputTokens: 64_000,
      modalities: textVisionModalities,
      pricingSource: 'local',
      provider: 'anthropic',
      sourceUrl: SOURCE_URLS.anthropicPricing,
      status: 'stable',
    },
  },
  'claude-opus-4-7': {
    rate: { cachedInputPer1k: 0.0005, inputPer1k: 0.005, outputPer1k: 0.025 },
    descriptor: {
      contextWindow: 200_000,
      id: 'claude-opus-4-7',
      maxOutputTokens: 32_000,
      modalities: textVisionModalities,
      pricingSource: 'local',
      provider: 'anthropic',
      sourceUrl: SOURCE_URLS.anthropicPricing,
      status: 'stable',
    },
  },
  'claude-sonnet-4-6': {
    rate: { cachedInputPer1k: 0.0003, inputPer1k: 0.003, outputPer1k: 0.015 },
    descriptor: {
      contextWindow: 200_000,
      id: 'claude-sonnet-4-6',
      maxOutputTokens: 64_000,
      modalities: textVisionModalities,
      pricingSource: 'local',
      provider: 'anthropic',
      sourceUrl: SOURCE_URLS.anthropicPricing,
      status: 'stable',
    },
  },
  'command-a-03-2025': {
    rate: { inputPer1k: 0.0025, outputPer1k: 0.01 },
    descriptor: {
      contextWindow: 256_000,
      id: 'command-a-03-2025',
      maxOutputTokens: 8_000,
      modalities: textVisionModalities,
      pricingSource: 'local',
      provider: 'cohere',
      releaseDate: '2025-03',
      sourceUrl: 'https://docs.cohere.com/docs/command-a',
      status: 'stable',
    },
  },
  'command-r-08-2024': {
    rate: { inputPer1k: 0.0005, outputPer1k: 0.0015 },
    descriptor: {
      contextWindow: 128_000,
      id: 'command-r-08-2024',
      maxOutputTokens: 4096,
      modalities: textModalities,
      pricingSource: 'local',
      provider: 'cohere',
      sourceUrl: SOURCE_URLS.coherePricing,
      status: 'stable',
    },
  },
  'command-r-plus-08-2024': {
    rate: { inputPer1k: 0.0025, outputPer1k: 0.01 },
    descriptor: {
      contextWindow: 128_000,
      id: 'command-r-plus-08-2024',
      maxOutputTokens: 4096,
      modalities: textModalities,
      pricingSource: 'local',
      provider: 'cohere',
      sourceUrl: SOURCE_URLS.coherePricing,
      status: 'stable',
    },
  },
};

const CATALOG_ONLY: Record<string, CatalogEntry> = {
  'gpt-5.6-preview': {
    id: 'gpt-5.6-preview',
    modalities: textVisionModalities,
    provider: 'openai',
    sourceUrl: SOURCE_URLS.openaiModels,
    status: 'preview',
    supportsTextCostEstimate: false,
    supportsTokenCounting: true,
    unsupportedReason: 'Preview model without stable public text cost behavior.',
  },
  'gpt-5.4-cyber': {
    id: 'gpt-5.4-cyber',
    modalities: textModalities,
    provider: 'openai',
    sourceUrl: SOURCE_URLS.openaiModels,
    status: 'specialized',
    supportsTextCostEstimate: false,
    supportsTokenCounting: false,
    unsupportedReason:
      'Specialized cyber model; public text token pricing/counting is not exposed.',
  },
  'claude-mythos-5': {
    contextWindow: 200_000,
    id: 'claude-mythos-5',
    maxOutputTokens: 64_000,
    modalities: textVisionModalities,
    provider: 'anthropic',
    sourceUrl: SOURCE_URLS.anthropicPricing,
    status: 'limited',
    supportsTextCostEstimate: false,
    supportsTokenCounting: true,
    unsupportedReason: 'Limited-availability Anthropic model; keep out of public cost estimates.',
  },
  'command-a-plus-05-2026': {
    contextWindow: 128_000,
    id: 'command-a-plus-05-2026',
    maxOutputTokens: 64_000,
    modalities: textVisionModalities,
    provider: 'cohere',
    releaseDate: '2026-05-20',
    sourceUrl: 'https://docs.cohere.com/docs/command-a-plus',
    status: 'limited',
    supportsTextCostEstimate: false,
    supportsTokenCounting: true,
    unsupportedReason:
      'Cohere documents Command A+ as free until rate limits and Model Vault for production, not public per-token pricing.',
  },
  'command-a-reasoning-08-2025': {
    id: 'command-a-reasoning-08-2025',
    modalities: textModalities,
    provider: 'cohere',
    releaseDate: '2025-08',
    sourceUrl: 'https://docs.cohere.com/docs/command-a-reasoning',
    status: 'specialized',
    supportsTextCostEstimate: false,
    supportsTokenCounting: true,
    unsupportedReason:
      'Specialized reasoning model without public token pricing in the pricing guide.',
  },
  'command-a-translate-08-2025': {
    id: 'command-a-translate-08-2025',
    modalities: textModalities,
    provider: 'cohere',
    releaseDate: '2025-08',
    sourceUrl: 'https://docs.cohere.com/docs/command-a-translate',
    status: 'specialized',
    supportsTextCostEstimate: false,
    supportsTokenCounting: true,
    unsupportedReason:
      'Specialized translation model without public token pricing in the pricing guide.',
  },
  'command-a-vision-07-2025': {
    id: 'command-a-vision-07-2025',
    modalities: textVisionModalities,
    provider: 'cohere',
    releaseDate: '2025-07',
    sourceUrl: 'https://docs.cohere.com/docs/command-a-vision',
    status: 'specialized',
    supportsTextCostEstimate: false,
    supportsTokenCounting: true,
    unsupportedReason:
      'Specialized vision model without public token pricing in the pricing guide.',
  },
  'command-r7b-12-2024': {
    id: 'command-r7b-12-2024',
    modalities: textModalities,
    provider: 'cohere',
    releaseDate: '2024-12',
    sourceUrl: 'https://docs.cohere.com/docs/command-r7b',
    status: 'limited',
    supportsTextCostEstimate: false,
    supportsTokenCounting: true,
    unsupportedReason:
      'Visible Cohere model, but no public per-token price is listed in the pricing guide.',
  },
  'gemini-3.1-pro-preview': {
    id: 'gemini-3.1-pro-preview',
    modalities: textVisionModalities,
    provider: 'google',
    sourceUrl: SOURCE_URLS.googleModels,
    status: 'preview',
    supportsTextCostEstimate: false,
    supportsTokenCounting: true,
    unsupportedReason: 'Gemini preview model; keep separate from stable cost-estimation registry.',
  },
  'gemini-3.5-live-translate-preview': {
    id: 'gemini-3.5-live-translate-preview',
    modalities: ['audio', 'text'],
    provider: 'google',
    sourceUrl: SOURCE_URLS.googleModels,
    status: 'preview',
    supportsTextCostEstimate: false,
    supportsTokenCounting: false,
    unsupportedReason:
      'Live translation model is audio-first and not supported by text cost estimation.',
  },
  'mistral-medium-3.5': {
    id: 'mistral-medium-3.5',
    modalities: textVisionModalities,
    provider: 'mistral',
    releaseDate: '2026-04',
    sourceUrl: SOURCE_URLS.mistralModels,
    status: 'stable',
    supportsTextCostEstimate: false,
    supportsTokenCounting: false,
    unsupportedReason:
      'Visible Mistral model not yet present in tokenlens v1.3.0 with public token pricing.',
  },
  'mistral-small-4': {
    id: 'mistral-small-4',
    modalities: textVisionModalities,
    provider: 'mistral',
    releaseDate: '2026-03',
    sourceUrl: SOURCE_URLS.mistralModels,
    status: 'stable',
    supportsTextCostEstimate: false,
    supportsTokenCounting: false,
    unsupportedReason:
      'Visible Mistral model not yet present in tokenlens v1.3.0 with public token pricing.',
  },
  'voxtral-mini-transcribe-realtime': {
    id: 'voxtral-mini-transcribe-realtime',
    modalities: ['audio'],
    provider: 'mistral',
    releaseDate: '2026-02',
    sourceUrl: SOURCE_URLS.mistralModels,
    status: 'specialized',
    supportsTextCostEstimate: false,
    supportsTokenCounting: false,
    unsupportedReason: 'Audio transcription model; text token cost estimation is unsupported.',
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
        modalities: textModalities,
        pricingSource: 'tokenlens',
        provider,
        status: 'stable',
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

const toCatalogEntry = (descriptor: ModelDescriptor): CatalogEntry => ({
  ...descriptor,
  supportsTextCostEstimate: true,
  supportsTokenCounting: true,
});

export const MODEL_CATALOG: Record<string, CatalogEntry> = Object.fromEntries(
  [
    ...Object.entries(MODELS).map(([id, descriptor]) => [id, toCatalogEntry(descriptor)] as const),
    ...Object.entries(CATALOG_ONLY),
  ].sort(([a], [b]) => a.localeCompare(b)),
);

export const KNOWN_CATALOG_MODELS: readonly string[] = Object.keys(MODEL_CATALOG).sort();

export const getRate = (modelId: string): RateEntry => {
  const entry = REGISTRY[modelId];
  if (!entry) {
    const catalogEntry = MODEL_CATALOG[modelId];
    if (catalogEntry) {
      throw new UserFacingError(
        `Catalog-only model "${modelId}" does not support Tokenometer text cost estimates: ${catalogEntry.unsupportedReason ?? 'pricing or token-counting is unsupported'}.`,
      );
    }
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

export const getCatalogModel = (modelId: string): ModelDescriptor => {
  const entry = MODEL_CATALOG[modelId];
  if (!entry) {
    throw new UserFacingError(
      `Unknown model "${modelId}". Known catalog models: ${KNOWN_CATALOG_MODELS.join(', ')}.`,
    );
  }
  return entry;
};
