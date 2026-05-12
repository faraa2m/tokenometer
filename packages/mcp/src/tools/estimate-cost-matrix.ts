import { tokenizeMatrix } from '@tokenometer/core';
import type { Format, TokenizeResult } from '@tokenometer/core';
import { toMcpError } from '../errors.js';
import { EstimateCostMatrixInput } from '../schemas.js';
import type { ToolDef, ToolResult } from './types.js';

const DEFAULT_FORMATS: readonly Format[] = ['text'];

interface MatrixCell {
  model: string;
  format: Format;
  tokens: number;
  inputCost: number;
  approximate: boolean;
  tokenizer: TokenizeResult['tokenizer'];
}

const pickCheapest = (cells: readonly MatrixCell[]): MatrixCell | undefined =>
  cells.reduce<MatrixCell | undefined>(
    (acc, c) => (acc === undefined || c.inputCost < acc.inputCost ? c : acc),
    undefined,
  );

const pickPriciest = (cells: readonly MatrixCell[]): MatrixCell | undefined =>
  cells.reduce<MatrixCell | undefined>(
    (acc, c) => (acc === undefined || c.inputCost > acc.inputCost ? c : acc),
    undefined,
  );

export const estimateCostMatrix: ToolDef<typeof EstimateCostMatrixInput> = {
  name: 'estimate_cost_matrix',
  description:
    'Estimate token cost across the cross-product of models and formats. Returns one cell per (model, format) plus pointers to the cheapest and most expensive cells.',
  schema: EstimateCostMatrixInput,
  handler: async (input) => {
    try {
      const formats: readonly Format[] = input.formats ?? DEFAULT_FORMATS;
      const cells = tokenizeMatrix({
        formats,
        modelIds: input.models,
        prompt: input.text,
      });

      const results: MatrixCell[] = cells.map((c) => ({
        model: c.model,
        format: c.format,
        tokens: c.inputTokens,
        inputCost: c.inputCost,
        approximate: c.approximate,
        tokenizer: c.tokenizer,
      }));

      const payload = {
        results,
        cheapest: pickCheapest(results),
        mostExpensive: pickPriciest(results),
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
