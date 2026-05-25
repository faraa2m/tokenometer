import { MODELS, RATES } from '@tokenometer/core/browser';
import type { ModelDescriptor, Provider, RateEntry } from '@tokenometer/core/browser';
import { useMemo } from 'react';

export interface PricingRow {
  model: ModelDescriptor;
  rate: RateEntry;
}

export interface UsePricingOptions {
  models?: readonly string[];
  providers?: readonly Provider[];
}

/**
 * Project the rate registry into a flat array of { model, rate } rows.
 * Optionally narrow by a model-id allowlist and / or provider filter.
 * Output is sorted by id for stable rendering.
 */
export const usePricing = (options: UsePricingOptions = {}): PricingRow[] => {
  const { models, providers } = options;
  const modelsKey = models ? [...models].sort().join('|') : '';
  const providersKey = providers ? [...providers].sort().join('|') : '';
  // biome-ignore lint/correctness/useExhaustiveDependencies: joined keys substitute for the raw arrays to keep the memo stable across renders
  return useMemo<PricingRow[]>(() => {
    const ids = models && models.length > 0 ? models : Object.keys(MODELS);
    const rows: PricingRow[] = [];
    for (const id of ids) {
      const model = MODELS[id];
      const rate = RATES[id];
      if (!model || !rate) continue;
      if (providers && providers.length > 0 && !providers.includes(model.provider)) continue;
      rows.push({ model, rate });
    }
    rows.sort((a, b) => a.model.id.localeCompare(b.model.id));
    return rows;
  }, [modelsKey, providersKey]);
};
