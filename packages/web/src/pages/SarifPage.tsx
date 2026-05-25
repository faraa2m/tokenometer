import { KNOWN_MODELS, allFormats, getModel, toSarif, tokenize } from '@tokenometer/core/browser';
import type { Format, Provider } from '@tokenometer/core/browser';
import { useMemo, useState } from 'react';
import { CodeBlock } from '../components/CodeBlock.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

const PROVIDER_ORDER: readonly Provider[] = ['anthropic', 'openai', 'google'];
const ALL_FORMATS: readonly Format[] = allFormats();

const SAMPLE_PROMPT = `You are a thoughtful reviewer. Read the diff and reply with
a JSON array of findings: [{ "file": "...", "line": 0, "severity": "low",
"message": "..." }]. Be precise.`;

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

export const SarifPage = () => {
  usePageTitle('sarif', 'live JSON for Code Scanning');
  const [prompt, setPrompt] = useState(SAMPLE_PROMPT);
  const [filePath, setFilePath] = useState('prompts/review.md');
  const modelGroups = useMemo(() => buildModelGroups(), []);
  const [selectedModels, setSelectedModels] = useState<string[]>(['claude-sonnet-4-6', 'gpt-4o']);
  const [selectedFormats, setSelectedFormats] = useState<Format[]>(['text', 'markdown']);

  const toggleModel = (id: string) =>
    setSelectedModels((p) => (p.includes(id) ? p.filter((m) => m !== id) : [...p, id]));
  const toggleFormat = (f: Format) =>
    setSelectedFormats((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));

  const sarif = useMemo(() => {
    if (!prompt.trim() || !selectedModels.length || !selectedFormats.length) return null;
    const cells = [];
    for (const modelId of selectedModels) {
      for (const format of selectedFormats) {
        try {
          cells.push(tokenize({ format, modelId, prompt }));
        } catch {
          // Unknown model id — silently skip; UI shows known list separately.
        }
      }
    }
    return toSarif(
      { files: [{ path: filePath || 'prompt.md', results: cells }] },
      { toolVersion: '0.0.2' },
    );
  }, [prompt, filePath, selectedModels, selectedFormats]);

  const json = sarif ? JSON.stringify(sarif, null, 2) : '';

  return (
    <section className="space-y-8 py-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
          ›sarif · github code scanning output
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">sarif</h1>
        <p className="mt-2 max-w-3xl text-[12.5px] text-[var(--tk-dim)]">
          Tokenometer can emit SARIF 2.1.0 for the Code Scanning tab. Paste a prompt, pick models +
          formats, and watch the JSON update live. The CLI's <span>--format sarif</span>
          produces this exact shape.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-x-6 gap-y-6">
        <div className="col-span-12 lg:col-span-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
            01 ›prompt
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={8}
            spellCheck={false}
            className="block w-full resize-y border border-[var(--tk-rule)] bg-[var(--tk-cell)] p-4 text-[12.5px] leading-[1.65] text-[var(--tk-fg)] focus:border-[var(--tk-amber)] focus:outline-none"
          />
          <p className="mt-3 mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
            02 ›file path
          </p>
          <input
            type="text"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            spellCheck={false}
            className="block w-full border border-[var(--tk-rule)] bg-[var(--tk-cell)] px-2 py-1.5 text-[12px] text-[var(--tk-fg)] focus:border-[var(--tk-amber)] focus:outline-none"
          />
        </div>
        <div className="col-span-12 lg:col-span-6 space-y-4">
          <div>
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
          <div>
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
      </div>

      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
          05 › sarif log
        </p>
        {json ? (
          <CodeBlock code={json} filename="tokenometer.sarif" language="json" />
        ) : (
          <p className="text-[12px] text-[var(--tk-dim)]">
            paste a prompt and pick a model + format to render SARIF.
          </p>
        )}
      </div>
    </section>
  );
};
