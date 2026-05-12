import type { Format } from '@tokenometer/core';
import { useEffect, useState } from 'react';
import { type UseTokenCountResult, useTokenCount } from './useTokenCount.js';

export interface UseDebouncedTokenCountOptions {
  prompt: string;
  model: string;
  format?: Format;
  delayMs?: number;
}

const DEFAULT_DELAY_MS = 200;

/**
 * Debounce the prompt before feeding into useTokenCount. Useful for
 * tokenizing as the user types without re-running the encoder on every
 * keystroke.
 */
export const useDebouncedTokenCount = (
  options: UseDebouncedTokenCountOptions,
): UseTokenCountResult & { isPending: boolean } => {
  const { prompt, model, format, delayMs = DEFAULT_DELAY_MS } = options;
  const [debounced, setDebounced] = useState(prompt);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (debounced === prompt) return;
    setIsPending(true);
    const id = setTimeout(() => {
      setDebounced(prompt);
      setIsPending(false);
    }, delayMs);
    return () => {
      clearTimeout(id);
    };
  }, [prompt, debounced, delayMs]);

  const result = useTokenCount({
    prompt: debounced,
    model,
    ...(format !== undefined ? { format } : {}),
  });
  return { ...result, isPending };
};
