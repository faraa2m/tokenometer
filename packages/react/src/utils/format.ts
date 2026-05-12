/**
 * Format a USD amount to a fixed number of decimal places.
 *
 * @param n - amount in USD
 * @param decimals - decimal places, default 4
 */
export const formatUsd = (n: number, decimals = 4): string => `$${n.toFixed(decimals)}`;

/**
 * Format a token count for display. Counts >= 1000 are rendered as `Xk`.
 */
export const formatTokens = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
