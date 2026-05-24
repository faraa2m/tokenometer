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

const PROFILE_LINKS = [
  { label: 'github', href: 'https://github.com/faraa2m' },
  { label: 'linkedin', href: 'https://www.linkedin.com/in/faraazuddin-mohammed/' },
  { label: 'hackernoon', href: 'https://hackernoon.com/u/faraa2m' },
];

const ECOSYSTEM_PROJECTS = [
  {
    name: 'llm-tokens-atlas',
    href: 'https://github.com/faraa2m/llm-tokens-atlas',
    summary: 'open benchmark of LLM tokenization calibration across providers',
  },
  {
    name: 'Hugging Face dataset',
    href: 'https://huggingface.co/datasets/faraa2m/llm-tokens-atlas',
    summary: 'canonical public dataset behind the tokenization atlas',
  },
  {
    name: 'promptc',
    href: 'https://github.com/faraa2m/promptc',
    summary: 'deterministic compiler for cost-aware prompt optimization',
  },
  {
    name: 'routerlab',
    href: 'https://github.com/faraa2m/routerlab',
    summary: 'cost-quality routing for LLM APIs with reproducible Pareto frontiers',
  },
  {
    name: 'ast-ai-model-router',
    href: 'https://github.com/faraa2m/ast-ai-model-router',
    summary: 'AST-aware Claude and Codex model router for token-conscious coding agents',
  },
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

      <section className="border-t border-[var(--tk-rule)] py-8 sm:py-10">
        <div className="grid grid-cols-12 gap-x-6 gap-y-8">
          <div className="col-span-12 sm:col-span-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
              ›ecosystem
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight">
              More from Faraazuddin Mohammed
            </h2>
            <p className="mt-3 text-[12.5px] leading-6 text-[var(--tk-dim)]">
              Tokenometer is part of a focused open-source toolkit for LLM cost, tokenization,
              routing, and prompt optimization.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px]">
              {PROFILE_LINKS.map((link) => (
                <a
                  className="text-[var(--tk-fg)] underline decoration-[var(--tk-amber-dim)] underline-offset-4 hover:text-[var(--tk-amber)]"
                  href={link.href}
                  key={link.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div className="col-span-12 sm:col-span-8">
            <div className="grid gap-3 sm:grid-cols-2">
              {ECOSYSTEM_PROJECTS.map((project) => (
                <a
                  className="group block border border-[var(--tk-rule)] bg-[var(--tk-cell)] p-4 transition-colors hover:border-[var(--tk-amber-dim)]"
                  href={project.href}
                  key={project.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span className="text-[13px] font-bold text-[var(--tk-fg)] group-hover:text-[var(--tk-amber)]">
                    {project.name}
                  </span>
                  <span className="mt-2 block text-[12px] leading-5 text-[var(--tk-dim)]">
                    {project.summary}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
