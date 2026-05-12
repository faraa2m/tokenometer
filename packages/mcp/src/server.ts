import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { TOOLS } from './tools/index.js';
import type { ToolResult } from './tools/types.js';

const SERVER_NAME = 'tokenometer';
const SERVER_VERSION = '1.0.1';

/**
 * Build an MCP `Server` instance with the tokenometer tool set wired up.
 * Transport layering (stdio, sse, etc.) is handled separately by the
 * caller; this function just registers request handlers.
 */
export const createServer = (): Server => {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.schema, { target: 'jsonSchema7' }),
    })),
  }));

  const handleCallTool = async (req: {
    params: { name: string; arguments?: unknown };
  }): Promise<ToolResult> => {
    const tool = TOOLS.find((t) => t.name === req.params.name);
    if (!tool) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({ code: 'unknown_tool', name: req.params.name }),
          },
        ],
      };
    }
    const parsed = tool.schema.safeParse(req.params.arguments ?? {});
    if (!parsed.success) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({ code: 'invalid_args', issues: parsed.error.issues }),
          },
        ],
      };
    }
    return tool.handler(parsed.data);
  };

  // The SDK's request-handler signature has tightened across protocol versions
  // (newer types include an optional `task` field for long-running operations).
  // Our handler always returns a plain ToolResult; cast through `unknown` to
  // accommodate either signature without losing internal type safety.
  server.setRequestHandler(
    CallToolRequestSchema,
    handleCallTool as unknown as Parameters<typeof server.setRequestHandler>[1],
  );

  return server;
};
