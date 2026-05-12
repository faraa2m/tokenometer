import { getModel, measureLatency } from '@tokenometer/core';
import { readEnv } from '../env.js';
import { keyMissingError, toMcpError } from '../errors.js';
import { MeasureLatencyInput } from '../schemas.js';
import type { ToolDef, ToolResult } from './types.js';

const REQUIRED_KEY: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  cohere: 'COHERE_API_KEY',
  google: 'GOOGLE_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  openai: 'OPENAI_API_KEY',
};

const ENV_FIELD: Record<
  string,
  'anthropicApiKey' | 'cohereApiKey' | 'googleApiKey' | 'mistralApiKey' | 'openaiApiKey' | undefined
> = {
  anthropic: 'anthropicApiKey',
  cohere: 'cohereApiKey',
  google: 'googleApiKey',
  mistral: 'mistralApiKey',
  openai: 'openaiApiKey',
};

const DEFAULT_TRIALS = 3;

export const measureLatencyTool: ToolDef<typeof MeasureLatencyInput> = {
  name: 'measure_latency',
  description:
    'Run real metered streaming generations against the provider and report TTFT, total ms, and tokens/sec as p50/p95/mean. Each trial is a real (paid) chat completion. Requires the provider API key.',
  schema: MeasureLatencyInput,
  handler: async (input) => {
    try {
      const model = getModel(input.model);
      const requiredVar = REQUIRED_KEY[model.provider];
      const fieldKey = ENV_FIELD[model.provider];
      const env = readEnv();
      if (!fieldKey || !env[fieldKey]) {
        return keyMissingError(requiredVar ?? 'PROVIDER_API_KEY');
      }
      const trials = input.trials ?? DEFAULT_TRIALS;
      const latency = await measureLatency({
        env,
        modelId: input.model,
        prompt: input.prompt,
        trials,
        ...(input.maxTokens !== undefined ? { maxTokens: input.maxTokens } : {}),
      });
      const result: ToolResult = {
        content: [{ type: 'text', text: JSON.stringify(latency) }],
      };
      return result;
    } catch (err) {
      return toMcpError(err);
    }
  },
};
