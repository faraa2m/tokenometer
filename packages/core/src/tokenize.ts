import { encode as encodeCl100k } from 'gpt-tokenizer/encoding/cl100k_base';
import { encode as encodeO200k } from 'gpt-tokenizer/encoding/o200k_base';
import { toFormat } from './convert.js';
import { getModel, getRate } from './rates.js';
import type { Format, Provider, TokenizeResult, TokenizerKind } from './types.js';

const HEURISTIC_CHARS_PER_TOKEN: Record<Provider, number> = {
  anthropic: 3.5,
  google: 4,
  openai: 4,
};

const heuristicCount = (text: string, provider: Provider): number =>
  Math.ceil(text.length / HEURISTIC_CHARS_PER_TOKEN[provider]);

export interface CountResult {
  approximate: boolean;
  count: number;
  tokenizer: TokenizerKind;
}

export const countTokens = (text: string, provider: Provider): CountResult => {
  switch (provider) {
    case 'openai':
      return { approximate: false, count: encodeO200k(text).length, tokenizer: 'o200k_base' };
    case 'anthropic':
      return { approximate: true, count: encodeCl100k(text).length, tokenizer: 'cl100k_base' };
    case 'google':
      return {
        approximate: true,
        count: heuristicCount(text, 'google'),
        tokenizer: 'heuristic',
      };
  }
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
  const counted = countTokens(converted, model.provider);
  const inputCost = (counted.count / 1000) * rate.inputPer1k;
  return {
    approximate: counted.approximate,
    format: options.format,
    inputCost,
    inputTokens: counted.count,
    model: model.id,
    provider: model.provider,
    tokenizer: counted.tokenizer,
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
