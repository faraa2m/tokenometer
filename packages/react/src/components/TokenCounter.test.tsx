import { render, screen } from '@testing-library/react';
import { KNOWN_MODELS } from '@tokenometer/core/browser';
import { describe, expect, it } from 'vitest';
import { TokenCounter } from './TokenCounter.js';

const firstModel = KNOWN_MODELS[0] ?? 'gpt-4o';

describe('TokenCounter', () => {
  it('renders default tokens + cost string', () => {
    render(<TokenCounter prompt="hello world" model={firstModel} />);
    const el = screen.getByText(/tok/);
    expect(el).toBeInTheDocument();
    expect(el.textContent).toMatch(/^\d+ tok — \$\d+\.\d{4}/);
  });

  it('passes className through', () => {
    const { container } = render(
      <TokenCounter className="custom-cls" prompt="hi" model={firstModel} />,
    );
    expect(container.firstChild).toHaveClass('custom-cls');
  });

  it('honors render prop', () => {
    render(
      <TokenCounter
        prompt="hi"
        model={firstModel}
        render={(s) => <em data-testid="custom">tokens={s.tokens}</em>}
      />,
    );
    expect(screen.getByTestId('custom')).toHaveTextContent(/tokens=\d+/);
  });

  it('renders error state for unknown model', () => {
    render(<TokenCounter prompt="hi" model="definitely-not-real" />);
    expect(screen.getByText(/error:/)).toBeInTheDocument();
  });
});
