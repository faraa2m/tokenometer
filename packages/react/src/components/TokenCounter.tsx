import type { Format } from '@tokenometer/core/browser';
import { type ReactNode, forwardRef } from 'react';
import { type UseTokenCountResult, useTokenCount } from '../hooks/useTokenCount.js';
import { formatUsd } from '../utils/format.js';

export interface TokenCounterProps {
  prompt: string;
  model: string;
  format?: Format;
  className?: string;
  /**
   * Custom renderer. Receives the full count result so callers can lay
   * out their own UI without losing access to cost / tokenizer / etc.
   */
  render?: (state: UseTokenCountResult) => ReactNode;
}

/**
 * Drop-in token + cost display. Renders `<N> tok — $X.XXXX` by default,
 * or a caller-supplied render function for full UI control.
 */
export const TokenCounter = forwardRef<HTMLSpanElement, TokenCounterProps>(
  function TokenCounter(props, ref) {
    const { prompt, model, format, className, render } = props;
    const state = useTokenCount({
      prompt,
      model,
      ...(format !== undefined ? { format } : {}),
    });
    if (render) {
      return (
        <span className={className} ref={ref} data-tk="token-counter">
          {render(state)}
        </span>
      );
    }
    if (state.error) {
      return (
        <span className={className} ref={ref} data-tk="token-counter" data-tk-state="error">
          error: {state.error.message}
        </span>
      );
    }
    return (
      <span className={className} ref={ref} data-tk="token-counter">
        {state.tokens} tok — {formatUsd(state.cost)}
        {state.approximate ? ' ~' : ''}
      </span>
    );
  },
);
