import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { encode as encodeO200k } from 'gpt-tokenizer/encoding/o200k_base';
import { toFormat } from './convert.js';
import { getModel, getRate } from './rates.js';
import type { Format, Provider, TokenizeResult } from './types.js';

export interface EmpiricalCountResult {
  count: number;
  exact: true;
  source: 'anthropic-count' | 'gemini-count' | 'tiktoken-o200k';
}

export interface EmpiricalEnv {
  anthropicApiKey?: string;
  googleApiKey?: string;
}

const requireKey = (env: EmpiricalEnv, key: keyof EmpiricalEnv, provider: Provider): string => {
  const value = env[key];
  if (!value) {
    throw new Error(
      `${provider} empirical mode requires ${key === 'anthropicApiKey' ? 'ANTHROPIC_API_KEY' : 'GOOGLE_API_KEY'} (or GEMINI_API_KEY)`,
    );
  }
  return value;
};

const countAnthropic = async (
  text: string,
  modelId: string,
  env: EmpiricalEnv,
): Promise<EmpiricalCountResult> => {
  const apiKey = requireKey(env, 'anthropicApiKey', 'anthropic');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const result = await client.messages.countTokens({
    messages: [{ content: text, role: 'user' }],
    model: modelId,
  });
  return { count: result.input_tokens, exact: true, source: 'anthropic-count' };
};

const countGoogle = async (
  text: string,
  modelId: string,
  env: EmpiricalEnv,
): Promise<EmpiricalCountResult> => {
  const apiKey = requireKey(env, 'googleApiKey', 'google');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId });
  const result = await model.countTokens(text);
  return { count: result.totalTokens, exact: true, source: 'gemini-count' };
};

const countOpenAi = (text: string): EmpiricalCountResult => ({
  count: encodeO200k(text).length,
  exact: true,
  source: 'tiktoken-o200k',
});

export interface TokenizeEmpiricalOptions {
  env: EmpiricalEnv;
  format: Format;
  modelId: string;
  prompt: string;
}

export const tokenizeEmpirical = async (
  options: TokenizeEmpiricalOptions,
): Promise<TokenizeResult> => {
  const model = getModel(options.modelId);
  const rate = getRate(options.modelId);
  const converted = toFormat(options.prompt, options.format);
  let result: EmpiricalCountResult;
  switch (model.provider) {
    case 'anthropic':
      result = await countAnthropic(converted, model.id, options.env);
      break;
    case 'google':
      result = await countGoogle(converted, model.id, options.env);
      break;
    case 'openai':
      result = countOpenAi(converted);
      break;
  }
  return {
    approximate: false,
    format: options.format,
    inputCost: (result.count / 1000) * rate.inputPer1k,
    inputTokens: result.count,
    model: model.id,
    provider: model.provider,
    tokenizer: result.source === 'tiktoken-o200k' ? 'o200k_base' : 'heuristic',
  };
};

export interface TokenizeMatrixEmpiricalOptions {
  env: EmpiricalEnv;
  formats: readonly Format[];
  modelIds: readonly string[];
  prompt: string;
}

export const tokenizeMatrixEmpirical = async (
  options: TokenizeMatrixEmpiricalOptions,
): Promise<TokenizeResult[]> => {
  const tasks: Promise<TokenizeResult>[] = [];
  for (const modelId of options.modelIds) {
    for (const format of options.formats) {
      tasks.push(
        tokenizeEmpirical({
          env: options.env,
          format,
          modelId,
          prompt: options.prompt,
        }),
      );
    }
  }
  return Promise.all(tasks);
};
