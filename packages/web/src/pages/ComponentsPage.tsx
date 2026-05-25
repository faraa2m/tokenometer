import { KNOWN_MODELS } from '@tokenometer/core';
import {
  BudgetMeter,
  CostBreakdown,
  LiveTokenizer,
  ModelCostMatrix,
  ModelSelector,
  PricingTable,
  TokenCounter,
  VisionCostEstimator,
} from '@tokenometer/react';
import { useState } from 'react';
import { usePageTitle } from '../hooks/usePageTitle.js';

const DEFAULT_PROMPT = 'Summarize the user input in three bullets.';
const DEFAULT_MODELS: readonly string[] = [
  KNOWN_MODELS.find((id) => id.startsWith('gpt-4o')) ?? KNOWN_MODELS[0] ?? 'gpt-4o',
  KNOWN_MODELS.find((id) => id.toLowerCase().includes('claude')) ??
    KNOWN_MODELS[1] ??
    'claude-sonnet-4-6',
  KNOWN_MODELS.find((id) => id.toLowerCase().includes('gemini')) ??
    KNOWN_MODELS[2] ??
    'gemini-1.5-pro',
].filter((id): id is string => Boolean(id));

interface SectionProps {
  title: string;
  sub?: string;
  children: React.ReactNode;
}

const Section = ({ title, sub, children }: SectionProps) => (
  <div className="border-t border-[var(--tk-rule)] pt-6">
    <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
      ›{title.toLowerCase()}
      {sub ? ` · ${sub}` : ''}
    </p>
    <h2 className="mt-1 text-lg font-bold tracking-tight">{title}</h2>
    <div className="mt-4 rounded border border-[var(--tk-rule)]/60 bg-[var(--tk-cell)] p-4">
      {children}
    </div>
  </div>
);

export const ComponentsPage = () => {
  usePageTitle('components', 'internal react component playground');
  const [model, setModel] = useState<string>(DEFAULT_MODELS[0] ?? 'gpt-4o');

  return (
    <section className="space-y-12 py-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
          ›components · internal workspace
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">react components</h1>
        <p className="mt-2 max-w-3xl text-[12.5px] text-[var(--tk-dim)]">
          Live previews of the private React component workspace used by the web app. Components
          below are rendered unstyled so you can see the raw HTML emitted by each primitive.
        </p>
      </div>

      <Section title="TokenCounter" sub="useTokenCount">
        <TokenCounter prompt={DEFAULT_PROMPT} model={model} />
      </Section>

      <Section title="ModelSelector" sub="useModelList">
        <ModelSelector value={model} onChange={setModel} />
      </Section>

      <Section title="LiveTokenizer" sub="useDebouncedTokenCount">
        <LiveTokenizer model={model} defaultPrompt={DEFAULT_PROMPT} />
      </Section>

      <Section title="ModelCostMatrix" sub="useCostMatrix">
        <ModelCostMatrix
          prompt={DEFAULT_PROMPT}
          models={DEFAULT_MODELS}
          formats={['text', 'json', 'markdown']}
        />
      </Section>

      <Section title="BudgetMeter" sub="useBudget">
        <BudgetMeter usedUsd={1.85} budgetUsd={5} label="weekly spend" />
      </Section>

      <Section title="CostBreakdown">
        <CostBreakdown
          items={[
            { label: 'system prompt', tokens: 120, cost: 0.0012 },
            { label: 'user turn 1', tokens: 340, cost: 0.0034 },
            { label: 'user turn 2', tokens: 88, cost: 0.00088 },
          ]}
        />
      </Section>

      <Section title="PricingTable" sub="usePricing">
        <PricingTable models={DEFAULT_MODELS} />
      </Section>

      <Section title="VisionCostEstimator">
        <VisionCostEstimator
          provider="openai"
          model={model}
          images={[
            { width: 1024, height: 768, detail: 'high' },
            { width: 384, height: 384, detail: 'low' },
          ]}
        />
      </Section>
    </section>
  );
};
