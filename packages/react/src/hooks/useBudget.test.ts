import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useBudget } from './useBudget.js';

describe('useBudget', () => {
  it('classifies as ok below warn threshold', () => {
    const { result } = renderHook(() => useBudget({ usedUsd: 1, budgetUsd: 10 }));
    expect(result.current.state).toBe('ok');
    expect(result.current.percent).toBeCloseTo(0.1);
    expect(result.current.remaining).toBe(9);
  });

  it('classifies as warn at warn threshold', () => {
    const { result } = renderHook(() => useBudget({ usedUsd: 8, budgetUsd: 10 }));
    expect(result.current.state).toBe('warn');
  });

  it('classifies as over when used >= budget', () => {
    const { result } = renderHook(() => useBudget({ usedUsd: 11, budgetUsd: 10 }));
    expect(result.current.state).toBe('over');
    expect(result.current.remaining).toBe(-1);
  });

  it('handles zero budget without dividing by zero', () => {
    const { result } = renderHook(() => useBudget({ usedUsd: 1, budgetUsd: 0 }));
    expect(result.current.percent).toBe(0);
    expect(result.current.state).toBe('ok');
  });

  it('formats USD with 4 decimals', () => {
    const { result } = renderHook(() => useBudget({ usedUsd: 0.1234, budgetUsd: 1 }));
    expect(result.current.formatted.used).toBe('$0.1234');
    expect(result.current.formatted.percent).toBe('12%');
  });
});
