import { getModel, tokenizeEmpirical } from '@tokenometer/core';
import type { Format } from '@tokenometer/core';
import { readEnv } from '../env.js';
import { keyMissingError, toMcpError } from '../errors.js';
import { CountTokensEmpiricalInput } from '../schemas.js';
import type { ToolDef, ToolResult } from './types.js';

const DEFAULT_FORMAT: Format = 'text';

const REQUIRED_KEY: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  cohere: 'COHERE_API_KEY',
  google: 'GOOGLE_API_KEY',
  openai: '', // OpenAI uses local tiktoken — no key needed.
  mistral: '', // Mistral has no public token-count API — empirical mode unsupported.
};

const ENV_FIELD: Record<string, 'anthropicApiKey' | 'cohereApiKey' | 'googleApiKey' | undefined> = {
  anthropic: 'anthropicApiKey',
  cohere: 'cohereApiKey',
  google: 'googleApiKey',
};

export const countTokensEmpirical: ToolDef<typeof CountTokensEmpiricalInput> = {
  name: 'count_tokens_empirical',
  description:
    "Count tokens using each provider's official countTokens API (free, exact). Anthropic via messages.countTokens, Google via model.countTokens, OpenAI via local tiktoken o200k_base, Cohere via POST /v1/tokenize. Mistral is unsupported (no public endpoint).",
  schema: CountTokensEmpiricalInput,
  handler: async (input) => {
    try {
      const model = getModel(input.model);
      const requiredVar = REQUIRED_KEY[model.provider];
      if (requiredVar) {
        const env = readEnv();
        const fieldKey = ENV_FIELD[model.provider];
        if (!fieldKey || !env[fieldKey]) {
          return keyMissingError(requiredVar);
        }
      }
      const format = input.format ?? DEFAULT_FORMAT;
      const cell = await tokenizeEmpirical({
        env: readEnv(),
        format,
        modelId: input.model,
        prompt: input.text,
      });
      const result: ToolResult = {
        content: [{ type: 'text', text: JSON.stringify(cell) }],
      };
      return result;
    } catch (err) {
      return toMcpError(err);
    }
  },
};
