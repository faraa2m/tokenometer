import { getModel } from '@tokenometer/core';
import type { TokenizeResult, TokenometerFileResult } from '@tokenometer/core';

const padRight = (value: string, width: number): string =>
  value.length >= width ? value : value + ' '.repeat(width - value.length);

const padLeft = (value: string, width: number): string =>
  value.length >= width ? value : ' '.repeat(width - value.length) + value;

const formatCost = (usd: number): string => {
  if (usd >= 0.01) return `$${usd.toFixed(4)}`;
  if (usd >= 0.000001) return `$${usd.toFixed(6)}`;
  return `$${usd.toExponential(2)}`;
};

const formatMs = (ms: number): string => `${Math.round(ms)}`;

const formatTps = (tps: number): string =>
  tps >= 100 ? Math.round(tps).toString() : tps.toFixed(1);

export const renderTable = (results: readonly TokenizeResult[]): string => {
  if (results.length === 0) return '(no results)';

  // Latency columns are only added when at least one cell has latency data.
  const hasLatency = results.some((r) => r.latency !== undefined);

  const headers = hasLatency
    ? (['model', 'format', 'tokens', 'est. cost', 'p50 ttft', 'p50 total', 'tokens/s'] as const)
    : (['model', 'format', 'tokens', 'est. cost'] as const);
  const rows: string[][] = results.map((r) => {
    const base = [
      r.model,
      r.format,
      `${r.approximate ? '~' : ' '}${r.inputTokens.toLocaleString()}`,
      formatCost(r.inputCost),
    ];
    if (!hasLatency) return base;
    if (r.latency) {
      return [
        ...base,
        `${formatMs(r.latency.p50.ttftMs)} ms`,
        `${formatMs(r.latency.p50.totalMs)} ms`,
        formatTps(r.latency.p50.tokensPerSec),
      ];
    }
    return [...base, '-', '-', '-'];
  });

  const widths = headers.map((h, colIdx) => {
    const maxRowWidth = rows.reduce((acc, row) => Math.max(acc, row[colIdx]?.length ?? 0), 0);
    return Math.max(h.length, maxRowWidth);
  });

  const headerLine = headers.map((h, i) => padRight(h, widths[i] ?? h.length)).join('  ');
  const separator = headers.map((_, i) => '-'.repeat(widths[i] ?? 0)).join('  ');
  const dataLines = rows.map((row) =>
    row
      .map((cell, i) => {
        const isNumeric = i >= 2;
        return isNumeric
          ? padLeft(cell, widths[i] ?? cell.length)
          : padRight(cell, widths[i] ?? cell.length);
      })
      .join('  '),
  );

  return [headerLine, separator, ...dataLines].join('\n');
};

const formatTokenCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${n}`;
};

export const renderModelLimits = (results: readonly TokenizeResult[]): string => {
  if (results.length === 0) return '';
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const r of results) {
    if (seen.has(r.model)) continue;
    seen.add(r.model);
    const m = getModel(r.model);
    if (!m.contextWindow && !m.maxOutputTokens) continue;
    const parts: string[] = [];
    if (m.contextWindow) parts.push(`ctx ${formatTokenCount(m.contextWindow)}`);
    if (m.maxOutputTokens) parts.push(`out ${formatTokenCount(m.maxOutputTokens)}`);
    lines.push(`  ${r.model.padEnd(28)} ${parts.join(' · ')}`);
  }
  if (lines.length === 0) return '';
  return `\nLimits:\n${lines.join('\n')}`;
};

export const renderSummary = (results: readonly TokenizeResult[]): string => {
  if (results.length === 0) return '';
  const cheapest = [...results].sort((a, b) => a.inputCost - b.inputCost)[0];
  const priciest = [...results].sort((a, b) => b.inputCost - a.inputCost)[0];
  if (!cheapest || !priciest || cheapest === priciest) return '';
  const ratio = priciest.inputCost / Math.max(cheapest.inputCost, Number.EPSILON);
  return `\nCheapest: ${cheapest.model} as ${cheapest.format} (${formatCost(cheapest.inputCost)})\nPriciest: ${priciest.model} as ${priciest.format} (${formatCost(priciest.inputCost)}, ${ratio.toFixed(2)}x more)`;
};

/**
 * Per-file token + cost summary table. One row per input file (or virtual
 * file for `--image` entries). No-op when there's only one file.
 */
export const renderByFile = (files: readonly TokenometerFileResult[]): string => {
  if (files.length <= 1) return '';
  const headers = ['File', 'Tokens', 'USD'] as const;
  const rows: string[][] = files.map((f) => {
    const tokens = f.results.reduce((acc, r) => acc + r.inputTokens, 0);
    const cost = f.results.reduce((acc, r) => acc + r.inputCost, 0);
    return [f.path, tokens.toLocaleString(), formatCost(cost)];
  });
  const widths = headers.map((h, colIdx) => {
    const maxRowWidth = rows.reduce((acc, row) => Math.max(acc, row[colIdx]?.length ?? 0), 0);
    return Math.max(h.length, maxRowWidth);
  });
  const sep = headers.map((_, i) => '─'.repeat(widths[i] ?? 0)).join('  ');
  const headerLine = headers.map((h, i) => padRight(h, widths[i] ?? h.length)).join('  ');
  const dataLines = rows.map((row) =>
    row
      .map((cell, i) => {
        const isNumeric = i >= 1;
        return isNumeric
          ? padLeft(cell, widths[i] ?? cell.length)
          : padRight(cell, widths[i] ?? cell.length);
      })
      .join('  '),
  );
  return ['\nBy file:', `  ${headerLine}`, `  ${sep}`, ...dataLines.map((l) => `  ${l}`)].join(
    '\n',
  );
};
