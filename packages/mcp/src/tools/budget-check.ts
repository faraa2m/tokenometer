import { tokenize } from '@tokenometer/core';
import type { Format } from '@tokenometer/core';
import { toMcpError } from '../errors.js';
import { BudgetCheckInput } from '../schemas.js';
import type { ToolDef, ToolResult } from './types.js';

const DEFAULT_FORMAT: Format = 'text';

interface BudgetCheckEntry {
  kind: 'cost' | 'tokens';
  pass: boolean;
  headroom: number;
  reason?: string;
}

export const budgetCheck: ToolDef<typeof BudgetCheckInput> = {
  name: 'budget_check',
  description:
    'Pre-flight check: would sending this prompt to this model fit within a maxCostUsd or maxTokens budget? Returns pass/fail, the actual token + cost, headroom remaining, and a reason on failure. Agents can call this before dispatching the real LLM request.',
  schema: BudgetCheckInput,
  handler: async (input) => {
    try {
      const format = input.format ?? DEFAULT_FORMAT;
      const cell = tokenize({ format, modelId: input.model, prompt: input.text });

      const checks: BudgetCheckEntry[] = [];

      if (input.maxCostUsd !== undefined) {
        const headroom = input.maxCostUsd - cell.inputCost;
        const pass = headroom >= 0;
        const entry: BudgetCheckEntry = { kind: 'cost', pass, headroom };
        if (!pass) {
          entry.reason = `Input cost $${cell.inputCost.toFixed(6)} exceeds maxCostUsd $${input.maxCostUsd.toFixed(6)}`;
        }
        checks.push(entry);
      }
      if (input.maxTokens !== undefined) {
        const headroom = input.maxTokens - cell.inputTokens;
        const pass = headroom >= 0;
        const entry: BudgetCheckEntry = { kind: 'tokens', pass, headroom };
        if (!pass) {
          entry.reason = `Input tokens ${cell.inputTokens} exceeds maxTokens ${input.maxTokens}`;
        }
        checks.push(entry);
      }

      const failed = checks.find((c) => !c.pass);
      const passed = failed === undefined;

      // Headroom is reported as the *tighter* (smaller) constraint's headroom
      // when both limits are passed; agents care about the binding limit.
      const firstHeadroom = checks[0]?.headroom ?? 0;
      const headroom =
        checks.length === 0
          ? 0
          : checks.reduce<number>((min, c) => (c.headroom < min ? c.headroom : min), firstHeadroom);

      const payload = {
        pass: passed,
        actualTokens: cell.inputTokens,
        actualCost: cell.inputCost,
        headroom,
        checks,
        ...(failed?.reason ? { reason: failed.reason } : {}),
        model: cell.model,
        format: cell.format,
        approximate: cell.approximate,
      };

      const result: ToolResult = {
        content: [{ type: 'text', text: JSON.stringify(payload) }],
      };
      return result;
    } catch (err) {
      return toMcpError(err);
    }
  },
};
