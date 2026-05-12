import { describe, expect, it } from 'vitest';
import { formatTokens, formatUsd } from './format.js';

describe('formatUsd', () => {
  it('formats with default 4 decimals', () => {
    expect(formatUsd(0.12345)).toBe('$0.1235');
  });

  it('respects custom decimals', () => {
    expect(formatUsd(1.2, 2)).toBe('$1.20');
  });

  it('handles zero', () => {
    expect(formatUsd(0)).toBe('$0.0000');
  });
});

describe('formatTokens', () => {
  it('renders raw count under 1000', () => {
    expect(formatTokens(42)).toBe('42');
    expect(formatTokens(999)).toBe('999');
  });

  it('renders thousands with one decimal place', () => {
    expect(formatTokens(1000)).toBe('1.0k');
    expect(formatTokens(12_345)).toBe('12.3k');
  });
});
