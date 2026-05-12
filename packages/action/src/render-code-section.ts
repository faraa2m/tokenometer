import type { CodePromptRow } from './measure-code.js';
import { formatTokensDelta, formatUsdDelta } from './per-file-diff.js';

const TABLE_HEADER = ['| Location | Model | Tokens Δ | USD Δ |', '|---|---|---:|---:|'];

const renderRow = (row: CodePromptRow): string => {
  const tokensDelta = row.headTokens - row.baseTokens;
  return `| \`${row.location}\` | ${row.model} | ${formatTokensDelta(tokensDelta)} | ${formatUsdDelta(row.costDelta)} |`;
};

const sortRows = (rows: readonly CodePromptRow[]): CodePromptRow[] =>
  [...rows].sort((a, b) => {
    const absCost = Math.abs(b.costDelta) - Math.abs(a.costDelta);
    if (absCost !== 0) return absCost;
    const absTok = Math.abs(b.headTokens - b.baseTokens) - Math.abs(a.headTokens - a.baseTokens);
    if (absTok !== 0) return absTok;
    return a.location.localeCompare(b.location);
  });

export const renderCodeSection = (rows: readonly CodePromptRow[], topN: number): string => {
  if (rows.length === 0) return '';
  const clampedTopN = Math.max(1, Math.min(20, Math.trunc(topN)));
  const sorted = sortRows(rows);
  const top = sorted.slice(0, clampedTopN);

  const lines: string[] = [];
  lines.push(`### Code-Embedded Prompts (${sorted.length})`);
  lines.push('');
  lines.push(...TABLE_HEADER);
  for (const row of top) lines.push(renderRow(row));

  if (sorted.length > top.length) {
    lines.push('');
    lines.push(`<details><summary>All ${sorted.length} prompts</summary>`);
    lines.push('');
    lines.push(...TABLE_HEADER);
    for (const row of sorted) lines.push(renderRow(row));
    lines.push('');
    lines.push('</details>');
  }

  return lines.join('\n');
};
