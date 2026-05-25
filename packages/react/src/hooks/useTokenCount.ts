import { tokenize } from '@tokenometer/core/browser';
import type { Format, TokenizerKind } from '@tokenometer/core/browser';
import { useMemo } from 'react';

export interface UseTokenCountOptions {
  prompt: string;
  model: string;
  format?: Format;
}

export interface UseTokenCountResult {
  tokens: number;
  cost: number;
  tokenizer: TokenizerKind;
  approximate: boolean;
  model: string;
  format: Format;
  error?: Error;
}

const DEFAULT_FORMAT: Format = 'text';

/**
 * Synchronously compute token count and input cost for a prompt + model.
 *
 * Memoizes on [prompt, model, format] so re-renders that do not change
 * inputs are free.
 */
export const useTokenCount = (options: UseTokenCountOptions): UseTokenCountResult => {
  const { prompt, model, format = DEFAULT_FORMAT } = options;
  return useMemo<UseTokenCountResult>(() => {
    try {
      const r = tokenize({ format, modelId: model, prompt });
      return {
        approximate: r.approximate,
        cost: r.inputCost,
        format: r.format,
        model: r.model,
        tokenizer: r.tokenizer,
        tokens: r.inputTokens,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return {
        approximate: true,
        cost: 0,
        error,
        format,
        model,
        tokenizer: 'heuristic',
        tokens: 0,
      };
    }
  }, [prompt, model, format]);
};
