import { RATES_VERSION, getModel, getRate } from '@tokenometer/core';
import type { ModelDescriptor, RateEntry } from '@tokenometer/core';
import { Link, useParams } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle.js';

const formatRate = (per1k: number): string => `$${per1k.toFixed(per1k < 0.001 ? 6 : 4)}`;

const formatCtx = (n?: number): string => {
  if (!n) return 'unknown';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M tokens`;
  if (n >= 1000) return `${Math.round(n / 1000)}k tokens`;
  return `${n} tokens`;
};

const sampleCostFor = (rate: RateEntry, tokens: number): number =>
  (tokens / 1000) * rate.inputPer1k;

interface DetailViewProps {
  id: string;
  model: ModelDescriptor;
  rate: RateEntry;
}

const DetailView = ({ id, model, rate }: DetailViewProps) => {
  usePageTitle(id, `${model.provider} · ${formatRate(rate.inputPer1k)} per 1k input`);
  const sample1k = sampleCostFor(rate, 1000);
  const sample10k = sampleCostFor(rate, 10_000);
  const sample100k = sampleCostFor(rate, 100_000);
  const ratio =
    rate.cachedInputPer1k !== undefined && rate.cachedInputPer1k > 0
      ? rate.inputPer1k / rate.cachedInputPer1k
      : null;

  return (
    <section className="space-y-8 py-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
          ›model · {model.provider}
        </p>
        <h1 className="mt-2 break-all text-2xl font-bold tracking-tight">{id}</h1>
        <p className="mt-2 text-[12.5px] text-[var(--tk-dim)]">
          {model.provider} · pricing source: {model.pricingSource ?? 'unknown'} · rates{' '}
          {RATES_VERSION}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-x-6 gap-y-6">
        <div className="col-span-12 sm:col-span-6 border border-[var(--tk-rule)] bg-[var(--tk-cell)] p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">pricing</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]">
            <dt className="text-[var(--tk-dim)]">input · per 1k</dt>
            <dd className="tabular-nums text-[var(--tk-fg)]">{formatRate(rate.inputPer1k)}</dd>
            <dt className="text-[var(--tk-dim)]">output · per 1k</dt>
            <dd className="tabular-nums text-[var(--tk-fg)]">{formatRate(rate.outputPer1k)}</dd>
            {rate.cachedInputPer1k !== undefined && (
              <>
                <dt className="text-[var(--tk-dim)]">cached input</dt>
                <dd className="tabular-nums text-[var(--tk-fg)]">
                  {formatRate(rate.cachedInputPer1k)}
                  {ratio ? (
                    <span className="ml-1 text-[var(--tk-dim)]">({ratio.toFixed(0)}× cheaper)</span>
                  ) : null}
                </dd>
              </>
            )}
          </dl>
        </div>
        <div className="col-span-12 sm:col-span-6 border border-[var(--tk-rule)] bg-[var(--tk-cell)] p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">capacity</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]">
            <dt className="text-[var(--tk-dim)]">context window</dt>
            <dd className="tabular-nums text-[var(--tk-fg)]">{formatCtx(model.contextWindow)}</dd>
            <dt className="text-[var(--tk-dim)]">max output</dt>
            <dd className="tabular-nums text-[var(--tk-fg)]">{formatCtx(model.maxOutputTokens)}</dd>
          </dl>
        </div>
      </div>

      <div className="border border-[var(--tk-rule)] bg-[var(--tk-cell)]">
        <div className="border-b border-[var(--tk-rule)] px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-[var(--tk-dim)]">
          sample input costs (no output included)
        </div>
        <div className="grid grid-cols-3 divide-x divide-[var(--tk-rule)] text-[12.5px]">
          {[
            ['1k tokens', sample1k],
            ['10k tokens', sample10k],
            ['100k tokens', sample100k],
          ].map(([label, value]) => (
            <div key={label as string} className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--tk-dim)]">
                {label}
              </p>
              <p className="mt-1 tabular-nums text-[var(--tk-fg)]">
                ${(value as number).toFixed(6)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[12px]">
        <p>
          Counted with the same tokenizer the calculator uses for {model.provider}. For exact
          provider numbers, run{' '}
          <code className="text-[var(--tk-fg)]">tokenometer measure --empirical</code> from the CLI.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 text-[11.5px]">
        <Link
          to="/models"
          className="border border-[var(--tk-rule)] px-3 py-1.5 text-[var(--tk-fg)] hover:border-[var(--tk-amber)] hover:text-[var(--tk-amber)]"
        >
          ‹ back to atlas
        </Link>
        <Link
          to="/calculator"
          className="border border-[var(--tk-rule)] px-3 py-1.5 text-[var(--tk-fg)] hover:border-[var(--tk-amber)] hover:text-[var(--tk-amber)]"
        >
          measure a prompt with this model
        </Link>
      </div>
    </section>
  );
};

export const ModelDetailPage = () => {
  const params = useParams<{ id: string }>();
  const id = params.id ? decodeURIComponent(params.id) : '';

  let model: ModelDescriptor | null = null;
  let rate: RateEntry | null = null;
  try {
    model = getModel(id);
    rate = getRate(id);
  } catch {
    model = null;
    rate = null;
  }

  if (!id) {
    return (
      <section className="space-y-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">missing model id</h1>
        <Link to="/models" className="text-[var(--tk-amber)] underline underline-offset-4">
          ‹ back to atlas
        </Link>
      </section>
    );
  }

  if (!model || !rate) {
    return (
      <section className="space-y-4 py-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
          ›model · not found
        </p>
        <h1 className="break-all text-2xl font-bold tracking-tight">{id}</h1>
        <p className="text-[12.5px] text-[var(--tk-red)]">
          unknown model. it may have been retired or never tracked here.
        </p>
        <Link to="/models" className="text-[var(--tk-amber)] underline underline-offset-4">
          ‹ back to atlas
        </Link>
      </section>
    );
  }

  return <DetailView id={id} model={model} rate={rate} />;
};
