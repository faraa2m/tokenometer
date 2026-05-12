import { forwardRef } from 'react';
import { formatUsd } from '../utils/format.js';

export interface CostBreakdownItem {
  label: string;
  tokens: number;
  cost: number;
}

export interface CostBreakdownProps {
  items: readonly CostBreakdownItem[];
  showTotal?: boolean;
  className?: string;
}

/**
 * Table of {label, tokens, cost} rows with an optional total row.
 */
export const CostBreakdown = forwardRef<HTMLTableElement, CostBreakdownProps>(
  function CostBreakdown(props, ref) {
    const { items, showTotal = true, className } = props;
    const totals = items.reduce(
      (acc, item) => ({ cost: acc.cost + item.cost, tokens: acc.tokens + item.tokens }),
      { cost: 0, tokens: 0 },
    );
    return (
      <table className={className} ref={ref} data-tk="cost-breakdown">
        <thead>
          <tr>
            <th scope="col">label</th>
            <th scope="col">tokens</th>
            <th scope="col">cost</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.label}>
              <th scope="row">{item.label}</th>
              <td>{item.tokens}</td>
              <td>{formatUsd(item.cost)}</td>
            </tr>
          ))}
        </tbody>
        {showTotal ? (
          <tfoot>
            <tr>
              <th scope="row">total</th>
              <td>{totals.tokens}</td>
              <td>{formatUsd(totals.cost)}</td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    );
  },
);
