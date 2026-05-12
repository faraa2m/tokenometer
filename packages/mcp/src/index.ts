#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

const main = async (): Promise<void> => {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Logs to stderr only — stdout is reserved for the protocol.
  process.stderr.write('tokenometer-mcp ready\n');
  const cleanup = (): void => {
    void transport.close();
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
};

main().catch((err: unknown) => {
  process.stderr.write(`tokenometer-mcp fatal: ${(err as Error).message}\n`);
  process.exit(1);
});
