import { KNOWN_MODELS, allFormats, getModel, tokenize } from '@tokenometer/core';
import type { Format, Provider, TokenizeResult } from '@tokenometer/core';
import { useMemo, useState } from 'react';
import { usePageTitle } from '../hooks/usePageTitle.js';

const PROVIDER_ORDER: readonly Provider[] = ['anthropic', 'openai', 'google'];
const ALL_FORMATS: readonly Format[] = allFormats();

const SAMPLE_BASE = `You are a code reviewer. Review the patch and return findings as JSON
with keys: severity (low|medium|high), file, line, message.
Be concise.`;

const SAMPLE_HEAD = `You are an expert code reviewer with 10+ years of experience.
Review the patch carefully and return findings as JSON with keys:
severity (low|medium|high), file, line, message, suggestion.
Be concise but thorough. Cover security, perf, correctness, style.`;

const formatCost = (usd: number): string => {
  if (usd >= 0.01) return `$${usd.toFixed(4)}`;
  if (usd >= 0.000001) return `$${usd.toFixed(6)}`;
  return `$${usd.toExponential(2)}`;
};

const formatDeltaCost = (delta: number): string => {
  const sign = delta >= 0 ? '+' : '−';
  return `${sign}${formatCost(Math.abs(delta))}`;
};

const formatDeltaTokens = (delta: number): string => {
  const sign = delta >= 0 ? '+' : '−';
  return `${sign}${Math.abs(delta).toLocaleString()}`;
};

interface DiffRow {
  model: string;
  provider: Provider;
  format: Format;
  baseTokens: number;
  headTokens: number;
  baseCost: number;
  headCost: number;
}

const buildModelGroups = (): { provider: Provider; models: string[] }[] => {
  const grouped = new Map<Provider, string[]>();
  for (const id of KNOWN_MODELS) {
    const p = getModel(id).provider;
    const list = grouped.get(p) ?? [];
    list.push(id);
    grouped.set(p, list);
  }
  const listed = PROVIDER_ORDER.filter((p) => grouped.has(p));
  const extras = [...grouped.keys()].filter((p) => !PROVIDER_ORDER.includes(p)).sort();
  return [...listed, ...extras].map((provider) => ({
    models: grouped.get(provider) ?? [],
    provider,
  }));
};

export const DiffPage = () => {
  usePageTitle('diff', 'sticky-comment preview');
  const [base, setBase] = useState(SAMPLE_BASE);
  const [head, setHead] = useState(SAMPLE_HEAD);
  const modelGroups = useMemo(() => buildModelGroups(), []);
  const [selectedModels, setSelectedModels] = useState<string[]>([
    'claude-sonnet-4-6',
    'gpt-4o',
    'gemini-2.5-flash',
  ]);
  const [selectedFormats, setSelectedFormats] = useState<Format[]>(['text', 'json', 'markdown']);

  const toggleModel = (id: string) =>
    setSelectedModels((p) => (p.includes(id) ? p.filter((m) => m !== id) : [...p, id]));
  const toggleFormat = (f: Format) =>
    setSelectedFormats((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));

  const rows: DiffRow[] = useMemo(() => {
    if (!base.trim() && !head.trim()) return [];
    if (!selectedModels.length || !selectedFormats.length) return [];
    const out: DiffRow[] = [];
    for (const modelId of selectedModels) {
      let model: ReturnType<typeof getModel>;
      try {
        model = getModel(modelId);
      } catch {
        continue;
      }
      for (const format of selectedFormats) {
        let baseR: TokenizeResult | null = null;
        let headR: TokenizeResult | null = null;
        try {
          baseR = base.trim() ? tokenize({ format, modelId, prompt: base }) : null;
          headR = head.trim() ? tokenize({ format, modelId, prompt: head }) : null;
        } catch {
          continue;
        }
        out.push({
          baseCost: baseR?.inputCost ?? 0,
          baseTokens: baseR?.inputTokens ?? 0,
          format,
          headCost: headR?.inputCost ?? 0,
          headTokens: headR?.inputTokens ?? 0,
          model: modelId,
          provider: model.provider,
        });
      }
    }
    return out;
  }, [base, head, selectedModels, selectedFormats]);

  // Stable, deterministic synthetic file path so the rendered preview reads like
  // the real Action sticky comment, but doesn't pretend to know about a repo.
  const fakeFile = 'prompts/review.md';
  const totalDeltaTokens = rows.reduce((acc, r) => acc + (r.headTokens - r.baseTokens), 0);
  const totalDeltaCost = rows.reduce((acc, r) => acc + (r.headCost - r.baseCost), 0);

  return (
    <section className="space-y-8 py-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
          ›diff · sticky-comment preview
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">prompt diff</h1>
        <p className="mt-2 max-w-3xl text-[12.5px] text-[var(--tk-dim)]">
          Paste a base + head prompt. We tokenize both and render a live preview of what the GitHub
          Action's sticky PR comment would look like for this change. Same numbers — same
          tokenizers, same pricing — without needing a PR.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-x-6 gap-y-6">
        <div className="col-span-12 lg:col-span-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
            01 ›base (main)
          </p>
          <textarea
            value={base}
            onChange={(e) => setBase(e.target.value)}
            rows={10}
            spellCheck={false}
            className="block w-full resize-y border border-[var(--tk-rule)] bg-[var(--tk-cell)] p-4 text-[12.5px] leading-[1.65] text-[var(--tk-fg)] focus:border-[var(--tk-amber)] focus:outline-none"
          />
          <p className="mt-2 text-[10px] text-[var(--tk-dim)]">
            {base.length.toLocaleString()} chars
          </p>
        </div>
        <div className="col-span-12 lg:col-span-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
            02 ›head (PR)
          </p>
          <textarea
            value={head}
            onChange={(e) => setHead(e.target.value)}
            rows={10}
            spellCheck={false}
            className="block w-full resize-y border border-[var(--tk-rule)] bg-[var(--tk-cell)] p-4 text-[12.5px] leading-[1.65] text-[var(--tk-fg)] focus:border-[var(--tk-amber)] focus:outline-none"
          />
          <p className="mt-2 text-[10px] text-[var(--tk-dim)]">
            {head.length.toLocaleString()} chars
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-x-6 gap-y-6">
        <div className="col-span-12 lg:col-span-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
            03 ›models
          </p>
          <div className="space-y-3">
            {modelGroups.map(({ provider, models }) => (
              <div key={provider}>
                <p className="mb-1.5 text-[9.5px] uppercase tracking-[0.28em] text-[var(--tk-dim)]">
                  {provider}
                </p>
                <div className="flex flex-wrap gap-2">
                  {models.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleModel(id)}
                      className={
                        selectedModels.includes(id)
                          ? 'border border-[var(--tk-amber)] bg-[var(--tk-amber)] px-2 py-[3px] text-[11px] text-[var(--tk-bg)]'
                          : 'border border-[var(--tk-rule)] px-2 py-[3px] text-[11px] text-[var(--tk-dim)] hover:border-[var(--tk-amber)] hover:text-[var(--tk-amber)]'
                      }
                    >
                      {selectedModels.includes(id) ? '[x] ' : '[ ] '}
                      {id}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-12 lg:col-span-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
            04 ›formats
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_FORMATS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => toggleFormat(f)}
                className={
                  selectedFormats.includes(f)
                    ? 'border border-[var(--tk-amber)] bg-[var(--tk-amber)] px-2 py-[3px] text-[11px] text-[var(--tk-bg)]'
                    : 'border border-[var(--tk-rule)] px-2 py-[3px] text-[11px] text-[var(--tk-dim)] hover:border-[var(--tk-amber)] hover:text-[var(--tk-amber)]'
                }
              >
                {selectedFormats.includes(f) ? '[x] ' : '[ ] '}
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
          05 › sticky comment preview
        </p>
        <div className="border border-[var(--tk-rule)] bg-[var(--tk-cell)]">
          <div className="border-b border-[var(--tk-rule)] px-4 py-3">
            <p className="text-[12px] font-bold text-[var(--tk-fg)]">tokenometer</p>
            <p className="text-[10.5px] text-[var(--tk-dim)]">
              base sha · head sha · rates_version 2026-05-08
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="mb-2 text-[11.5px] text-[var(--tk-fg)]">
              <span className="text-[var(--tk-dim)]">Δ total · </span>
              <span
                className={
                  totalDeltaCost > 0
                    ? 'text-[var(--tk-red)]'
                    : totalDeltaCost < 0
                      ? 'text-[var(--tk-green)]'
                      : 'text-[var(--tk-fg)]'
                }
              >
                {formatDeltaCost(totalDeltaCost)} · {formatDeltaTokens(totalDeltaTokens)} tokens
              </span>
            </p>
            {rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-[var(--tk-rule)] text-[10px] uppercase tracking-[0.25em] text-[var(--tk-dim)]">
                      <th className="px-2 py-1.5 text-left font-normal">file</th>
                      <th className="px-2 py-1.5 text-left font-normal">model</th>
                      <th className="px-2 py-1.5 text-left font-normal">format</th>
                      <th className="px-2 py-1.5 text-right font-normal">base</th>
                      <th className="px-2 py-1.5 text-right font-normal">head</th>
                      <th className="px-2 py-1.5 text-right font-normal">Δ tokens</th>
                      <th className="px-2 py-1.5 text-right font-normal">Δ usd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const dT = r.headTokens - r.baseTokens;
                      const dC = r.headCost - r.baseCost;
                      return (
                        <tr
                          key={`${r.model}-${r.format}-${i}`}
                          className="border-t border-[var(--tk-rule)]/60"
                        >
                          <td className="px-2 py-1 text-[var(--tk-dim)]">{fakeFile}</td>
                          <td className="px-2 py-1 text-[var(--tk-fg)]">{r.model}</td>
                          <td className="px-2 py-1 text-[var(--tk-dim)]">{r.format}</td>
                          <td className="px-2 py-1 text-right tabular-nums text-[var(--tk-fg)]">
                            {r.baseTokens.toLocaleString()}
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums text-[var(--tk-fg)]">
                            {r.headTokens.toLocaleString()}
                          </td>
                          <td
                            className={
                              dT > 0
                                ? 'px-2 py-1 text-right tabular-nums text-[var(--tk-red)]'
                                : dT < 0
                                  ? 'px-2 py-1 text-right tabular-nums text-[var(--tk-green)]'
                                  : 'px-2 py-1 text-right tabular-nums text-[var(--tk-fg)]'
                            }
                          >
                            {formatDeltaTokens(dT)}
                          </td>
                          <td
                            className={
                              dC > 0
                                ? 'px-2 py-1 text-right tabular-nums text-[var(--tk-red)]'
                                : dC < 0
                                  ? 'px-2 py-1 text-right tabular-nums text-[var(--tk-green)]'
                                  : 'px-2 py-1 text-right tabular-nums text-[var(--tk-fg)]'
                            }
                          >
                            {formatDeltaCost(dC)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[12px] text-[var(--tk-dim)]">
                pick at least one model and format to see the diff preview.
              </p>
            )}
          </div>
        </div>
        <p className="mt-3 text-[11px] text-[var(--tk-dim)]">
          The actual GitHub Action posts this on every PR that touches a tracked path. See{' '}
          <a
            href="https://github.com/faraa2m/tokenometer#github-action"
            className="underline decoration-[var(--tk-amber-dim)] underline-offset-4"
          >
            github.com/faraa2m/tokenometer
          </a>{' '}
          for setup.
        </p>
      </div>
    </section>
  );
};
