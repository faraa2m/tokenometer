import type { Provider } from '@tokenometer/core';
import { forwardRef } from 'react';
import { usePricing } from '../hooks/usePricing.js';

export interface PricingTableProps {
  models?: readonly string[];
  providers?: readonly Provider[];
  currency?: string;
  className?: string;
}

const formatRate = (perK: number, currency: string): string => `${currency}${perK.toFixed(4)} / 1k`;

/**
 * Tabular view of input / output (and cache-read where present) rates
 * across the model registry. Currency is rendered as a prefix string;
 * the underlying registry is denominated in USD.
 */
export const PricingTable = forwardRef<HTMLTableElement, PricingTableProps>(
  function PricingTable(props, ref) {
    const { models, providers, currency = '$', className } = props;
    const rows = usePricing({
      ...(models ? { models } : {}),
      ...(providers ? { providers } : {}),
    });
    const showCache = rows.some((r) => r.rate.cachedInputPer1k !== undefined);
    return (
      <table className={className} ref={ref} data-tk="pricing-table">
        <thead>
          <tr>
            <th scope="col">model</th>
            <th scope="col">provider</th>
            <th scope="col">input</th>
            <th scope="col">output</th>
            {showCache ? <th scope="col">cache read</th> : null}
            <th scope="col">context</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ model, rate }) => (
            <tr key={model.id}>
              <th scope="row">{model.id}</th>
              <td>{model.provider}</td>
              <td>{formatRate(rate.inputPer1k, currency)}</td>
              <td>{formatRate(rate.outputPer1k, currency)}</td>
              {showCache ? (
                <td>
                  {rate.cachedInputPer1k !== undefined
                    ? formatRate(rate.cachedInputPer1k, currency)
                    : '—'}
                </td>
              ) : null}
              <td>{model.contextWindow ? `${(model.contextWindow / 1000).toFixed(0)}k` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
);
