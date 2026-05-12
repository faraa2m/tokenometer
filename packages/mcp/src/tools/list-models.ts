import { MODELS } from '@tokenometer/core';
import type { ModelDescriptor } from '@tokenometer/core';
import { toMcpError } from '../errors.js';
import { ListModelsInput } from '../schemas.js';
import type { ToolDef, ToolResult } from './types.js';

export const listModels: ToolDef<typeof ListModelsInput> = {
  name: 'list_models',
  description:
    'List every registered model in the rates registry, optionally filtered by provider. Each entry includes id, provider, context window, max output tokens, and pricing source.',
  schema: ListModelsInput,
  handler: async (input) => {
    try {
      const all: ModelDescriptor[] = Object.values(MODELS);
      const filtered =
        input.provider !== undefined ? all.filter((m) => m.provider === input.provider) : all;
      const payload = { models: filtered };
      const result: ToolResult = {
        content: [{ type: 'text', text: JSON.stringify(payload) }],
      };
      return result;
    } catch (err) {
      return toMcpError(err);
    }
  },
};
