import type { Format } from '@tokenometer/core/browser';
import { forwardRef } from 'react';
import { useCostMatrix } from '../hooks/useCostMatrix.js';
import { formatUsd } from '../utils/format.js';

export interface ModelCostMatrixProps {
  prompt: string;
  models: readonly string[];
  formats?: readonly Format[];
  className?: string;
}

const DEFAULT_FORMATS: readonly Format[] = ['text'];

/**
 * Table of token counts and input cost across the cartesian product of
 * [models] x [formats]. Rows are models; columns are formats.
 */
export const ModelCostMatrix = forwardRef<HTMLTableElement, ModelCostMatrixProps>(
  function ModelCostMatrix(props, ref) {
    const { prompt, models, formats = DEFAULT_FORMATS, className } = props;
    const rows = useCostMatrix({ prompt, models, formats });
    const byModel = new Map<string, Map<Format, { tokens: number; cost: number }>>();
    for (const r of rows) {
      let m = byModel.get(r.model);
      if (!m) {
        m = new Map();
        byModel.set(r.model, m);
      }
      m.set(r.format, { cost: r.inputCost, tokens: r.inputTokens });
    }
    return (
      <table className={className} ref={ref} data-tk="cost-matrix">
        <thead>
          <tr>
            <th scope="col">model</th>
            {formats.map((f) => (
              <th key={f} scope="col">
                {f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {models.map((m) => {
            const cells = byModel.get(m);
            return (
              <tr key={m}>
                <th scope="row">{m}</th>
                {formats.map((f) => {
                  const cell = cells?.get(f);
                  return <td key={f}>{cell ? `${cell.tokens} / ${formatUsd(cell.cost)}` : '—'}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  },
);
