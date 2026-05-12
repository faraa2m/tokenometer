import { forwardRef } from 'react';
import { useBudget } from '../hooks/useBudget.js';

export interface BudgetMeterProps {
  usedUsd: number;
  budgetUsd: number;
  warnAt?: number;
  className?: string;
  label?: string;
}

/**
 * Progress bar visualizing spend against a USD budget.
 * `<progress>` is intentionally unstyled — wrap with CSS or use the
 * styled variant for opinionated visuals.
 */
export const BudgetMeter = forwardRef<HTMLDivElement, BudgetMeterProps>(
  function BudgetMeter(props, ref) {
    const { usedUsd, budgetUsd, warnAt, className, label = 'budget' } = props;
    const budget = useBudget({
      usedUsd,
      budgetUsd,
      ...(warnAt !== undefined ? { warnAt } : {}),
    });
    const max = budgetUsd > 0 ? budgetUsd : 1;
    const value = Math.max(0, Math.min(usedUsd, max));
    return (
      <div className={className} ref={ref} data-tk="budget-meter" data-tk-state={budget.state}>
        <div data-tk="budget-meter-label">
          <span>{label}</span>
          <span>
            {budget.formatted.used} / {budget.formatted.budget} ({budget.formatted.percent})
          </span>
        </div>
        <progress max={max} value={value} aria-label={label} />
      </div>
    );
  },
);
