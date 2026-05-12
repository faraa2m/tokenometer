import {
  anthropicVisionTokens,
  getModel,
  getRate,
  googleVisionTokens,
  openaiVisionTokens,
} from '@tokenometer/core';
import type { Provider } from '@tokenometer/core';
import { errorResult, toMcpError } from '../errors.js';
import { EstimateVisionCostInput } from '../schemas.js';
import type { ToolDef, ToolResult } from './types.js';

const computeTokens = (
  provider: Provider,
  img: { width: number; height: number; detail?: 'low' | 'high' | 'auto' | undefined },
): number => {
  switch (provider) {
    case 'anthropic':
      return anthropicVisionTokens(
        img.detail !== undefined
          ? { width: img.width, height: img.height, detail: img.detail }
          : { width: img.width, height: img.height },
      );
    case 'openai':
      return openaiVisionTokens(
        img.detail !== undefined
          ? { width: img.width, height: img.height, detail: img.detail }
          : { width: img.width, height: img.height },
      );
    case 'google':
      return googleVisionTokens(
        img.detail !== undefined
          ? { width: img.width, height: img.height, detail: img.detail }
          : { width: img.width, height: img.height },
      );
    default:
      throw new Error(`Vision tokens not supported for provider "${provider}"`);
  }
};

export const estimateVisionCost: ToolDef<typeof EstimateVisionCostInput> = {
  name: 'estimate_vision_cost',
  description:
    "Estimate vision-token cost for one or more images using the provider's published formula (Anthropic, OpenAI, or Google). Optionally include `model` to get per-image USD using that model's input rate. Mistral and Cohere are not supported.",
  schema: EstimateVisionCostInput,
  handler: async (input) => {
    try {
      if (input.provider === 'mistral' || input.provider === 'cohere') {
        return errorResult({
          code: 'unsupported_provider',
          message: `Vision tokens are not published for provider "${input.provider}". Use anthropic, openai, or google.`,
        });
      }

      const inputPer1k = (() => {
        if (input.model === undefined) return undefined;
        const model = getModel(input.model);
        if (model.provider !== input.provider) {
          throw new Error(
            `Model "${input.model}" belongs to provider "${model.provider}" but request specifies "${input.provider}".`,
          );
        }
        return getRate(input.model).inputPer1k;
      })();

      const images = input.images.map((img) => {
        const tokens = computeTokens(input.provider, img);
        const costUsd = inputPer1k !== undefined ? (tokens / 1000) * inputPer1k : undefined;
        return {
          width: img.width,
          height: img.height,
          ...(img.detail !== undefined ? { detail: img.detail } : {}),
          tokens,
          ...(costUsd !== undefined ? { costUsd } : {}),
        };
      });

      const totalTokens = images.reduce((sum, i) => sum + i.tokens, 0);
      const totalCostUsd = images.reduce<number | undefined>((sum, i) => {
        if (i.costUsd === undefined) return sum;
        return (sum ?? 0) + i.costUsd;
      }, undefined);

      const payload = {
        provider: input.provider,
        ...(input.model !== undefined ? { model: input.model } : {}),
        images,
        totalTokens,
        ...(totalCostUsd !== undefined ? { totalCostUsd } : {}),
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
