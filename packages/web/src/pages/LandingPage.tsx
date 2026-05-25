import { Suspense, lazy } from 'react';
import { usePageTitle } from '../hooks/usePageTitle.js';

const Playground = lazy(() =>
  import('../components/Playground.js').then((m) => ({ default: m.Playground })),
);

const SAMPLE_PROMPT = `{
  "instructions": "Summarize the user's input in three bullets.",
  "constraints": { "max_bullets": 3, "tone": "neutral" }
}`;

const METRICS = [
  { label: 'formats', value: '5' },
  { label: 'privacy', value: '0 keys stored' },
  { label: 'mode', value: 'offline + empirical' },
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
      <section className="grid grid-cols-12 gap-x-6 gap-y-8 border-b border-[var(--tk-rule)] py-9 sm:py-12">
        <div className="col-span-12 lg:col-span-7">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-blue)]">
            ›token cost calculator
          </p>
          <h1 className="tk-display mt-4 max-w-4xl text-5xl font-semibold leading-[0.92] tracking-normal text-[var(--tk-fg)] sm:text-7xl">
            Price the prompt before it ships.
          </h1>
          <p className="mt-6 max-w-2xl text-[14px] leading-7 text-[var(--tk-dim)] sm:text-[15px]">
            Paste a payload, compare providers and prompt formats, and see the token bill without
            sending your text anywhere. Switch to empirical mode when you want provider countTokens
            numbers with your own API key.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {METRICS.map((metric) => (
              <div className="tk-chip rounded-full px-3 py-1.5 text-[11px]" key={metric.label}>
                <span className="mr-2 uppercase tracking-[0.2em] text-[var(--tk-dim)]">
                  {metric.label}
                </span>
                <span className="text-[var(--tk-fg)]">{metric.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <div className="tk-panel relative overflow-hidden rounded-md p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--tk-rule)] pb-3">
              <div className="flex gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--tk-red)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--tk-amber)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--tk-green)]" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--tk-dim)]">
                cli preview
              </span>
            </div>
            <div className="space-y-3 text-[12.5px] leading-6">
              <p>
                <span className="text-[var(--tk-blue)]">$</span>{' '}
                <span className="text-[var(--tk-fg)]">tokenometer measure prompt.json</span>
              </p>
              <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-y border-[var(--tk-rule)] py-3 text-[11.5px]">
                <span className="text-[var(--tk-dim)]">claude-sonnet-4-6 · messages</span>
                <span className="tabular-nums text-[var(--tk-green)]">$0.00042</span>
                <span className="text-[var(--tk-dim)]">gpt-4o · json</span>
                <span className="tabular-nums text-[var(--tk-amber)]">$0.00061</span>
                <span className="text-[var(--tk-dim)]">gemini-2.5-pro · raw</span>
                <span className="tabular-nums text-[var(--tk-red)]">$0.00134</span>
              </div>
              <p className="tk-cursor text-[var(--tk-amber)]">
                offline rates loaded · no telemetry
              </p>
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="border-t border-[var(--tk-rule)] py-10" />}>
        <Playground initialPrompt={SAMPLE_PROMPT} />
      </Suspense>

      <section className="border-t border-[var(--tk-rule)] py-10 sm:py-12">
        <div className="grid grid-cols-12 gap-x-6 gap-y-8">
          <div className="col-span-12 sm:col-span-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-blue)]">
              ›ecosystem
            </p>
            <h2 className="tk-display mt-2 text-3xl font-semibold leading-tight tracking-normal">
              More from Faraazuddin Mohammed
            </h2>
            <p className="mt-3 text-[12.5px] leading-6 text-[var(--tk-dim)]">
              Tokenometer is part of a focused open-source toolkit for LLM cost, tokenization,
              routing, and prompt optimization.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px]">
              {PROFILE_LINKS.map((link) => (
                <a
                  className="tk-link text-[var(--tk-fg)]"
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
              {ECOSYSTEM_PROJECTS.map((project, index) => (
                <a
                  className="group tk-soft-panel block rounded p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--tk-amber)] hover:bg-[var(--tk-cell-strong)]"
                  href={project.href}
                  key={project.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span className="flex items-start justify-between gap-4">
                    <span className="text-[13px] font-bold text-[var(--tk-fg)] group-hover:text-[var(--tk-amber)]">
                      {project.name}
                    </span>
                    <span className="text-[10px] tabular-nums text-[var(--tk-dim)]">
                      0{index + 1}
                    </span>
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
