import {
  KNOWN_MODELS,
  allFormats,
  tokenizeMatrix,
  tokenizeMatrixEmpirical,
} from '@tokenometer/core';
import type { Format, TokenizeResult } from '@tokenometer/core';
import { useState } from 'react';
import { ResultsMatrix } from './ResultsMatrix.js';

const DEFAULT_MODELS = ['claude-opus-4-7', 'claude-sonnet-4-6', 'gpt-4o'] as const;
const ALL_FORMATS: readonly Format[] = allFormats();

interface PlaygroundProps {
  initialPrompt: string;
}

export const Playground = ({ initialPrompt }: PlaygroundProps) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedModels, setSelectedModels] = useState<string[]>([...DEFAULT_MODELS]);
  const [selectedFormats, setSelectedFormats] = useState<Format[]>([...ALL_FORMATS]);
  const [empirical, setEmpirical] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [results, setResults] = useState<TokenizeResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleModel = (id: string) => {
    setSelectedModels((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };
  const toggleFormat = (f: Format) => {
    setSelectedFormats((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const run = async () => {
    if (!prompt.trim()) {
      setError('Empty prompt — paste something to measure.');
      return;
    }
    if (selectedModels.length === 0 || selectedFormats.length === 0) {
      setError('Pick at least one model and one format.');
      return;
    }
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
      setError((err as Error).message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <label
          htmlFor="prompt"
          className="block font-mono text-xs uppercase tracking-[0.2em] text-black/60 dark:text-white/60"
        >
          Prompt
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={8}
          spellCheck={false}
          className="w-full resize-y rounded-lg border border-black/10 bg-white p-4 font-mono text-sm leading-relaxed shadow-sm focus:border-orange-700 focus:outline-none focus:ring-1 focus:ring-orange-700 dark:border-white/10 dark:bg-black/30 dark:focus:border-orange-400 dark:focus:ring-orange-400"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <fieldset className="space-y-3">
          <legend className="font-mono text-xs uppercase tracking-[0.2em] text-black/60 dark:text-white/60">
            Models
          </legend>
          <div className="flex flex-wrap gap-2">
            {KNOWN_MODELS.map((id) => {
              const active = selectedModels.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleModel(id)}
                  className={
                    active
                      ? 'rounded-full border border-orange-700 bg-orange-700 px-3 py-1 font-mono text-xs text-white dark:border-orange-400 dark:bg-orange-400 dark:text-black'
                      : 'rounded-full border border-black/15 px-3 py-1 font-mono text-xs text-black/70 hover:border-orange-700 hover:text-orange-700 dark:border-white/15 dark:text-white/70 dark:hover:border-orange-400 dark:hover:text-orange-400'
                  }
                >
                  {id}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-mono text-xs uppercase tracking-[0.2em] text-black/60 dark:text-white/60">
            Formats
          </legend>
          <div className="flex flex-wrap gap-2">
            {ALL_FORMATS.map((f) => {
              const active = selectedFormats.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFormat(f)}
                  className={
                    active
                      ? 'rounded-full border border-orange-700 bg-orange-700 px-3 py-1 font-mono text-xs text-white dark:border-orange-400 dark:bg-orange-400 dark:text-black'
                      : 'rounded-full border border-black/15 px-3 py-1 font-mono text-xs text-black/70 hover:border-orange-700 hover:text-orange-700 dark:border-white/15 dark:text-white/70 dark:hover:border-orange-400 dark:hover:text-orange-400'
                  }
                >
                  {f}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="space-y-4 rounded-lg border border-dashed border-black/15 p-4 dark:border-white/15">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={empirical}
            onChange={(e) => setEmpirical(e.target.checked)}
            className="mt-1 h-4 w-4 cursor-pointer accent-orange-700 dark:accent-orange-400"
          />
          <span className="space-y-1">
            <span className="block font-mono text-xs uppercase tracking-[0.2em] text-black/60 dark:text-white/60">
              Empirical mode
            </span>
            <span className="block text-sm text-black/70 dark:text-white/70">
              Send your own keys directly to Anthropic / Google to fetch <em>real</em> token counts
              via their <code>countTokens</code> APIs. Keys never leave your browser. countTokens is
              free.
            </span>
          </span>
        </label>
        {empirical && (
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="password"
              placeholder="ANTHROPIC_API_KEY (optional)"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="rounded-md border border-black/10 bg-white px-3 py-2 font-mono text-xs focus:border-orange-700 focus:outline-none dark:border-white/10 dark:bg-black/30 dark:focus:border-orange-400"
            />
            <input
              type="password"
              placeholder="GOOGLE_API_KEY (optional)"
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="rounded-md border border-black/10 bg-white px-3 py-2 font-mono text-xs focus:border-orange-700 focus:outline-none dark:border-white/10 dark:bg-black/30 dark:focus:border-orange-400"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="rounded-md bg-orange-700 px-5 py-2.5 font-mono text-sm font-medium text-white shadow-sm hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-orange-400 dark:text-black dark:hover:bg-orange-300"
        >
          {loading ? 'Measuring…' : 'Measure'}
        </button>
        {error && <p className="font-mono text-xs text-red-700 dark:text-red-400">{error}</p>}
      </div>

      {results && results.length > 0 && <ResultsMatrix results={results} />}
    </section>
  );
};
