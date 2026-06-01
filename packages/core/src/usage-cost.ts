import { getRate } from './rates.js';
import type { RateEntry } from './types.js';

export interface UsageTokens {
  /** Provider-reported input tokens, including cached input tokens when present. */
  inputTokens: number;
  /** Provider-reported output/completion tokens. */
  outputTokens: number;
  /** Input tokens billed at the cached-input rate. Defaults to 0. */
  cachedInputTokens?: number;
}

export interface UsagePricing {
  inputUsdPerMtok: number;
  outputUsdPerMtok: number;
  cachedInputUsdPerMtok?: number;
}

export interface PriceUsageOptions {
  /** Known tokenometer model id. Used to resolve registry pricing. */
  modelId?: string;
  /** Explicit per-million-token pricing. Required when modelId is omitted. */
  pricing?: UsagePricing;
  usage: UsageTokens;
}

export interface PriceUsageResult {
  model?: string;
  inputTokens: number;
  cachedInputTokens: number;
  billableInputTokens: number;
  outputTokens: number;
  inputUsd: number;
  cachedInputUsd: number;
  outputUsd: number;
  totalUsd: number;
}

const assertNonNegativeFinite = (field: string, value: number): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`priceUsage(): ${field} must be a non-negative finite number`);
  }
};

const pricingFromRate = (rate: RateEntry): UsagePricing => ({
  inputUsdPerMtok: rate.inputPer1k * 1000,
  outputUsdPerMtok: rate.outputPer1k * 1000,
  ...(rate.cachedInputPer1k !== undefined
    ? { cachedInputUsdPerMtok: rate.cachedInputPer1k * 1000 }
    : {}),
});

const resolvePricing = (options: PriceUsageOptions): UsagePricing => {
  if (options.pricing !== undefined) return options.pricing;
  if (options.modelId !== undefined) return pricingFromRate(getRate(options.modelId));
  throw new Error('priceUsage(): pass either modelId or pricing');
};

export const priceUsage = (options: PriceUsageOptions): PriceUsageResult => {
  const pricing = resolvePricing(options);
  const { inputTokens, outputTokens, cachedInputTokens = 0 } = options.usage;

  assertNonNegativeFinite('inputTokens', inputTokens);
  assertNonNegativeFinite('outputTokens', outputTokens);
  assertNonNegativeFinite('cachedInputTokens', cachedInputTokens);
  assertNonNegativeFinite('pricing.inputUsdPerMtok', pricing.inputUsdPerMtok);
  assertNonNegativeFinite('pricing.outputUsdPerMtok', pricing.outputUsdPerMtok);
  if (pricing.cachedInputUsdPerMtok !== undefined) {
    assertNonNegativeFinite('pricing.cachedInputUsdPerMtok', pricing.cachedInputUsdPerMtok);
  }

  const normalizedCachedInputTokens = Math.min(cachedInputTokens, inputTokens);
  const billableInputTokens = inputTokens - normalizedCachedInputTokens;
  const inputUsd = (billableInputTokens / 1_000_000) * pricing.inputUsdPerMtok;
  const cachedInputUsd =
    (normalizedCachedInputTokens / 1_000_000) *
    (pricing.cachedInputUsdPerMtok ?? pricing.inputUsdPerMtok);
  const outputUsd = (outputTokens / 1_000_000) * pricing.outputUsdPerMtok;

  return {
    ...(options.modelId !== undefined ? { model: options.modelId } : {}),
    billableInputTokens,
    cachedInputTokens: normalizedCachedInputTokens,
    cachedInputUsd,
    inputTokens,
    inputUsd,
    outputTokens,
    outputUsd,
    totalUsd: inputUsd + cachedInputUsd + outputUsd,
  };
};
