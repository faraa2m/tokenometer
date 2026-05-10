// Pure helpers used by the VS Code extension. Kept free of `vscode` imports so
// they can be unit-tested under Vitest without mocking the editor host.

/**
 * Shorten a model id for the status bar. Strips the provider-style prefix and
 * trims common date suffixes, leaving the recognizable middle. Falls back to
 * the original id if nothing obvious can be stripped.
 */
export const shortenModelId = (modelId: string): string => {
  // Drop a trailing -YYYYMMDD date stamp if present (e.g. claude-3-5-haiku-20241022).
  const stripped = modelId.replace(/-\d{8}$/, '');
  // Drop a leading provider prefix like "claude-" or "gpt-" only if there's
  // any recognizable identifier left afterwards (avoids turning "gpt-x" into
  // a single character).
  const knownPrefixes = ['claude-', 'gpt-', 'gemini-'];
  for (const prefix of knownPrefixes) {
    if (stripped.startsWith(prefix) && stripped.length - prefix.length >= 2) {
      return stripped.slice(prefix.length);
    }
  }
  return stripped;
};

/**
 * Format USD cost for the status bar — fixed 4 decimals so the width is stable
 * (`$0.0000` … `$9.9999`). For larger values, drop trailing decimals so the
 * status bar stays narrow.
 */
export const formatStatusBarCost = (usd: number): string => {
  if (usd >= 100) return `$${usd.toFixed(0)}`;
  if (usd >= 10) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(4)}`;
};

/**
 * Format USD cost for the tooltip — full 8-decimal precision since space is
 * not a constraint.
 */
export const formatTooltipCost = (usd: number): string => `$${usd.toFixed(8)}`;

export interface StatusBarTextOptions {
  approximate: boolean;
  cost: number;
  modelId: string;
  tokens: number;
}

/**
 * Compose the status bar label, e.g. `opus-4-7 · 1,234 tok · $0.0186` (or with
 * a leading `~` when the count is approximate).
 */
export const formatStatusBarText = (opts: StatusBarTextOptions): string => {
  const tokens = opts.tokens.toLocaleString();
  const prefix = opts.approximate ? '~' : '';
  const model = shortenModelId(opts.modelId);
  return `${model} · ${prefix}${tokens} tok · ${formatStatusBarCost(opts.cost)}`;
};

/**
 * Decide whether the configured warning threshold is tripped.
 * - Threshold of 0 (or negative) disables the warning.
 * - Otherwise, fire when the current cost is strictly greater than the
 *   threshold. Equality is below the bar so a budget of $0.01 doesn't flicker
 *   when the cost lands exactly on $0.01.
 */
export const isCostOverThreshold = (cost: number, threshold: number): boolean => {
  if (!Number.isFinite(threshold) || threshold <= 0) return false;
  if (Number.isNaN(cost)) return false;
  return cost > threshold;
};

/**
 * Tiny debounce. Returns a wrapped function plus a `cancel()` to drop a
 * pending invocation (used on extension deactivate).
 */
export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  cancel: () => void;
}

export const debounce = <A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number,
): Debounced<A> => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const wrapped = ((...args: A) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, waitMs);
  }) as Debounced<A>;

  wrapped.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return wrapped;
};

/** Set of language ids / file extensions Tokenometer treats as prompt content. */
export const SUPPORTED_LANGUAGE_IDS: readonly string[] = [
  'plaintext',
  'markdown',
  'json',
  'jsonc',
  'yaml',
  'xml',
];

/** Mirror of SUPPORTED_LANGUAGE_IDS for fallback file-extension matching. */
export const SUPPORTED_EXTENSIONS: readonly string[] = [
  '.txt',
  '.md',
  '.markdown',
  '.json',
  '.yaml',
  '.yml',
  '.xml',
];

export const isSupportedFile = (languageId: string, fileName: string | undefined): boolean => {
  if (SUPPORTED_LANGUAGE_IDS.includes(languageId)) return true;
  if (!fileName) return false;
  const lower = fileName.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

/** Hard ceiling on file size we'll tokenize synchronously, in bytes. */
export const MAX_FILE_BYTES = 1_000_000;
