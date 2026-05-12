import { RATES_VERSION } from '@tokenometer/core';
import { toMcpError } from '../errors.js';
import { GetRatesVersionInput } from '../schemas.js';
import type { ToolDef, ToolResult } from './types.js';

export const getRatesVersion: ToolDef<typeof GetRatesVersionInput> = {
  name: 'get_rates_version',
  description:
    'Return the version stamp of the rates dataset bundled with this server. Use this to detect when pricing data may be stale relative to a published date.',
  schema: GetRatesVersionInput,
  handler: async () => {
    try {
      const payload = { ratesVersion: RATES_VERSION };
      const result: ToolResult = {
        content: [{ type: 'text', text: JSON.stringify(payload) }],
      };
      return result;
    } catch (err) {
      return toMcpError(err);
    }
  },
};
