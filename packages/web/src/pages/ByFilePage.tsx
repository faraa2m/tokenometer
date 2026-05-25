import { allFormats, getModel, tokenize } from '@tokenometer/core/browser';
import type { Format, Provider } from '@tokenometer/core/browser';
import { useMemo, useState } from 'react';
import { usePageTitle } from '../hooks/usePageTitle.js';

const ALL_FORMATS: readonly Format[] = allFormats();

interface FileEntry {
  name: string;
  content: string;
  size: number;
}

const formatCost = (usd: number): string => {
  if (usd >= 0.01) return `$${usd.toFixed(4)}`;
  if (usd >= 0.000001) return `$${usd.toFixed(6)}`;
  return `$${usd.toExponential(2)}`;
};

interface FileRow {
  name: string;
  size: number;
  tokens: number;
  cost: number;
  provider: Provider;
}

export const ByFilePage = () => {
  usePageTitle('by-file', 'rank prompts by per-file cost');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [modelId, setModelId] = useState('claude-sonnet-4-6');
  const [format, setFormat] = useState<Format>('text');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const onPick = async (list: FileList | null) => {
    if (!list) return;
    setError(null);
    const next: FileEntry[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list.item(i);
      if (!f) continue;
      // Only accept text-ish files (.md, .txt, .yml, .yaml, .json, .xml). Skip
      // arbitrary binaries — tokenization would be meaningless.
      if (!/\.(md|markdown|txt|yml|yaml|json|xml|prompt)$/i.test(f.name)) continue;
      try {
        const text = await f.text();
        next.push({ content: text, name: f.name, size: text.length });
      } catch (e) {
        setError(`could not read ${f.name}: ${(e as Error).message.toLowerCase()}`);
      }
    }
    if (!next.length) {
      setError('no readable .md/.txt/.yml/.json/.xml files in selection');
      return;
    }
    setFiles(next);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dt = e.dataTransfer;
    if (dt?.files) onPick(dt.files);
  };

  const rows: FileRow[] = useMemo(() => {
    if (!files.length) return [];
    let model: ReturnType<typeof getModel>;
    try {
      model = getModel(modelId);
    } catch {
      return [];
    }
    return files
      .map((f) => {
        try {
          const r = tokenize({ format, modelId, prompt: f.content });
          return {
            cost: r.inputCost,
            name: f.name,
            provider: model.provider,
            size: f.size,
            tokens: r.inputTokens,
          };
        } catch {
          return null;
        }
      })
      .filter((x): x is FileRow => x !== null)
      .sort((a, b) => b.cost - a.cost);
  }, [files, modelId, format]);

  const totalCost = rows.reduce((acc, r) => acc + r.cost, 0);
  const totalTokens = rows.reduce((acc, r) => acc + r.tokens, 0);

  return (
    <section className="space-y-8 py-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
          ›by-file · per-file cost ranking
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">by-file</h1>
        <p className="mt-2 max-w-3xl text-[12.5px] text-[var(--tk-dim)]">
          Drop a folder of prompt files (or pick individual `.md` / `.txt` / `.yml`). We tokenize
          each, sort by cost, and show what's eating your budget. The CLI does the same thing across
          `paths:` in `.tokenometer.yml`.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-x-6 gap-y-6">
        <div className="col-span-12 lg:col-span-7">
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
            01 ›files
          </p>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={
              dragOver
                ? 'block cursor-pointer border border-dashed border-[var(--tk-amber)] bg-[var(--tk-cell)] p-8 text-center'
                : 'block cursor-pointer border border-dashed border-[var(--tk-rule)] bg-[var(--tk-cell)] p-8 text-center hover:border-[var(--tk-amber-dim)]'
            }
          >
            <input
              type="file"
              multiple
              accept=".md,.markdown,.txt,.yml,.yaml,.json,.xml,.prompt"
              onChange={(e) => onPick(e.target.files)}
              className="hidden"
            />
            <p className="text-[12.5px] text-[var(--tk-fg)]">
              {dragOver ? '> drop files' : '> click or drag .md / .txt / .yml files here'}
            </p>
            <p className="mt-1 text-[10.5px] text-[var(--tk-dim)]">
              processed in-browser. nothing is uploaded.
            </p>
          </label>
          {error && <p className="mt-2 text-[11.5px] text-[var(--tk-red)]">err: {error}</p>}
        </div>
        <div className="col-span-12 lg:col-span-5 space-y-4">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
              02 ›model
            </p>
            <input
              type="text"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              spellCheck={false}
              className="block w-full border border-[var(--tk-rule)] bg-[var(--tk-cell)] px-2 py-1.5 text-[12px] text-[var(--tk-fg)] focus:border-[var(--tk-amber)] focus:outline-none"
            />
          </div>
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
              03 ›format
            </p>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as Format)}
              className="block w-full border border-[var(--tk-rule)] bg-[var(--tk-cell)] px-2 py-1.5 text-[12px] text-[var(--tk-fg)] focus:border-[var(--tk-amber)] focus:outline-none"
            >
              {ALL_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {rows.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
            04 › results · {rows.length} files · {totalTokens.toLocaleString()} tokens ·{' '}
            {formatCost(totalCost)}
          </p>
          <div className="overflow-x-auto border border-[var(--tk-rule)]">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--tk-rule)] text-[10px] uppercase tracking-[0.25em] text-[var(--tk-dim)]">
                  <th className="px-3 py-2 text-left font-normal">rank</th>
                  <th className="px-3 py-2 text-left font-normal">file</th>
                  <th className="px-3 py-2 text-right font-normal">size</th>
                  <th className="px-3 py-2 text-right font-normal">tokens</th>
                  <th className="px-3 py-2 text-right font-normal">cost</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.name} className="border-t border-[var(--tk-rule)]/60">
                    <td className="px-3 py-1.5 tabular-nums text-[var(--tk-dim)]">
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td className="px-3 py-1.5 text-[var(--tk-fg)]">{r.name}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-[var(--tk-dim)]">
                      {r.size.toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-[var(--tk-fg)]">
                      {r.tokens.toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-[var(--tk-fg)]">
                      {formatCost(r.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
