import type { TokenizeResult } from '@tokenometer/core';

const padRight = (value: string, width: number): string =>
  value.length >= width ? value : value + ' '.repeat(width - value.length);

const padLeft = (value: string, width: number): string =>
  value.length >= width ? value : ' '.repeat(width - value.length) + value;

const formatCost = (usd: number): string => {
  if (usd >= 0.01) return `$${usd.toFixed(4)}`;
  if (usd >= 0.000001) return `$${usd.toFixed(6)}`;
  return `$${usd.toExponential(2)}`;
};

export const renderTable = (results: readonly TokenizeResult[]): string => {
  if (results.length === 0) return '(no results)';

  const headers = ['model', 'format', 'tokens', 'est. cost'] as const;
  const rows: string[][] = results.map((r) => [
    r.model,
    r.format,
    r.inputTokens.toLocaleString(),
    formatCost(r.inputCost),
  ]);

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

export const renderSummary = (results: readonly TokenizeResult[]): string => {
  if (results.length === 0) return '';
  const cheapest = [...results].sort((a, b) => a.inputCost - b.inputCost)[0];
  const priciest = [...results].sort((a, b) => b.inputCost - a.inputCost)[0];
  if (!cheapest || !priciest || cheapest === priciest) return '';
  const ratio = priciest.inputCost / Math.max(cheapest.inputCost, Number.EPSILON);
  return `\nCheapest: ${cheapest.model} as ${cheapest.format} (${formatCost(cheapest.inputCost)})\nPriciest: ${priciest.model} as ${priciest.format} (${formatCost(priciest.inputCost)}, ${ratio.toFixed(2)}x more)`;
};
