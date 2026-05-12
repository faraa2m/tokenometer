import type { CSSProperties, FC, ReactNode } from 'react';
import {
  BudgetMeter,
  type BudgetMeterProps,
  CostBreakdown,
  type CostBreakdownProps,
  LiveTokenizer,
  type LiveTokenizerProps,
  ModelCostMatrix,
  type ModelCostMatrixProps,
  ModelSelector,
  type ModelSelectorProps,
  PricingTable,
  type PricingTableProps,
  TokenCounter,
  type TokenCounterProps,
  VisionCostEstimator,
  type VisionCostEstimatorProps,
} from '../components/index.js';
import { formatUsd } from '../utils/format.js';
import { borderedBoxStyle, tableCellStyle, tableStyle } from './tokens.js';

const tableWrapperStyle: CSSProperties = {
  display: 'block',
  overflowX: 'auto',
};

// Inline-style overrides applied via a scoped <style> tag inside each
// table wrapper. Wrapping in [data-tk-styled] confines the rules to the
// styled subtree so host pages keep their own table look.
const tableInlineCss = `
  [data-tk-styled] table { border-collapse: collapse; width: 100%; font-size: 13px; font-family: var(--tk-font, ui-monospace, monospace); }
  [data-tk-styled] th, [data-tk-styled] td { border: 1px solid var(--tk-border, #e5e5e5); padding: 6px 8px; text-align: left; }
  [data-tk-styled] thead th { background: var(--tk-bg, #ffffff); color: var(--tk-muted, #666); font-weight: 600; }
  [data-tk-styled] tfoot th, [data-tk-styled] tfoot td { font-weight: 600; }
`;

const TableShell: FC<{ children: ReactNode; className?: string | undefined }> = ({
  children,
  className,
}) => (
  <div {...(className ? { className } : {})} data-tk-styled style={tableWrapperStyle}>
    <style>{tableInlineCss}</style>
    {children}
  </div>
);

export const StyledTokenCounter: FC<TokenCounterProps> = (props) => (
  <TokenCounter
    {...props}
    render={(s) => (
      <span
        style={{
          alignItems: 'center',
          background: 'var(--tk-bg, #fff)',
          border: '1px solid var(--tk-border, #e5e5e5)',
          borderRadius: 'var(--tk-radius, 6px)',
          color: 'var(--tk-fg, #111)',
          display: 'inline-flex',
          fontFamily: 'var(--tk-font, ui-monospace, monospace)',
          fontSize: '13px',
          gap: '8px',
          padding: '4px 10px',
        }}
      >
        <span>{s.tokens} tok</span>
        <span style={{ color: 'var(--tk-muted, #666)' }}>{formatUsd(s.cost)}</span>
        {s.approximate ? <span style={{ color: 'var(--tk-warn, #ca8a04)' }}>~</span> : null}
      </span>
    )}
  />
);

export const StyledBudgetMeter: FC<BudgetMeterProps> = (props) => (
  <div style={borderedBoxStyle}>
    <BudgetMeter {...props} />
  </div>
);

export const StyledModelCostMatrix: FC<ModelCostMatrixProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <TableShell className={className}>
      <ModelCostMatrix {...rest} />
    </TableShell>
  );
};

export const StyledCostBreakdown: FC<CostBreakdownProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <TableShell className={className}>
      <CostBreakdown {...rest} />
    </TableShell>
  );
};

export const StyledPricingTable: FC<PricingTableProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <TableShell className={className}>
      <PricingTable {...rest} />
    </TableShell>
  );
};

export const StyledModelSelector: FC<ModelSelectorProps> = (props) => <ModelSelector {...props} />;

export const StyledLiveTokenizer: FC<LiveTokenizerProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <div
      {...(className ? { className } : {})}
      style={{
        ...borderedBoxStyle,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--tk-spacing, 8px)',
      }}
    >
      <style>{`
        [data-tk-live] textarea { width: 100%; min-height: 120px; font-family: var(--tk-font, ui-monospace, monospace); font-size: 13px; padding: 8px; border: 1px solid var(--tk-border, #e5e5e5); border-radius: var(--tk-radius, 6px); background: var(--tk-bg, #fff); color: var(--tk-fg, #111); resize: vertical; }
        [data-tk-live] [data-tk="live-tokenizer-readout"] { font-family: var(--tk-font, ui-monospace, monospace); font-size: 12px; color: var(--tk-muted, #666); }
      `}</style>
      <div data-tk-live>
        <LiveTokenizer {...rest} />
      </div>
    </div>
  );
};

export const StyledVisionCostEstimator: FC<VisionCostEstimatorProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <TableShell className={className}>
      <VisionCostEstimator {...rest} />
    </TableShell>
  );
};

export { borderedBoxStyle, tableCellStyle, tableStyle };
