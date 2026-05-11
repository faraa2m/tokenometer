import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { encode as encodeO200k } from 'gpt-tokenizer/encoding/o200k_base';
import { toFormat } from './convert.js';
import { UserFacingError } from './errors.js';
import { getModel, getRate } from './rates.js';
import { cohereTokenizeApi } from './tokenize-cohere.js';
import type { Format, Provider, TokenizeResult } from './types.js';

export interface EmpiricalCountResult {
  count: number;
  exact: true;
  source: 'anthropic-count' | 'cohere-tokenize' | 'gemini-count' | 'tiktoken-o200k';
}

export interface EmpiricalEnv {
  anthropicApiKey?: string;
  cohereApiKey?: string;
  googleApiKey?: string;
  // Used by `--latency` mode (see latency.ts). Not consumed by the
  // countTokens-based empirical path.
  mistralApiKey?: string;
  openaiApiKey?: string;
}

const ENV_VAR_NAME: Record<keyof EmpiricalEnv, string> = {
  anthropicApiKey: 'ANTHROPIC_API_KEY',
  cohereApiKey: 'COHERE_API_KEY',
  googleApiKey: 'GOOGLE_API_KEY',
  mistralApiKey: 'MISTRAL_API_KEY',
  openaiApiKey: 'OPENAI_API_KEY',
};

const requireKey = (env: EmpiricalEnv, key: keyof EmpiricalEnv, provider: Provider): string => {
  const value = env[key];
  if (!value) {
    const envName =
      key === 'googleApiKey' ? `${ENV_VAR_NAME[key]} (or GEMINI_API_KEY)` : ENV_VAR_NAME[key];
    throw new UserFacingError(`${provider} empirical mode requires ${envName}`);
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
  try {
    const result = await client.messages.countTokens({
      messages: [{ content: text, role: 'user' }],
      model: modelId,
    });
    return { count: result.input_tokens, exact: true, source: 'anthropic-count' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/CORS/i.test(message)) {
      throw new Error(
        'Anthropic blocked the browser request (org has custom retention settings that disable CORS). Run the CLI instead: `ANTHROPIC_API_KEY=... npx tokenometer prompt.md --empirical`. Same numbers, no CORS.',
      );
    }
    throw err;
  }
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

const countCohere = async (
  text: string,
  modelId: string,
  env: EmpiricalEnv,
): Promise<EmpiricalCountResult> => {
  const apiKey = requireKey(env, 'cohereApiKey', 'cohere');
  const count = await cohereTokenizeApi(text, modelId, apiKey);
  return { count, exact: true, source: 'cohere-tokenize' };
};

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
    case 'cohere':
      result = await countCohere(converted, model.id, options.env);
      break;
    case 'mistral':
      // Mistral does not expose a public free token-count endpoint as of
      // May 2026 (Mistral has no public token-count endpoint). Refuse
      // empirical mode rather than silently falling back to the offline
      // path — that would violate the `--empirical` contract (count is
      // exact). Users who want exact counts can call a metered chat
      // completion and read back `usage.prompt_tokens` themselves.
      throw new Error(
        'Mistral does not expose a public token-count API; offline mode only. ' +
          'For exact counts, send a chat completion to Mistral and read `usage.prompt_tokens`.',
      );
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
