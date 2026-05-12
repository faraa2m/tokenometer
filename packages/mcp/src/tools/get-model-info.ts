import { RATES_VERSION, getModel, getRate } from '@tokenometer/core';
import { toMcpError } from '../errors.js';
import { GetModelInfoInput } from '../schemas.js';
import type { ToolDef, ToolResult } from './types.js';

export const getModelInfo: ToolDef<typeof GetModelInfoInput> = {
  name: 'get_model_info',
  description:
    'Return registry metadata for a model: provider, context window, max output tokens, input/output USD per 1k, and the rates dataset version.',
  schema: GetModelInfoInput,
  handler: async (input) => {
    try {
      const descriptor = getModel(input.model);
      const rate = getRate(input.model);
      const payload = {
        id: descriptor.id,
        provider: descriptor.provider,
        contextWindow: descriptor.contextWindow,
        maxOutput: descriptor.maxOutputTokens,
        ratePer1k: {
          input: rate.inputPer1k,
          output: rate.outputPer1k,
          ...(rate.cachedInputPer1k !== undefined ? { cachedInput: rate.cachedInputPer1k } : {}),
        },
        ratesVersion: RATES_VERSION,
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
