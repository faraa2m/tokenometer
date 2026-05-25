import { MODELS } from '@tokenometer/core/browser';
import type { ModelDescriptor, Provider } from '@tokenometer/core/browser';
import { useMemo } from 'react';

export interface UseModelListOptions {
  providers?: readonly Provider[];
}

/**
 * List ModelDescriptors from the registry, optionally filtered by provider.
 * Sorted alphabetically by id for stable output.
 */
export const useModelList = (options: UseModelListOptions = {}): ModelDescriptor[] => {
  const { providers } = options;
  const providersKey = providers ? [...providers].sort().join('|') : '';
  // biome-ignore lint/correctness/useExhaustiveDependencies: providersKey is the stable join of providers; tracking the raw array would bust the memo on every render
  return useMemo<ModelDescriptor[]>(() => {
    const all = Object.values(MODELS);
    const filtered =
      providers && providers.length > 0 ? all.filter((m) => providers.includes(m.provider)) : all;
    return [...filtered].sort((a, b) => a.id.localeCompare(b.id));
  }, [providersKey]);
};
