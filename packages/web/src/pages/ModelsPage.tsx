import { KNOWN_MODELS, RATES_VERSION, getModel, getRate } from '@tokenometer/core';
import type { Provider } from '@tokenometer/core';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle.js';

interface AtlasRow {
  id: string;
  provider: Provider;
  inputPer1k: number;
  outputPer1k: number;
  cachedInputPer1k?: number;
  contextWindow?: number;
  maxOutputTokens?: number;
  pricingSource?: 'local' | 'tokenlens';
}

type SortKey = 'provider' | 'id' | 'input' | 'output' | 'context';
type SortDir = 'asc' | 'desc';

// Built dynamically inside the component once we know which providers actually
// appear in the registry — the Provider union may include providers nobody has
// shipped a model for.

const formatRate = (per1k: number): string => `$${per1k.toFixed(per1k < 0.001 ? 6 : 4)}`;

const formatCtx = (n?: number): string => {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
};

const buildAtlas = (): AtlasRow[] => {
  const out: AtlasRow[] = [];
  for (const id of KNOWN_MODELS) {
    try {
      const m = getModel(id);
      const r = getRate(id);
      out.push({
        ...(m.contextWindow !== undefined ? { contextWindow: m.contextWindow } : {}),
        ...(m.maxOutputTokens !== undefined ? { maxOutputTokens: m.maxOutputTokens } : {}),
        ...(m.pricingSource !== undefined ? { pricingSource: m.pricingSource } : {}),
        ...(r.cachedInputPer1k !== undefined ? { cachedInputPer1k: r.cachedInputPer1k } : {}),
        id,
        inputPer1k: r.inputPer1k,
        outputPer1k: r.outputPer1k,
        provider: m.provider,
      });
    } catch {
      // skip unknown - shouldn't happen since we iterate KNOWN_MODELS.
    }
  }
  return out;
};

const sortRows = (rows: AtlasRow[], key: SortKey, dir: SortDir): AtlasRow[] => {
  const dirMul = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case 'provider':
        cmp = a.provider.localeCompare(b.provider);
        if (cmp === 0) cmp = a.id.localeCompare(b.id);
        break;
      case 'id':
        cmp = a.id.localeCompare(b.id);
        break;
      case 'input':
        cmp = a.inputPer1k - b.inputPer1k;
        break;
      case 'output':
        cmp = a.outputPer1k - b.outputPer1k;
        break;
      case 'context':
        cmp = (a.contextWindow ?? 0) - (b.contextWindow ?? 0);
        break;
    }
    return cmp * dirMul;
  });
};

export const ModelsPage = () => {
  usePageTitle('cost atlas', 'every model, every rate');
  const allRows = useMemo(() => buildAtlas(), []);
  const providerOptions = useMemo<readonly ('all' | Provider)[]>(
    () => ['all', ...Array.from(new Set(allRows.map((r) => r.provider))).sort()],
    [allRows],
  );
  const [providerFilter, setProviderFilter] = useState<'all' | Provider>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('provider');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = allRows.filter((r) => {
      if (providerFilter !== 'all' && r.provider !== providerFilter) return false;
      if (q && !r.id.toLowerCase().includes(q) && !r.provider.toLowerCase().includes(q))
        return false;
      return true;
    });
    return sortRows(filtered, sortKey, sortDir);
  }, [allRows, providerFilter, search, sortKey, sortDir]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'input' || key === 'output' ? 'asc' : 'asc');
    }
  };

  const sortIndicator = (key: SortKey): string => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <section className="space-y-8 py-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
          ›cost atlas · {allRows.length} models · rates {RATES_VERSION}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">models</h1>
        <p className="mt-2 max-w-3xl text-[12.5px] text-[var(--tk-dim)]">
          Every model tokenometer knows about, sourced from the{' '}
          <a
            href="https://github.com/Lakra-Sumant/tokenlens"
            className="underline decoration-[var(--tk-amber-dim)] underline-offset-4"
          >
            tokenlens
          </a>{' '}
          registry plus a small list of hand-tracked overrides for bleeding-edge releases. Prices
          shown are USD per 1,000 input/output tokens. Click a row for details.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-x-4 gap-y-3">
        <div className="col-span-12 sm:col-span-4">
          <p className="mb-1.5 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
            search
          </p>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            spellCheck={false}
            placeholder="claude / gpt / gemini / o3..."
            className="block w-full border border-[var(--tk-rule)] bg-[var(--tk-cell)] px-2 py-1.5 text-[12px] text-[var(--tk-fg)] focus:border-[var(--tk-amber)] focus:outline-none"
          />
        </div>
        <div className="col-span-12 sm:col-span-4">
          <p className="mb-1.5 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
            provider
          </p>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value as 'all' | Provider)}
            className="block w-full border border-[var(--tk-rule)] bg-[var(--tk-cell)] px-2 py-1.5 text-[12px] text-[var(--tk-fg)] focus:border-[var(--tk-amber)] focus:outline-none"
          >
            {providerOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto border border-[var(--tk-rule)]">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--tk-rule)] text-[10px] uppercase tracking-[0.25em] text-[var(--tk-dim)]">
              {(
                [
                  ['id', 'model'],
                  ['provider', 'provider'],
                  ['input', 'in $/1k'],
                  ['output', 'out $/1k'],
                  ['context', 'context'],
                ] as const
              ).map(([key, label]) => (
                <th key={key} className="px-3 py-2 text-left font-normal">
                  <button
                    type="button"
                    onClick={() => onSort(key)}
                    className="cursor-pointer text-left text-[10px] uppercase tracking-[0.25em] text-[var(--tk-dim)] hover:text-[var(--tk-amber)]"
                  >
                    {label}
                    {sortIndicator(key)}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2 text-left font-normal">notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--tk-rule)]/60">
                <td className="px-3 py-1.5 text-[var(--tk-fg)]">
                  <Link
                    to={`/models/${encodeURIComponent(r.id)}`}
                    className="underline decoration-[var(--tk-amber-dim)] underline-offset-4 hover:text-[var(--tk-amber)]"
                  >
                    {r.id}
                  </Link>
                </td>
                <td className="px-3 py-1.5 text-[var(--tk-dim)]">{r.provider}</td>
                <td className="px-3 py-1.5 tabular-nums text-[var(--tk-fg)]">
                  {formatRate(r.inputPer1k)}
                </td>
                <td className="px-3 py-1.5 tabular-nums text-[var(--tk-fg)]">
                  {formatRate(r.outputPer1k)}
                </td>
                <td className="px-3 py-1.5 tabular-nums text-[var(--tk-dim)]">
                  {formatCtx(r.contextWindow)}
                </td>
                <td className="px-3 py-1.5 text-[10.5px] text-[var(--tk-dim)]">
                  {r.pricingSource ?? '—'}
                  {r.cachedInputPer1k ? ` · cache ${formatRate(r.cachedInputPer1k)}` : ''}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-[12px] text-[var(--tk-dim)]">
                  no models match
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
