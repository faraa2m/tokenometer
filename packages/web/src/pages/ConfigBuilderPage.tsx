import { KNOWN_MODELS, allFormats, getModel, parseConfig } from '@tokenometer/core/browser';
import type { Format, Provider } from '@tokenometer/core/browser';
import { useMemo, useState } from 'react';
import { CodeBlock } from '../components/CodeBlock.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

const PROVIDER_ORDER: readonly Provider[] = ['anthropic', 'openai', 'google'];
const ALL_FORMATS: readonly Format[] = allFormats();

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

interface BuildOptions {
  models: string[];
  formats: Format[];
  pathsRaw: string;
  totalBudget: string;
  perFileBudget: string;
}

const buildYaml = ({
  models,
  formats,
  pathsRaw,
  totalBudget,
  perFileBudget,
}: BuildOptions): string => {
  const lines: string[] = [];
  lines.push('# .tokenometer.yml');
  lines.push('# generated from https://tokenometer.dev/config-builder');
  lines.push('');
  if (models.length > 0) {
    lines.push('models:');
    for (const m of models) lines.push(`  - ${m}`);
    lines.push('');
  }
  if (formats.length > 0) {
    lines.push('formats:');
    for (const f of formats) lines.push(`  - ${f}`);
    lines.push('');
  }
  const total = totalBudget.trim();
  const perFile = perFileBudget.trim();
  if (total || perFile) {
    lines.push('budgets:');
    if (total) lines.push(`  total: ${total}`);
    if (perFile) lines.push(`  per-file: ${perFile}`);
    lines.push('');
  }
  const paths = pathsRaw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (paths.length > 0) {
    lines.push('paths:');
    for (const p of paths) lines.push(`  - ${p}`);
    lines.push('');
  }
  return lines.join('\n');
};

export const ConfigBuilderPage = () => {
  usePageTitle('config builder', '.tokenometer.yml generator');
  const modelGroups = useMemo(() => buildModelGroups(), []);
  const [models, setModels] = useState<string[]>(['claude-sonnet-4-6', 'gpt-4o']);
  const [formats, setFormats] = useState<Format[]>(['text', 'markdown']);
  const [pathsRaw, setPathsRaw] = useState('prompts/**/*.md');
  const [totalBudget, setTotalBudget] = useState('5');
  const [perFileBudget, setPerFileBudget] = useState('0.05');

  const yaml = useMemo(
    () => buildYaml({ formats, models, pathsRaw, perFileBudget, totalBudget }),
    [models, formats, pathsRaw, totalBudget, perFileBudget],
  );

  // Round-trip the generated YAML through parseConfig so the shown error mirrors
  // what a real user would see if their hand-written config were broken.
  const parseError = useMemo(() => {
    try {
      parseConfig(yaml);
      return null;
    } catch (e) {
      return (e as Error).message.toLowerCase();
    }
  }, [yaml]);

  const toggleModel = (id: string) =>
    setModels((p) => (p.includes(id) ? p.filter((m) => m !== id) : [...p, id]));
  const toggleFormat = (f: Format) =>
    setFormats((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));

  return (
    <section className="space-y-8 py-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
          ›config builder · .tokenometer.yml
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">config builder</h1>
        <p className="mt-2 max-w-3xl text-[12.5px] text-[var(--tk-dim)]">
          Pick models, formats, paths, and budgets. We render a copy-paste-ready{' '}
          <code className="text-[var(--tk-fg)]">.tokenometer.yml</code> validated by the same parser
          the CLI uses. Drop it at the repo root and `tokenometer measure` will pick it up.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-x-6 gap-y-6">
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
              01 ›models
            </p>
            <div className="space-y-3">
              {modelGroups.map(({ provider, models: m }) => (
                <div key={provider}>
                  <p className="mb-1.5 text-[9.5px] uppercase tracking-[0.28em] text-[var(--tk-dim)]">
                    {provider}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {m.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleModel(id)}
                        className={
                          models.includes(id)
                            ? 'border border-[var(--tk-amber)] bg-[var(--tk-amber)] px-2 py-[3px] text-[11px] text-[var(--tk-bg)]'
                            : 'border border-[var(--tk-rule)] px-2 py-[3px] text-[11px] text-[var(--tk-dim)] hover:border-[var(--tk-amber)] hover:text-[var(--tk-amber)]'
                        }
                      >
                        {models.includes(id) ? '[x] ' : '[ ] '}
                        {id}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
              02 ›formats
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFormat(f)}
                  className={
                    formats.includes(f)
                      ? 'border border-[var(--tk-amber)] bg-[var(--tk-amber)] px-2 py-[3px] text-[11px] text-[var(--tk-bg)]'
                      : 'border border-[var(--tk-rule)] px-2 py-[3px] text-[11px] text-[var(--tk-dim)] hover:border-[var(--tk-amber)] hover:text-[var(--tk-amber)]'
                  }
                >
                  {formats.includes(f) ? '[x] ' : '[ ] '}
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-5 space-y-4">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
              03 ›paths (comma-separated globs)
            </p>
            <input
              type="text"
              value={pathsRaw}
              onChange={(e) => setPathsRaw(e.target.value)}
              spellCheck={false}
              className="block w-full border border-[var(--tk-rule)] bg-[var(--tk-cell)] px-2 py-1.5 text-[12px] text-[var(--tk-fg)] focus:border-[var(--tk-amber)] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
                04 ›total budget ($)
              </p>
              <input
                type="text"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                spellCheck={false}
                className="block w-full border border-[var(--tk-rule)] bg-[var(--tk-cell)] px-2 py-1.5 text-[12px] text-[var(--tk-fg)] focus:border-[var(--tk-amber)] focus:outline-none"
              />
            </div>
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
                05 ›per-file ($)
              </p>
              <input
                type="text"
                value={perFileBudget}
                onChange={(e) => setPerFileBudget(e.target.value)}
                spellCheck={false}
                className="block w-full border border-[var(--tk-rule)] bg-[var(--tk-cell)] px-2 py-1.5 text-[12px] text-[var(--tk-fg)] focus:border-[var(--tk-amber)] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
          06 › yaml output
        </p>
        <CodeBlock code={yaml} filename=".tokenometer.yml" language="yaml" />
        {parseError ? (
          <p className="mt-2 text-[11.5px] text-[var(--tk-red)]">err: {parseError}</p>
        ) : (
          <p className="mt-2 text-[11.5px] text-[var(--tk-green)]">ok · validated by parseConfig</p>
        )}
      </div>
    </section>
  );
};
