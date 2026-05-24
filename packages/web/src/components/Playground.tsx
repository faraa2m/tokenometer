import {
  KNOWN_MODELS,
  allFormats,
  getModel,
  tokenizeMatrix,
  tokenizeMatrixEmpirical,
} from '@tokenometer/core';
import type { Format, Provider, TokenizeResult } from '@tokenometer/core';
import { useMemo, useState } from 'react';
import { ResultsMatrix } from './ResultsMatrix.js';

const DEFAULT_MODELS = ['claude-opus-4-7', 'claude-sonnet-4-6', 'gpt-4o'] as const;
const ALL_FORMATS: readonly Format[] = allFormats();
// Listed providers come first; any extras (e.g. mistral, cohere) are appended.
const PROVIDER_ORDER: readonly Provider[] = ['anthropic', 'openai', 'google'];
const MODEL_RESULT_LIMIT = 7;

const formatContextWindow = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${n}`;
};

interface PlaygroundProps {
  initialPrompt: string;
}

const Selector = ({
  active,
  label,
  onToggle,
}: {
  active: boolean;
  label: string;
  onToggle: () => void;
}) => (
  <button
    type="button"
    onClick={onToggle}
    className={
      active
        ? 'inline-flex items-center gap-1 border border-[var(--tk-amber)] bg-[var(--tk-amber)] px-2 py-[3px] text-[11px] text-[var(--tk-bg)]'
        : 'inline-flex items-center gap-1 border border-[var(--tk-rule)] px-2 py-[3px] text-[11px] text-[var(--tk-dim)] hover:border-[var(--tk-amber)] hover:text-[var(--tk-amber)]'
    }
  >
    <span aria-hidden="true">{active ? '[x]' : '[ ]'}</span>
    <span>{label}</span>
  </button>
);

const SelectedModel = ({ id, onRemove }: { id: string; onRemove: () => void }) => {
  const model = getModel(id);
  return (
    <button
      type="button"
      onClick={onRemove}
      className="group flex w-full items-center justify-between gap-3 rounded border border-[var(--tk-rule)] bg-[var(--tk-cell)] px-3 py-2 text-left hover:border-[var(--tk-amber)]"
    >
      <span>
        <span className="block text-[12px] text-[var(--tk-fg)]">{id}</span>
        <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--tk-dim)]">
          {model.provider}
          {model.contextWindow ? ` · ${formatContextWindow(model.contextWindow)}` : ''}
        </span>
      </span>
      <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--tk-dim)] group-hover:text-[var(--tk-red)]">
        remove
      </span>
    </button>
  );
};

const Field = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div>
    <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">{label}</p>
    {children}
  </div>
);

interface ModelOption {
  id: string;
  label: string;
}

const buildModelGroups = (): { provider: Provider; models: ModelOption[] }[] => {
  const grouped = new Map<Provider, ModelOption[]>();
  for (const id of KNOWN_MODELS) {
    const m = getModel(id);
    const ctx = m.contextWindow ? ` · ${formatContextWindow(m.contextWindow)}` : '';
    const list = grouped.get(m.provider) ?? [];
    list.push({ id, label: `${id}${ctx}` });
    grouped.set(m.provider, list);
  }
  // Sort listed providers in PROVIDER_ORDER first, then append any unlisted ones.
  const listed = PROVIDER_ORDER.filter((p) => grouped.has(p));
  const extras = [...grouped.keys()].filter((p) => !PROVIDER_ORDER.includes(p)).sort();
  return [...listed, ...extras].map((provider) => ({
    models: grouped.get(provider) ?? [],
    provider,
  }));
};

export const Playground = ({ initialPrompt }: PlaygroundProps) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const modelGroups = useMemo(() => buildModelGroups(), []);
  const allModels = useMemo(() => modelGroups.flatMap(({ models }) => models), [modelGroups]);
  const [selectedModels, setSelectedModels] = useState<string[]>([...DEFAULT_MODELS]);
  const [selectedFormats, setSelectedFormats] = useState<Format[]>([...ALL_FORMATS]);
  const [providerFilter, setProviderFilter] = useState<Provider | 'all'>('all');
  const [modelQuery, setModelQuery] = useState('');
  const [empirical, setEmpirical] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [results, setResults] = useState<TokenizeResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleModel = (id: string) =>
    setSelectedModels((p) => (p.includes(id) ? p.filter((m) => m !== id) : [...p, id]));
  const addModel = (id: string) => setSelectedModels((p) => (p.includes(id) ? p : [...p, id]));
  const toggleFormat = (f: Format) =>
    setSelectedFormats((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));

  const matchingModels = useMemo(() => {
    const query = modelQuery.trim().toLowerCase();
    return allModels
      .filter(({ id }) => {
        const model = getModel(id);
        if (providerFilter !== 'all' && model.provider !== providerFilter) return false;
        if (!query) return true;
        return `${id} ${model.provider}`.toLowerCase().includes(query);
      })
      .filter(({ id }) => !selectedModels.includes(id))
      .slice(0, MODEL_RESULT_LIMIT);
  }, [allModels, modelQuery, providerFilter, selectedModels]);

  const run = async () => {
    if (!prompt.trim()) return setError('empty prompt - paste something to measure');
    if (!selectedModels.length || !selectedFormats.length)
      return setError('pick at least one model and one format');
    setError(null);
    setLoading(true);
    try {
      const out = empirical
        ? await tokenizeMatrixEmpirical({
            env: {
              ...(anthropicKey ? { anthropicApiKey: anthropicKey } : {}),
              ...(googleKey ? { googleApiKey: googleKey } : {}),
            },
            formats: selectedFormats,
            modelIds: selectedModels,
            prompt,
          })
        : tokenizeMatrix({
            formats: selectedFormats,
            modelIds: selectedModels,
            prompt,
          });
      setResults(out);
    } catch (err) {
      setError((err as Error).message.toLowerCase());
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="grid grid-cols-12 gap-x-6 gap-y-8 py-10">
      <div className="col-span-12 lg:col-span-8">
        <Field label="01 ›prompt">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={10}
            spellCheck={false}
            className="block w-full resize-y border border-[var(--tk-rule)] bg-[var(--tk-cell)] p-4 text-[12.5px] leading-[1.65] text-[var(--tk-fg)] focus:border-[var(--tk-amber)] focus:outline-none"
          />
          <p className="mt-2 text-[10px] text-[var(--tk-dim)]">
            {prompt.length.toLocaleString()} chars · {prompt.split('\n').length} lines
          </p>
        </Field>
      </div>

      <div className="col-span-12 lg:col-span-4 space-y-5">
        <div className="tk-panel sticky top-4 z-[1] rounded-md p-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={run}
              disabled={loading}
              className="rounded-full border border-[var(--tk-amber)] bg-[var(--tk-amber)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--tk-bg)] hover:bg-transparent hover:text-[var(--tk-amber)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? '> measuring' : '> measure'}
            </button>
            <p className="text-[10.5px] leading-5 text-[var(--tk-dim)]">
              {selectedModels.length} models · {selectedFormats.length} formats
            </p>
          </div>
          {error && <p className="mt-3 text-[11.5px] text-[var(--tk-red)]">err: {error}</p>}
        </div>

        <Field label="02 ›guided model search">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value as Provider | 'all')}
                className="rounded border border-[var(--tk-rule)] bg-[var(--tk-cell)] px-3 py-2 text-[12px] text-[var(--tk-fg)] focus:border-[var(--tk-amber)] focus:outline-none"
              >
                <option value="all">all providers</option>
                {modelGroups.map(({ provider }) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
              <input
                value={modelQuery}
                onChange={(e) => setModelQuery(e.target.value)}
                className="rounded border border-[var(--tk-rule)] bg-[var(--tk-cell)] px-3 py-2 text-[12px] text-[var(--tk-fg)] focus:border-[var(--tk-amber)] focus:outline-none"
                placeholder="search model"
                spellCheck={false}
              />
            </div>

            <div className="space-y-2">
              <p className="text-[9.5px] uppercase tracking-[0.28em] text-[var(--tk-dim)]">
                selected
              </p>
              {selectedModels.map((id) => (
                <SelectedModel key={id} id={id} onRemove={() => toggleModel(id)} />
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-[9.5px] uppercase tracking-[0.28em] text-[var(--tk-dim)]">
                add model
              </p>
              <div className="grid gap-2">
                {matchingModels.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => addModel(id)}
                    className="flex items-center justify-between gap-3 rounded border border-[var(--tk-rule)] px-3 py-2 text-left text-[12px] text-[var(--tk-dim)] hover:border-[var(--tk-amber)] hover:text-[var(--tk-amber)]"
                  >
                    <span>{label}</span>
                    <span className="text-[10px] uppercase tracking-[0.18em]">add</span>
                  </button>
                ))}
                {!matchingModels.length && (
                  <p className="rounded border border-dashed border-[var(--tk-rule)] px-3 py-3 text-[11px] text-[var(--tk-dim)]">
                    No more matching models.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Field>

        <Field label="03 ›formats">
          <div className="flex flex-wrap gap-2">
            {ALL_FORMATS.map((f) => (
              <Selector
                key={f}
                active={selectedFormats.includes(f)}
                label={f}
                onToggle={() => toggleFormat(f)}
              />
            ))}
          </div>
        </Field>

        <Field label="04 ›empirical">
          <label className="flex items-start gap-2 text-[11.5px] text-[var(--tk-fg)]">
            <input
              type="checkbox"
              checked={empirical}
              onChange={(e) => setEmpirical(e.target.checked)}
              className="mt-[3px] h-3 w-3 cursor-pointer accent-[var(--tk-amber)]"
            />
            <span className="leading-snug text-[var(--tk-dim)]">
              Hit provider <span className="text-[var(--tk-fg)]">countTokens</span> endpoints.
              BYO-key. Browser-direct. Free. Some Anthropic orgs disable browser CORS — fall back to
              the CLI if you hit it.
            </span>
          </label>
          {empirical && (
            <div className="mt-3 space-y-2">
              <label className="block">
                <span className="block text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
                  ANTHROPIC_API_KEY
                </span>
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="mt-1 block w-full border border-[var(--tk-rule)] bg-[var(--tk-cell)] px-2 py-1 text-[11.5px] focus:border-[var(--tk-amber)] focus:outline-none"
                  placeholder="sk-ant-..."
                />
              </label>
              <label className="block">
                <span className="block text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
                  GOOGLE_API_KEY
                </span>
                <input
                  type="password"
                  value={googleKey}
                  onChange={(e) => setGoogleKey(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="mt-1 block w-full border border-[var(--tk-rule)] bg-[var(--tk-cell)] px-2 py-1 text-[11.5px] focus:border-[var(--tk-amber)] focus:outline-none"
                  placeholder="AIza..."
                />
              </label>
            </div>
          )}
        </Field>

        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="w-full rounded-full border border-[var(--tk-amber)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--tk-amber)] hover:bg-[var(--tk-amber)] hover:text-[var(--tk-bg)] disabled:cursor-not-allowed disabled:opacity-60 lg:hidden"
        >
          {loading ? '> measuring' : '> measure'}
        </button>
      </div>

      {results && results.length > 0 && (
        <div className="col-span-12">
          <ResultsMatrix empirical={empirical} results={results} />
        </div>
      )}
    </section>
  );
};
