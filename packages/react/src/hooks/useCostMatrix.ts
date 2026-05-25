import { tokenizeMatrix } from '@tokenometer/core/browser';
import type { Format, TokenizeResult } from '@tokenometer/core/browser';
import { useMemo } from 'react';

export interface UseCostMatrixOptions {
  prompt: string;
  models: readonly string[];
  formats?: readonly Format[];
}

const DEFAULT_FORMATS: readonly Format[] = ['text'];

/**
 * Compute a flat list of TokenizeResults for the cartesian product of
 * [models] x [formats]. Memoized on the joined keys so result identity
 * is stable when inputs do not change.
 */
export const useCostMatrix = (options: UseCostMatrixOptions): TokenizeResult[] => {
  const { prompt, models, formats = DEFAULT_FORMATS } = options;
  const modelsKey = models.join('|');
  const formatsKey = formats.join('|');
  // biome-ignore lint/correctness/useExhaustiveDependencies: joined keys (modelsKey, formatsKey) are the stable surrogate for the raw arrays
  return useMemo<TokenizeResult[]>(() => {
    try {
      return tokenizeMatrix({ formats, modelIds: models, prompt });
    } catch {
      return [];
    }
  }, [prompt, modelsKey, formatsKey]);
};
