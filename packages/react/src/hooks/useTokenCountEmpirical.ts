import type { Format, TokenizeResult } from '@tokenometer/core/browser';
import { tokenizeEmpirical } from '@tokenometer/core/empirical';
import type { EmpiricalEnv } from '@tokenometer/core/empirical';
import { useEffect, useState } from 'react';

export interface UseTokenCountEmpiricalOptions {
  prompt: string;
  model: string;
  env: EmpiricalEnv;
  format?: Format;
}

export interface UseTokenCountEmpiricalState {
  data?: TokenizeResult;
  error?: Error;
  isLoading: boolean;
}

const DEFAULT_FORMAT: Format = 'text';

/**
 * Async empirical token-count hook. Cancels in-flight requests on prompt /
 * model change via an effect-cleanup guard. Note: the underlying SDK calls
 * cannot be aborted mid-flight, but stale results are ignored when an
 * abort fires before they resolve.
 */
export const useTokenCountEmpirical = (
  options: UseTokenCountEmpiricalOptions,
): UseTokenCountEmpiricalState => {
  const { prompt, model, env, format = DEFAULT_FORMAT } = options;
  const [state, setState] = useState<UseTokenCountEmpiricalState>({ isLoading: false });

  useEffect(() => {
    if (!prompt) {
      setState({ isLoading: false });
      return;
    }
    let cancelled = false;
    setState({ isLoading: true });
    tokenizeEmpirical({ env, format, modelId: model, prompt })
      .then((data) => {
        if (!cancelled) setState({ data, isLoading: false });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error(String(err));
          setState({ error, isLoading: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [prompt, model, format, env]);

  return state;
};
