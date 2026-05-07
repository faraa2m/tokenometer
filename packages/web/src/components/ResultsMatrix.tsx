import type { TokenizeResult } from '@tokenometer/core';

interface ResultsMatrixProps {
  empirical: boolean;
  results: readonly TokenizeResult[];
}

const formatCost = (usd: number): string => {
  if (usd >= 0.01) return `$${usd.toFixed(4)}`;
  if (usd >= 0.000001) return `$${usd.toFixed(6)}`;
  return `$${usd.toExponential(2)}`;
};

export const ResultsMatrix = ({ empirical, results }: ResultsMatrixProps) => {
  const sorted = [...results].sort((a, b) => a.inputCost - b.inputCost);
  const cheapest = sorted[0];
  const priciest = sorted.at(-1);
  const ratio =
    cheapest && priciest && cheapest !== priciest
      ? priciest.inputCost / Math.max(cheapest.inputCost, Number.EPSILON)
      : 1;

  return (
    <section>
      <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
        05 › results · {results.length} cells · mode = {empirical ? 'empirical' : 'offline'}
      </p>
      <div className="overflow-x-auto border border-[var(--tk-rule)]">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--tk-rule)] text-[10px] uppercase tracking-[0.25em] text-[var(--tk-dim)]">
              <th className="px-3 py-2 text-left font-normal">model</th>
              <th className="px-3 py-2 text-left font-normal">format</th>
              <th className="px-3 py-2 text-right font-normal">tokens</th>
              <th className="px-3 py-2 text-right font-normal">cost (input)</th>
              <th className="px-3 py-2 text-right font-normal">tokenizer</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const isCheapest = r === cheapest;
              const isPriciest = r === priciest;
              return (
                <tr
                  key={`${r.model}-${r.format}-${i}`}
                  className={
                    isCheapest || isPriciest
                      ? 'border-t border-[var(--tk-rule)] bg-[var(--tk-cell)]/40'
                      : 'border-t border-[var(--tk-rule)]/60'
                  }
                >
                  <td className="px-3 py-1.5 text-[var(--tk-fg)]">{r.model}</td>
                  <td className="px-3 py-1.5 text-[var(--tk-dim)]">{r.format}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-[var(--tk-fg)]">
                    <span aria-hidden="true" className="text-[var(--tk-dim)]">
                      {r.approximate ? '~' : ' '}
                    </span>
                    {r.inputTokens.toLocaleString()}
                  </td>
                  <td
                    className={
                      isCheapest
                        ? 'px-3 py-1.5 text-right tabular-nums text-[var(--tk-green)]'
                        : isPriciest
                          ? 'px-3 py-1.5 text-right tabular-nums text-[var(--tk-red)]'
                          : 'px-3 py-1.5 text-right tabular-nums text-[var(--tk-fg)]'
                    }
                  >
                    {formatCost(r.inputCost)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-[10.5px] text-[var(--tk-dim)]">
                    {r.tokenizer}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {cheapest && priciest && cheapest !== priciest && (
        <div className="mt-3 grid grid-cols-12 gap-x-6 text-[11.5px]">
          <p className="col-span-12 sm:col-span-6">
            <span className="text-[var(--tk-dim)]">cheapest</span>{' '}
            <span className="text-[var(--tk-green)]">
              {cheapest.model} / {cheapest.format}
            </span>{' '}
            <span className="tabular-nums text-[var(--tk-fg)]">
              {formatCost(cheapest.inputCost)}
            </span>
          </p>
          <p className="col-span-12 sm:col-span-6 sm:text-right">
            <span className="text-[var(--tk-dim)]">priciest</span>{' '}
            <span className="text-[var(--tk-red)]">
              {priciest.model} / {priciest.format}
            </span>{' '}
            <span className="tabular-nums text-[var(--tk-fg)]">
              {formatCost(priciest.inputCost)}
            </span>{' '}
            <span className="text-[var(--tk-dim)]">({ratio.toFixed(2)}× cheapest)</span>
          </p>
        </div>
      )}
    </section>
  );
};
