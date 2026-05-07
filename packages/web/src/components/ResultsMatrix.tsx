import type { TokenizeResult } from '@tokenometer/core';

interface ResultsMatrixProps {
  results: readonly TokenizeResult[];
}

const formatCost = (usd: number): string => {
  if (usd >= 0.01) return `$${usd.toFixed(4)}`;
  if (usd >= 0.000001) return `$${usd.toFixed(6)}`;
  return `$${usd.toExponential(2)}`;
};

export const ResultsMatrix = ({ results }: ResultsMatrixProps) => {
  const cheapest = [...results].sort((a, b) => a.inputCost - b.inputCost)[0];
  const priciest = [...results].sort((a, b) => b.inputCost - a.inputCost)[0];
  const ratio =
    cheapest && priciest && cheapest !== priciest
      ? priciest.inputCost / Math.max(cheapest.inputCost, Number.EPSILON)
      : 1;

  return (
    <div className="space-y-4">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-black/60 dark:text-white/60">
        Results · {results.length} cells
      </p>
      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
        <table className="w-full border-collapse font-mono text-sm">
          <thead>
            <tr className="bg-black/5 text-left dark:bg-white/5">
              <th className="px-4 py-2 font-medium">Model</th>
              <th className="px-4 py-2 font-medium">Format</th>
              <th className="px-4 py-2 text-right font-medium">Tokens</th>
              <th className="px-4 py-2 text-right font-medium">Est. cost</th>
              <th className="px-4 py-2 text-right font-medium">Tokenizer</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const isCheapest = r === cheapest;
              const isPriciest = r === priciest;
              return (
                <tr
                  key={`${r.model}-${r.format}-${i}`}
                  className="border-t border-black/5 dark:border-white/5"
                >
                  <td className="px-4 py-2">{r.model}</td>
                  <td className="px-4 py-2">{r.format}</td>
                  <td className="px-4 py-2 text-right">
                    {r.approximate ? (
                      <span className="text-black/40 dark:text-white/40">~</span>
                    ) : null}
                    {r.inputTokens.toLocaleString()}
                  </td>
                  <td
                    className={
                      isCheapest
                        ? 'px-4 py-2 text-right font-medium text-emerald-700 dark:text-emerald-400'
                        : isPriciest
                          ? 'px-4 py-2 text-right font-medium text-red-700 dark:text-red-400'
                          : 'px-4 py-2 text-right'
                    }
                  >
                    {formatCost(r.inputCost)}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-black/50 dark:text-white/50">
                    {r.tokenizer}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {cheapest && priciest && cheapest !== priciest && (
        <p className="text-sm text-black/70 dark:text-white/70">
          <span className="font-medium text-emerald-700 dark:text-emerald-400">Cheapest:</span>{' '}
          {cheapest.model} as {cheapest.format} ({formatCost(cheapest.inputCost)}){'  ·  '}
          <span className="font-medium text-red-700 dark:text-red-400">Priciest:</span>{' '}
          {priciest.model} as {priciest.format} ({formatCost(priciest.inputCost)},{' '}
          <strong>{ratio.toFixed(2)}× more</strong>)
        </p>
      )}
    </div>
  );
};
