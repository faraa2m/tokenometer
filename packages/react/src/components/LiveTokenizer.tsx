import { type ChangeEvent, forwardRef, useCallback, useState } from 'react';
import { useDebouncedTokenCount } from '../hooks/useDebouncedTokenCount.js';
import { formatUsd } from '../utils/format.js';

export interface LiveTokenizerProps {
  model: string;
  defaultPrompt?: string;
  debounceMs?: number;
  placeholder?: string;
  className?: string;
  onChange?: (prompt: string) => void;
}

/**
 * Controlled textarea + debounced token count. Renders a live readout of
 * tokens and input cost.
 */
export const LiveTokenizer = forwardRef<HTMLDivElement, LiveTokenizerProps>(
  function LiveTokenizer(props, ref) {
    const {
      model,
      defaultPrompt = '',
      debounceMs = 200,
      placeholder = 'paste a prompt...',
      className,
      onChange,
    } = props;
    const [prompt, setPrompt] = useState(defaultPrompt);
    const onTextareaChange = useCallback(
      (e: ChangeEvent<HTMLTextAreaElement>) => {
        const next = e.target.value;
        setPrompt(next);
        onChange?.(next);
      },
      [onChange],
    );
    const result = useDebouncedTokenCount({ prompt, model, delayMs: debounceMs });
    return (
      <div className={className} ref={ref} data-tk="live-tokenizer">
        <textarea
          aria-label="prompt"
          data-tk="live-tokenizer-input"
          onChange={onTextareaChange}
          placeholder={placeholder}
          value={prompt}
        />
        <div data-tk="live-tokenizer-readout" data-tk-pending={result.isPending}>
          {result.error ? (
            <span>error: {result.error.message}</span>
          ) : (
            <span>
              {result.tokens} tok — {formatUsd(result.cost)}
              {result.isPending ? ' (updating)' : ''}
            </span>
          )}
        </div>
      </div>
    );
  },
);
