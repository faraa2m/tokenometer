import type { CSSProperties } from 'react';

/**
 * CSS custom-property defaults shared by every styled component.
 * Consumers can override any of these on `:root` or a parent element to
 * theme the components without touching their internals.
 */
export const CSS_VAR_DEFAULTS: Record<string, string> = {
  '--tk-bg': '#ffffff',
  '--tk-fg': '#111111',
  '--tk-muted': '#666666',
  '--tk-border': '#e5e5e5',
  '--tk-accent': '#2563eb',
  '--tk-ok': '#16a34a',
  '--tk-warn': '#ca8a04',
  '--tk-danger': '#dc2626',
  '--tk-spacing': '8px',
  '--tk-radius': '6px',
  '--tk-font':
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

/** Inline style fragments composed by styled wrappers. */
export const baseInlineStyle: CSSProperties = {
  fontFamily: 'var(--tk-font)',
  color: 'var(--tk-fg)',
  background: 'var(--tk-bg)',
};

export const borderedBoxStyle: CSSProperties = {
  ...baseInlineStyle,
  border: '1px solid var(--tk-border)',
  borderRadius: 'var(--tk-radius)',
  padding: 'var(--tk-spacing)',
};

export const tableStyle: CSSProperties = {
  ...baseInlineStyle,
  borderCollapse: 'collapse',
  width: '100%',
  fontSize: '13px',
};

export const tableCellStyle: CSSProperties = {
  border: '1px solid var(--tk-border)',
  padding: 'calc(var(--tk-spacing) / 2) var(--tk-spacing)',
  textAlign: 'left',
};
