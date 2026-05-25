import { KNOWN_MODELS, allFormats, getModel } from '@tokenometer/core/browser';
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
  totalBudget: string;
  paths: string;
}

const buildWorkflow = ({ models, formats, totalBudget, paths }: BuildOptions): string => {
  const modelsCsv = models.join(',');
  const formatsCsv = formats.join(',');
  return `name: prompt-cost
on:
  pull_request:
    paths:
${paths
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean)
  .map((p) => `      - '${p}'`)
  .join('\n')}

permissions:
  contents: read
  pull-requests: write
  # for SARIF upload to Code Scanning, also enable: security-events: write

jobs:
  cost:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: faraa2m/tokenometer/packages/action@v1
        with:
          paths: '${paths}'
          models: '${modelsCsv}'
          formats: '${formatsCsv}'
          budget: '${totalBudget}'
          # top-n-files: '5'      # how many files to highlight in the sticky comment
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;
};

export const InitPage = () => {
  usePageTitle('init', '.github/workflows generator');
  const modelGroups = useMemo(() => buildModelGroups(), []);
  const [models, setModels] = useState<string[]>(['claude-sonnet-4-6', 'gpt-4o']);
  const [formats, setFormats] = useState<Format[]>(['text']);
  const [totalBudget, setTotalBudget] = useState('5');
  const [paths, setPaths] = useState('prompts/**/*.md');

  const yaml = useMemo(
    () => buildWorkflow({ formats, models, paths, totalBudget }),
    [models, formats, totalBudget, paths],
  );

  const toggleModel = (id: string) =>
    setModels((p) => (p.includes(id) ? p.filter((m) => m !== id) : [...p, id]));
  const toggleFormat = (f: Format) =>
    setFormats((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));

  return (
    <section className="space-y-8 py-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
          ›init · github workflow generator
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">init</h1>
        <p className="mt-2 max-w-3xl text-[12.5px] text-[var(--tk-dim)]">
          Pick what to track. We render a copy-paste-ready{' '}
          <code className="text-[var(--tk-fg)]">.github/workflows/prompt-cost.yml</code>. Drop it in
          your repo, push, and every PR that touches a tracked path gets a sticky token-cost
          comment.
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
              value={paths}
              onChange={(e) => setPaths(e.target.value)}
              spellCheck={false}
              className="block w-full border border-[var(--tk-rule)] bg-[var(--tk-cell)] px-2 py-1.5 text-[12px] text-[var(--tk-fg)] focus:border-[var(--tk-amber)] focus:outline-none"
            />
          </div>
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
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
          05 › workflow yaml
        </p>
        <CodeBlock code={yaml} filename=".github/workflows/prompt-cost.yml" language="yaml" />
        <p className="mt-3 text-[11px] text-[var(--tk-dim)]">
          See full input docs at{' '}
          <a
            href="https://github.com/faraa2m/tokenometer/tree/main/packages/action#readme"
            className="underline decoration-[var(--tk-amber-dim)] underline-offset-4"
          >
            github.com/faraa2m/tokenometer/tree/main/packages/action
          </a>
          .
        </p>
      </div>
    </section>
  );
};
