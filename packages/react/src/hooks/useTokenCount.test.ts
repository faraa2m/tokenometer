import { renderHook } from '@testing-library/react';
import { KNOWN_MODELS } from '@tokenometer/core/browser';
import { describe, expect, it } from 'vitest';
import { useTokenCount } from './useTokenCount.js';

const pickModel = (provider: string): string => {
  const m = KNOWN_MODELS.find((id) => id.toLowerCase().includes(provider));
  if (!m) throw new Error(`no ${provider} model in registry for test`);
  return m;
};

describe('useTokenCount', () => {
  it('returns positive token count for a non-empty prompt', () => {
    const model = pickModel('gpt');
    const { result } = renderHook(() => useTokenCount({ prompt: 'hello world', model }));
    expect(result.current.tokens).toBeGreaterThan(0);
    expect(result.current.cost).toBeGreaterThanOrEqual(0);
    expect(result.current.error).toBeUndefined();
  });

  it('memoizes on identical inputs', () => {
    const model = pickModel('gpt');
    const { result, rerender } = renderHook(
      (props: { prompt: string }) => useTokenCount({ prompt: props.prompt, model }),
      { initialProps: { prompt: 'hello' } },
    );
    const first = result.current;
    rerender({ prompt: 'hello' });
    expect(result.current).toBe(first);
  });

  it('returns error result for unknown model without throwing', () => {
    const { result } = renderHook(() =>
      useTokenCount({ prompt: 'hi', model: 'not-a-real-model-xyz' }),
    );
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.tokens).toBe(0);
  });
});
