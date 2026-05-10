/**
 * Pure aggregation + markdown rendering for the per-file diff section of the
 * sticky PR comment. Kept free of `@actions/*` imports so it can be unit-tested
 * in isolation under Vitest.
 */

export interface CellRecord {
  cost: number;
  tokens: number;
}

export interface PerFileInput {
  /** Base-side (model, format) cells. `null` when the file was added in head. */
  base: readonly CellRecord[] | null;
  /** Head-side (model, format) cells. Empty array = file was deleted in head. */
  head: readonly CellRecord[];
  path: string;
}

export type FileStatus = 'added' | 'deleted' | 'modified';

export interface PerFileRow {
  baseCost: number;
  baseTokens: number;
  costDelta: number;
  headCost: number;
  headTokens: number;
  path: string;
  status: FileStatus;
  tokensDelta: number;
}

export interface AggregateResult {
  allRows: PerFileRow[];
  topRows: PerFileRow[];
  totalFiles: number;
}

const sumTokens = (cells: readonly CellRecord[]): number =>
  cells.reduce((acc, c) => acc + c.tokens, 0);

const sumCost = (cells: readonly CellRecord[]): number => cells.reduce((acc, c) => acc + c.cost, 0);

const toRow = (input: PerFileInput): PerFileRow => {
  const headTokens = sumTokens(input.head);
  const headCost = sumCost(input.head);
  const baseTokens = input.base === null ? 0 : sumTokens(input.base);
  const baseCost = input.base === null ? 0 : sumCost(input.base);
  const status: FileStatus =
    input.base === null ? 'added' : input.head.length === 0 ? 'deleted' : 'modified';
  return {
    baseCost,
    baseTokens,
    costDelta: headCost - baseCost,
    headCost,
    headTokens,
    path: input.path,
    status,
    tokensDelta: headTokens - baseTokens,
  };
};

/**
 * Aggregate per-file deltas, sort by `|Δ USD|` desc → tokens Δ desc → path lex
 * asc, then return both the truncated top-N slice and the full list.
 */
export const aggregatePerFileDiff = (
  inputs: readonly PerFileInput[],
  opts: { topN: number },
): AggregateResult => {
  const topN = Math.max(1, Math.min(20, Math.trunc(opts.topN)));
  const allRows = inputs.map(toRow).sort((a, b) => {
    const absDiff = Math.abs(b.costDelta) - Math.abs(a.costDelta);
    if (absDiff !== 0) return absDiff;
    const tokDiff = b.tokensDelta - a.tokensDelta;
    if (tokDiff !== 0) return tokDiff;
    return a.path.localeCompare(b.path);
  });
  return {
    allRows,
    topRows: allRows.slice(0, topN),
    totalFiles: allRows.length,
  };
};

const formatTokensDelta = (delta: number): string => {
  if (delta === 0) return '0';
  const sign = delta > 0 ? '+' : '−';
  return `${sign}${Math.abs(delta).toLocaleString()}`;
};

const formatUsd = (usd: number): string => {
  if (Math.abs(usd) >= 0.01) return `$${usd.toFixed(4)}`;
  if (Math.abs(usd) >= 0.000001) return `$${usd.toFixed(6)}`;
  return `$${usd.toExponential(2)}`;
};

const formatUsdDelta = (delta: number): string => {
  if (delta === 0) return '$0';
  const sign = delta > 0 ? '+' : '−';
  return `${sign}${formatUsd(Math.abs(delta))}`;
};

const renderRow = (row: PerFileRow): string => {
  const marker = row.status === 'added' ? ' (+)' : row.status === 'deleted' ? ' (−)' : '';
  return `| \`${row.path}\`${marker} | ${formatTokensDelta(row.tokensDelta)} | ${formatUsdDelta(row.costDelta)} |`;
};

const TABLE_HEADER = ['| File | Tokens Δ | USD Δ |', '|---|---:|---:|'];

/**
 * Render the per-file markdown block: top-N table, plus a collapsible
 * `<details>` with all rows when total files exceeds the top-N truncation.
 *
 * Returns an empty string when there are no files to render.
 */
export const renderPerFileMarkdown = (result: AggregateResult): string => {
  if (result.totalFiles === 0) return '';

  const lines: string[] = [];
  lines.push(`### Top changed files (${result.topRows.length})`);
  lines.push('');
  lines.push(...TABLE_HEADER);
  for (const row of result.topRows) lines.push(renderRow(row));

  if (result.totalFiles > result.topRows.length) {
    lines.push('');
    lines.push(`<details><summary>All ${result.totalFiles} files</summary>`);
    lines.push('');
    lines.push(...TABLE_HEADER);
    for (const row of result.allRows) lines.push(renderRow(row));
    lines.push('');
    lines.push('</details>');
  }

  return lines.join('\n');
};
