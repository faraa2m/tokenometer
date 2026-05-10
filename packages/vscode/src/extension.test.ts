import { describe, expect, it, vi } from 'vitest';
import {
  debounce,
  formatStatusBarCost,
  formatStatusBarText,
  formatTooltipCost,
  isCostOverThreshold,
  isSupportedFile,
  shortenModelId,
} from './format';

describe('shortenModelId', () => {
  it('strips the claude- prefix', () => {
    expect(shortenModelId('claude-opus-4-7')).toBe('opus-4-7');
    expect(shortenModelId('claude-sonnet-4-6')).toBe('sonnet-4-6');
    expect(shortenModelId('claude-haiku-4-5')).toBe('haiku-4-5');
  });

  it('strips trailing date stamps', () => {
    expect(shortenModelId('claude-3-5-haiku-20241022')).toBe('3-5-haiku');
  });

  it('strips the gpt- prefix', () => {
    expect(shortenModelId('gpt-4o')).toBe('4o');
    expect(shortenModelId('gpt-4o-mini')).toBe('4o-mini');
  });

  it('strips the gemini- prefix', () => {
    expect(shortenModelId('gemini-2.5-pro')).toBe('2.5-pro');
  });

  it('passes through unrecognized ids', () => {
    expect(shortenModelId('mystery-model-1')).toBe('mystery-model-1');
  });

  it('keeps the prefix when stripping would leave the id too short', () => {
    // "gpt-x" — only 1 char left after strip, so we keep the prefix.
    expect(shortenModelId('gpt-x')).toBe('gpt-x');
  });
});

describe('formatStatusBarCost', () => {
  it('uses 4 decimals for sub-$10 amounts', () => {
    expect(formatStatusBarCost(0)).toBe('$0.0000');
    expect(formatStatusBarCost(0.0186)).toBe('$0.0186');
    expect(formatStatusBarCost(1.2345)).toBe('$1.2345');
    expect(formatStatusBarCost(9.9999)).toBe('$9.9999');
  });

  it('uses 2 decimals for tens', () => {
    expect(formatStatusBarCost(10)).toBe('$10.00');
    expect(formatStatusBarCost(99.5)).toBe('$99.50');
  });

  it('uses 0 decimals for hundreds and up', () => {
    expect(formatStatusBarCost(100)).toBe('$100');
    expect(formatStatusBarCost(1234.567)).toBe('$1235');
  });
});

describe('formatTooltipCost', () => {
  it('always uses 8 decimals', () => {
    expect(formatTooltipCost(0)).toBe('$0.00000000');
    expect(formatTooltipCost(0.0186)).toBe('$0.01860000');
    expect(formatTooltipCost(0.000000123456789)).toBe('$0.00000012');
  });
});

describe('formatStatusBarText', () => {
  it('composes model, tokens, cost', () => {
    expect(
      formatStatusBarText({
        approximate: false,
        cost: 0.0186,
        modelId: 'claude-opus-4-7',
        tokens: 1234,
      }),
    ).toBe('opus-4-7 · 1,234 tok · $0.0186');
  });

  it('prefixes a tilde when approximate', () => {
    expect(
      formatStatusBarText({
        approximate: true,
        cost: 0.0186,
        modelId: 'claude-opus-4-7',
        tokens: 1234,
      }),
    ).toBe('opus-4-7 · ~1,234 tok · $0.0186');
  });

  it('handles zero tokens cleanly', () => {
    expect(
      formatStatusBarText({
        approximate: false,
        cost: 0,
        modelId: 'gpt-4o',
        tokens: 0,
      }),
    ).toBe('4o · 0 tok · $0.0000');
  });
});

describe('isCostOverThreshold', () => {
  it('returns false when threshold is zero or negative', () => {
    expect(isCostOverThreshold(100, 0)).toBe(false);
    expect(isCostOverThreshold(100, -1)).toBe(false);
  });

  it('returns true only when cost strictly exceeds threshold', () => {
    expect(isCostOverThreshold(0.05, 0.01)).toBe(true);
    expect(isCostOverThreshold(0.01, 0.01)).toBe(false);
    expect(isCostOverThreshold(0.001, 0.01)).toBe(false);
  });

  it('handles non-finite values defensively', () => {
    expect(isCostOverThreshold(Number.NaN, 1)).toBe(false);
    expect(isCostOverThreshold(1, Number.NaN)).toBe(false);
    expect(isCostOverThreshold(Number.POSITIVE_INFINITY, 1)).toBe(true);
    // Threshold of Infinity is finite=false, so disabled.
    expect(isCostOverThreshold(1, Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe('isSupportedFile', () => {
  it('matches by language id', () => {
    expect(isSupportedFile('markdown', 'foo.md')).toBe(true);
    expect(isSupportedFile('plaintext', 'foo.txt')).toBe(true);
    expect(isSupportedFile('json', 'foo.json')).toBe(true);
    expect(isSupportedFile('jsonc', 'foo.jsonc')).toBe(true);
    expect(isSupportedFile('yaml', 'foo.yaml')).toBe(true);
    expect(isSupportedFile('xml', 'foo.xml')).toBe(true);
  });

  it('falls back to file extension when language id is unhelpful', () => {
    expect(isSupportedFile('untitled', 'foo.md')).toBe(true);
    expect(isSupportedFile('untitled', 'foo.yml')).toBe(true);
    expect(isSupportedFile('plaintext-something', 'foo.markdown')).toBe(true);
  });

  it('rejects unsupported types', () => {
    expect(isSupportedFile('typescript', 'foo.ts')).toBe(false);
    expect(isSupportedFile('python', 'foo.py')).toBe(false);
    expect(isSupportedFile('javascript', undefined)).toBe(false);
  });
});

describe('debounce', () => {
  it('coalesces rapid calls into one trailing invocation', () => {
    vi.useFakeTimers();
    try {
      const spy = vi.fn();
      const wrapped = debounce(spy, 200);
      wrapped(1);
      wrapped(2);
      wrapped(3);
      expect(spy).not.toHaveBeenCalled();
      vi.advanceTimersByTime(199);
      expect(spy).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(spy).toHaveBeenCalledTimes(1);
      // Fires with the last set of args.
      expect(spy).toHaveBeenLastCalledWith(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancel() drops a pending invocation', () => {
    vi.useFakeTimers();
    try {
      const spy = vi.fn();
      const wrapped = debounce(spy, 200);
      wrapped();
      wrapped.cancel();
      vi.advanceTimersByTime(1000);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('separate calls after the wait window each fire', () => {
    vi.useFakeTimers();
    try {
      const spy = vi.fn();
      const wrapped = debounce(spy, 100);
      wrapped(1);
      vi.advanceTimersByTime(100);
      wrapped(2);
      vi.advanceTimersByTime(100);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenNthCalledWith(1, 1);
      expect(spy).toHaveBeenNthCalledWith(2, 2);
    } finally {
      vi.useRealTimers();
    }
  });
});
