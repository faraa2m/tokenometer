import { Playground } from './components/Playground.js';

const SAMPLE_PROMPT = `{
  "instructions": "Summarize the user's input in three bullets.",
  "constraints": { "max_bullets": 3, "tone": "neutral" }
}`;

export const App = () => (
  <div className="min-h-full">
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto max-w-5xl px-6 py-8 sm:py-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange-700 dark:text-orange-400">
          Tokenometer · v0
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">
          Paste a prompt.
          <br />
          See what it <em className="text-orange-700 dark:text-orange-400">actually</em> costs.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-black/70 dark:text-white/70">
          Empirical token-cost benchmarking across Claude, GPT-4o, and Gemini, in every format.
          Built on real provider tokenizers — never an approximation.{' '}
          <a
            href="https://github.com/faraa2m/tokenometer"
            className="underline decoration-orange-700 underline-offset-4 hover:text-orange-700 dark:decoration-orange-400 dark:hover:text-orange-400"
          >
            Open source
          </a>
          .
        </p>
      </div>
    </header>
    <main className="mx-auto max-w-5xl px-6 py-8 sm:py-12">
      <Playground initialPrompt={SAMPLE_PROMPT} />
    </main>
    <footer className="border-t border-black/10 px-6 py-8 text-sm text-black/60 dark:border-white/10 dark:text-white/60">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Made for the{' '}
          <a
            href="https://hackernoon.com/c/proof-of-usefulness-hackathon"
            className="underline underline-offset-4 hover:text-orange-700 dark:hover:text-orange-400"
          >
            HackerNoon Proof of Usefulness
          </a>{' '}
          hackathon.
        </p>
        <p className="font-mono text-xs">
          <a
            href="https://github.com/faraa2m/tokenometer"
            className="hover:text-orange-700 dark:hover:text-orange-400"
          >
            github.com/faraa2m/tokenometer
          </a>
        </p>
      </div>
    </footer>
  </div>
);
