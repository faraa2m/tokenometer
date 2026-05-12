import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BudgetMeter } from './BudgetMeter.js';

describe('BudgetMeter', () => {
  it('renders a progress bar with the right max and value', () => {
    render(<BudgetMeter usedUsd={2.5} budgetUsd={10} label="month" />);
    const bar = screen.getByRole('progressbar', { name: 'month' });
    expect(bar).toHaveAttribute('max', '10');
    expect(bar).toHaveAttribute('value', '2.5');
  });

  it('sets state attribute according to spend', () => {
    const { container, rerender } = render(<BudgetMeter usedUsd={1} budgetUsd={10} />);
    expect(container.firstChild).toHaveAttribute('data-tk-state', 'ok');
    rerender(<BudgetMeter usedUsd={9} budgetUsd={10} />);
    expect(container.firstChild).toHaveAttribute('data-tk-state', 'warn');
    rerender(<BudgetMeter usedUsd={11} budgetUsd={10} />);
    expect(container.firstChild).toHaveAttribute('data-tk-state', 'over');
  });

  it('clamps the progress value to the max so the bar does not overflow', () => {
    render(<BudgetMeter usedUsd={50} budgetUsd={10} label="m" />);
    const bar = screen.getByRole('progressbar', { name: 'm' });
    expect(bar).toHaveAttribute('value', '10');
  });
});
