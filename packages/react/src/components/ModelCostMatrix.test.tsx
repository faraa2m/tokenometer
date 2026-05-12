import { render, screen } from '@testing-library/react';
import { KNOWN_MODELS } from '@tokenometer/core';
import { describe, expect, it } from 'vitest';
import { ModelCostMatrix } from './ModelCostMatrix.js';

const models = KNOWN_MODELS.slice(0, 2);

describe('ModelCostMatrix', () => {
  it('renders one row per model with the model id in a row header', () => {
    render(<ModelCostMatrix prompt="hi" models={models} formats={['text', 'json']} />);
    for (const m of models) {
      expect(screen.getByRole('rowheader', { name: m })).toBeInTheDocument();
    }
  });

  it('renders column headers for each format', () => {
    render(<ModelCostMatrix prompt="hi" models={models} formats={['text', 'json']} />);
    expect(screen.getByRole('columnheader', { name: 'text' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'json' })).toBeInTheDocument();
  });

  it('applies className to the table', () => {
    const { container } = render(<ModelCostMatrix className="mtx" prompt="hi" models={models} />);
    expect(container.querySelector('table')).toHaveClass('mtx');
  });
});
