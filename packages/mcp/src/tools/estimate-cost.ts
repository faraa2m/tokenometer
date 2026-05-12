import { getModel, getRate, tokenize } from '@tokenometer/core';
import type { Format } from '@tokenometer/core';
import { toMcpError } from '../errors.js';
import { EstimateCostInput } from '../schemas.js';
import type { ToolDef, ToolResult } from './types.js';

const DEFAULT_FORMAT: Format = 'text';

export const estimateCost: ToolDef<typeof EstimateCostInput> = {
  name: 'estimate_cost',
  description:
    'Estimate input (and optional output) token cost for a single prompt + model. Uses the offline tokenizer for the provider (cl100k for Anthropic, o200k for OpenAI, chars/4 heuristic for Google/Cohere, SentencePiece for Mistral V1/V2/V3).',
  schema: EstimateCostInput,
  handler: async (input) => {
    try {
      const format = input.format ?? DEFAULT_FORMAT;
      const cell = tokenize({ format, modelId: input.model, prompt: input.text });
      const rate = getRate(input.model);
      // Touch getModel to surface UserFacingError early for unknown models even
      // when tokenize() happens to succeed first. (Defensive; tokenize already
      // calls it, but this keeps the error path consistent.)
      getModel(input.model);

      const outputTokens = input.outputTokens;
      const outputCost =
        outputTokens !== undefined ? (outputTokens / 1000) * rate.outputPer1k : undefined;
      const totalCost = cell.inputCost + (outputCost ?? 0);

      const payload = {
        tokens: cell.inputTokens,
        inputCost: cell.inputCost,
        ...(outputCost !== undefined ? { outputCost } : {}),
        totalCost,
        model: cell.model,
        format: cell.format,
        approximate: cell.approximate,
        tokenizer: cell.tokenizer,
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
