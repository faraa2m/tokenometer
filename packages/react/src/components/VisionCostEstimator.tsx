import {
  anthropicVisionTokens,
  getRate,
  googleVisionTokens,
  openaiVisionTokens,
} from '@tokenometer/core';
import type { Provider } from '@tokenometer/core';
import { forwardRef, useMemo } from 'react';
import { formatUsd } from '../utils/format.js';

export interface VisionImage {
  width: number;
  height: number;
  detail?: 'low' | 'high' | 'auto';
}

export interface VisionCostEstimatorProps {
  provider: Extract<Provider, 'anthropic' | 'google' | 'openai'>;
  images: readonly VisionImage[];
  /** Optional model id used to attach a USD cost to the estimate. */
  model?: string;
  className?: string;
}

const tokensFor = (provider: VisionCostEstimatorProps['provider'], image: VisionImage): number => {
  switch (provider) {
    case 'anthropic':
      return anthropicVisionTokens(image);
    case 'google':
      return googleVisionTokens(image);
    case 'openai':
      return openaiVisionTokens(image);
  }
};

interface ImageRow {
  index: number;
  width: number;
  height: number;
  detail: 'low' | 'high' | 'auto' | undefined;
  tokens: number;
  cost: number;
}

interface VisionEstimate {
  rows: ImageRow[];
  totalTokens: number;
  totalCost: number;
  ratePer1k: number | undefined;
  error?: string;
}

/**
 * Estimate vision-token usage (and optionally USD cost) for a batch of
 * image dimensions. Mistral / Cohere are not supported here because they
 * either lack a public vision-token formula or do not ship vision models.
 */
export const VisionCostEstimator = forwardRef<HTMLDivElement, VisionCostEstimatorProps>(
  function VisionCostEstimator(props, ref) {
    const { provider, images, model, className } = props;
    const estimate = useMemo<VisionEstimate>(() => {
      let ratePer1k: number | undefined;
      let error: string | undefined;
      if (model) {
        try {
          ratePer1k = getRate(model).inputPer1k;
        } catch (err) {
          error = err instanceof Error ? err.message : String(err);
        }
      }
      const rows: ImageRow[] = images.map((image, i) => {
        const tokens = tokensFor(provider, image);
        const cost = ratePer1k !== undefined ? (tokens / 1000) * ratePer1k : 0;
        return {
          cost,
          detail: image.detail,
          height: image.height,
          index: i,
          tokens,
          width: image.width,
        };
      });
      const totalTokens = rows.reduce((s, r) => s + r.tokens, 0);
      const totalCost = rows.reduce((s, r) => s + r.cost, 0);
      const out: VisionEstimate = { rows, totalCost, totalTokens, ratePer1k };
      if (error !== undefined) out.error = error;
      return out;
    }, [provider, images, model]);

    return (
      <div className={className} ref={ref} data-tk="vision-cost-estimator">
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">w x h</th>
              <th scope="col">detail</th>
              <th scope="col">tokens</th>
              {estimate.ratePer1k !== undefined ? <th scope="col">cost</th> : null}
            </tr>
          </thead>
          <tbody>
            {estimate.rows.map((row) => (
              <tr key={row.index}>
                <th scope="row">{row.index + 1}</th>
                <td>
                  {row.width} x {row.height}
                </td>
                <td>{row.detail ?? '—'}</td>
                <td>{row.tokens}</td>
                {estimate.ratePer1k !== undefined ? <td>{formatUsd(row.cost)}</td> : null}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>
                total
              </th>
              <td>{estimate.totalTokens}</td>
              {estimate.ratePer1k !== undefined ? <td>{formatUsd(estimate.totalCost)}</td> : null}
            </tr>
          </tfoot>
        </table>
        {estimate.error ? (
          <p data-tk="vision-cost-error">model lookup failed: {estimate.error}</p>
        ) : null}
      </div>
    );
  },
);
