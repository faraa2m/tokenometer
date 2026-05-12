import { getModel, tokenizeEmpirical } from '@tokenometer/core';
import type { Format, TokenizeResult } from '@tokenometer/core';
import { readEnv } from '../env.js';
import { toMcpError } from '../errors.js';
import { CountTokensEmpiricalMatrixInput } from '../schemas.js';
import type { ToolDef, ToolResult } from './types.js';

const DEFAULT_FORMATS: readonly Format[] = ['text'];

const REQUIRED_KEY: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  cohere: 'COHERE_API_KEY',
  google: 'GOOGLE_API_KEY',
  openai: '',
  mistral: '',
};

const ENV_FIELD: Record<string, 'anthropicApiKey' | 'cohereApiKey' | 'googleApiKey' | undefined> = {
  anthropic: 'anthropicApiKey',
  cohere: 'cohereApiKey',
  google: 'googleApiKey',
};

type CellOk = TokenizeResult;
type CellErr = { isError: true; model: string; format: Format; code: string; message: string };

export const countTokensEmpiricalMatrix: ToolDef<typeof CountTokensEmpiricalMatrixInput> = {
  name: 'count_tokens_empirical_matrix',
  description:
    'Run empirical token counts across the cross-product of models and formats. Per-cell errors (e.g. missing API key, unsupported provider) are returned inline rather than aborting the whole matrix.',
  schema: CountTokensEmpiricalMatrixInput,
  handler: async (input) => {
    try {
      const formats: readonly Format[] = input.formats ?? DEFAULT_FORMATS;
      const env = readEnv();

      const tasks: Promise<CellOk | CellErr>[] = [];
      for (const modelId of input.models) {
        for (const format of formats) {
          tasks.push(
            (async (): Promise<CellOk | CellErr> => {
              try {
                const model = getModel(modelId);
                const requiredVar = REQUIRED_KEY[model.provider];
                if (requiredVar) {
                  const fieldKey = ENV_FIELD[model.provider];
                  if (!fieldKey || !env[fieldKey]) {
                    return {
                      isError: true,
                      model: modelId,
                      format,
                      code: 'key_missing',
                      message: `Missing ${requiredVar}`,
                    };
                  }
                }
                return await tokenizeEmpirical({
                  env,
                  format,
                  modelId,
                  prompt: input.text,
                });
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                return {
                  isError: true,
                  model: modelId,
                  format,
                  code: 'provider_error',
                  message,
                };
              }
            })(),
          );
        }
      }
      const results = await Promise.all(tasks);
      const payload = { results };
      const result: ToolResult = {
        content: [{ type: 'text', text: JSON.stringify(payload) }],
      };
      return result;
    } catch (err) {
      return toMcpError(err);
    }
  },
};
