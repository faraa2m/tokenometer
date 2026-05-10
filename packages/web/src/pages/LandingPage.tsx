import { Playground } from '../components/Playground.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

const SAMPLE_PROMPT = `{
  "instructions": "Summarize the user's input in three bullets.",
  "constraints": { "max_bullets": 3, "tone": "neutral" }
}`;

const SHELL_BANNER = [
  '$ tokenometer --version',
  'tokenometer 0.0.2   rates_version=2026-05-08',
  '',
  '$ tokenometer --help',
  '  measure: empirical token cost across providers and formats.',
  '  policy:  no telemetry, no key persistence, BYO-API-key for empirical mode.',
  '  source:  github.com/faraa2m/tokenometer',
];

export const LandingPage = () => {
  usePageTitle('calculator', 'paste a prompt, see the cost');
  return (
    <>
      <section className="grid grid-cols-12 gap-x-6 border-b border-[var(--tk-rule)] py-8 sm:py-10">
        <div className="col-span-12">
          <pre className="whitespace-pre-wrap text-[12.5px] leading-[1.7] text-[var(--tk-fg)]">
            {SHELL_BANNER.join('\n')}
          </pre>
          <p className="mt-3 text-[12.5px] tk-cursor text-[var(--tk-amber)]">
            $ tokenometer measure
          </p>
        </div>
      </section>

      <Playground initialPrompt={SAMPLE_PROMPT} />
    </>
  );
};
