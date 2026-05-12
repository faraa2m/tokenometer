import { useMemo } from 'react';
import { formatUsd } from '../utils/format.js';

export type BudgetState = 'ok' | 'warn' | 'over';

export interface UseBudgetOptions {
  usedUsd: number;
  budgetUsd: number;
  /** Fraction of budget at which state flips from 'ok' to 'warn'. Default 0.8. */
  warnAt?: number;
}

export interface UseBudgetResult {
  /** Fraction in [0, 1+]; 1 means budget fully consumed. */
  percent: number;
  /** Remaining USD. Negative when over budget. */
  remaining: number;
  state: BudgetState;
  formatted: {
    used: string;
    budget: string;
    remaining: string;
    percent: string;
  };
}

const DEFAULT_WARN_AT = 0.8;

/**
 * Pure derived hook: classify a USD budget into ok/warn/over and produce
 * pre-formatted display strings.
 */
export const useBudget = (options: UseBudgetOptions): UseBudgetResult => {
  const { usedUsd, budgetUsd, warnAt = DEFAULT_WARN_AT } = options;
  return useMemo<UseBudgetResult>(() => {
    const safeBudget = budgetUsd > 0 ? budgetUsd : 0;
    const percent = safeBudget > 0 ? usedUsd / safeBudget : 0;
    const remaining = safeBudget - usedUsd;
    let state: BudgetState = 'ok';
    if (percent >= 1) state = 'over';
    else if (percent >= warnAt) state = 'warn';
    return {
      formatted: {
        budget: formatUsd(safeBudget),
        percent: `${Math.round(percent * 100)}%`,
        remaining: formatUsd(remaining),
        used: formatUsd(usedUsd),
      },
      percent,
      remaining,
      state,
    };
  }, [usedUsd, budgetUsd, warnAt]);
};
