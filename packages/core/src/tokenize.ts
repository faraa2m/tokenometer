import { toFormat } from './convert.js';
import { getModel, getRate } from './rates.js';
import type { Format, Provider, TokenizeResult } from './types.js';

const APPROX_CHARS_PER_TOKEN: Record<Provider, number> = {
  anthropic: 3.5,
  google: 4,
  openai: 4,
};

export const approxTokenCount = (text: string, provider: Provider): number => {
  const ratio = APPROX_CHARS_PER_TOKEN[provider];
  return Math.ceil(text.length / ratio);
};

export interface TokenizeOptions {
  format: Format;
  modelId: string;
  prompt: string;
}

export const tokenize = (options: TokenizeOptions): TokenizeResult => {
  const model = getModel(options.modelId);
  const rate = getRate(options.modelId);
  const converted = toFormat(options.prompt, options.format);
  const inputTokens = approxTokenCount(converted, model.provider);
  const inputCost = (inputTokens / 1000) * rate.inputPer1k;
  return {
    format: options.format,
    inputCost,
    inputTokens,
    model: model.id,
    provider: model.provider,
  };
};

export interface TokenizeMatrixOptions {
  formats: readonly Format[];
  modelIds: readonly string[];
  prompt: string;
}

export const tokenizeMatrix = (options: TokenizeMatrixOptions): TokenizeResult[] => {
  const results: TokenizeResult[] = [];
  for (const modelId of options.modelIds) {
    for (const format of options.formats) {
      results.push(tokenize({ format, modelId, prompt: options.prompt }));
    }
  }
  return results;
};
