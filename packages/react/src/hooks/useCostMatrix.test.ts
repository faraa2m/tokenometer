import { renderHook } from '@testing-library/react';
import { KNOWN_MODELS } from '@tokenometer/core/browser';
import { describe, expect, it } from 'vitest';
import { useCostMatrix } from './useCostMatrix.js';

const pickModels = (count: number): string[] => KNOWN_MODELS.slice(0, count);

describe('useCostMatrix', () => {
  it('returns one row per [model x format] pair', () => {
    const models = pickModels(2);
    const { result } = renderHook(() =>
      useCostMatrix({ prompt: 'hello', models, formats: ['text', 'json'] }),
    );
    expect(result.current).toHaveLength(4);
  });

  it('memoizes when model list identity changes but contents do not', () => {
    const models1 = pickModels(2);
    const models2 = [...models1];
    const { result, rerender } = renderHook(
      (props: { models: string[] }) => useCostMatrix({ prompt: 'hi', models: props.models }),
      { initialProps: { models: models1 } },
    );
    const first = result.current;
    rerender({ models: models2 });
    expect(result.current).toBe(first);
  });

  it('returns empty array on invalid model', () => {
    const { result } = renderHook(() => useCostMatrix({ prompt: 'hi', models: ['bogus-model'] }));
    expect(result.current).toEqual([]);
  });
});
