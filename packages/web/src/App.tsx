import { Playground } from './components/Playground.js';

const SAMPLE_PROMPT = `{
  "instructions": "Summarize the user's input in three bullets.",
  "constraints": { "max_bullets": 3, "tone": "neutral" }
}`;

const SHELL_BANNER = [
  '$ tokenometer --version',
  'tokenometer 0.0.1   rates_version=2026-05-07',
  '',
  '$ tokenometer --help',
  '  measure: empirical token cost across providers and formats.',
  '  policy:  no telemetry, no key persistence, BYO-API-key for empirical mode.',
  '  source:  github.com/faraa2m/tokenometer',
];

export const App = () => (
  <div className="tk-crt min-h-full">
    <div className="mx-auto max-w-[78rem] px-6 sm:px-10">
      <header className="grid grid-cols-12 gap-x-6 border-b border-[var(--tk-rule)] py-8 sm:py-10">
        <div className="col-span-12 sm:col-span-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
            ›observatory
          </p>
          <p className="mt-2 text-xl font-bold tracking-tight">tokenometer</p>
          <p className="mt-1 text-[11px] text-[var(--tk-dim)]">v0.0.1 · MIT · 2026-05-07</p>
        </div>
        <div className="col-span-12 sm:col-span-9 mt-6 sm:mt-0">
          <pre className="whitespace-pre-wrap text-[12.5px] leading-[1.7] text-[var(--tk-fg)]">
            {SHELL_BANNER.join('\n')}
          </pre>
          <p className="mt-3 text-[12.5px] tk-cursor text-[var(--tk-amber)]">
            $ tokenometer measure
          </p>
        </div>
      </header>

      <Playground initialPrompt={SAMPLE_PROMPT} />

      <footer className="mt-12 grid grid-cols-12 gap-x-6 border-t border-[var(--tk-rule)] py-6 text-[11px] text-[var(--tk-dim)]">
        <div className="col-span-12 sm:col-span-7">
          <p>
            Built for{' '}
            <a
              className="text-[var(--tk-fg)] underline decoration-[var(--tk-amber-dim)] underline-offset-4"
              href="https://hackernoon.com/c/proof-of-usefulness-hackathon"
            >
              HackerNoon Proof of Usefulness
            </a>
            . No analytics. No keys captured. countTokens calls go straight from your browser to the
            provider.
          </p>
        </div>
        <div className="col-span-12 sm:col-span-5 mt-3 sm:mt-0 sm:text-right">
          <a
            className="text-[var(--tk-fg)] underline decoration-[var(--tk-amber-dim)] underline-offset-4"
            href="https://github.com/faraa2m/tokenometer"
          >
            github.com/faraa2m/tokenometer
          </a>
        </div>
      </footer>
    </div>
  </div>
);
