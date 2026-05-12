import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const DIST_ENTRY = join(here, '..', 'dist', 'index.js');
const HAS_BUILD = existsSync(DIST_ENTRY);

interface JsonRpcMessage {
  jsonrpc: '2.0';
  id?: number | string;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { code: number; message: string };
}

/**
 * Minimal stdio-mode MCP client for end-to-end testing. The protocol uses
 * newline-delimited JSON over stdin/stdout, so we write `${JSON.stringify(msg)}\n`
 * and split incoming stdout on `\n`. Each line is one JSON-RPC message.
 */
class StdioClient {
  private proc: ChildProcess | null = null;
  private buffer = '';
  private nextId = 1;
  private pending = new Map<number | string, (m: JsonRpcMessage) => void>();

  async start(): Promise<void> {
    const proc = spawn('node', [DIST_ENTRY], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });
    this.proc = proc;
    proc.stdout?.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString('utf8');
      while (true) {
        const nl = this.buffer.indexOf('\n');
        if (nl === -1) break;
        const line = this.buffer.slice(0, nl).trim();
        this.buffer = this.buffer.slice(nl + 1);
        if (!line) continue;
        let msg: JsonRpcMessage;
        try {
          msg = JSON.parse(line) as JsonRpcMessage;
        } catch {
          continue;
        }
        const id = msg.id;
        if (id !== undefined) {
          const handler = this.pending.get(id);
          if (handler) {
            this.pending.delete(id);
            handler(msg);
          }
        }
      }
    });
    // Wait for the ready line on stderr before doing the initialize handshake.
    await new Promise<void>((resolve) => {
      const onData = (chunk: Buffer): void => {
        if (chunk.toString('utf8').includes('tokenometer-mcp ready')) {
          proc.stderr?.off('data', onData);
          resolve();
        }
      };
      proc.stderr?.on('data', onData);
    });

    // initialize handshake
    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'e2e-test', version: '0.0.0' },
    });
    // initialized notification (no id, no response expected)
    this.notify('notifications/initialized', {});
  }

  request(method: string, params: Record<string, unknown>): Promise<JsonRpcMessage> {
    const id = this.nextId++;
    const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    return new Promise<JsonRpcMessage>((resolve) => {
      this.pending.set(id, resolve);
      this.proc?.stdin?.write(`${msg}\n`);
    });
  }

  notify(method: string, params: Record<string, unknown>): void {
    const msg = JSON.stringify({ jsonrpc: '2.0', method, params });
    this.proc?.stdin?.write(`${msg}\n`);
  }

  stop(): void {
    this.proc?.kill('SIGTERM');
  }
}

describe.skipIf(!HAS_BUILD)('e2e via spawned stdio server', () => {
  const client = new StdioClient();

  beforeAll(async () => {
    await client.start();
  }, 30_000);

  afterAll(() => {
    client.stop();
  });

  it('lists the registered tools', async () => {
    const response = await client.request('tools/list', {});
    const result = response.result as { tools: Array<{ name: string }> };
    const names = result.tools.map((t) => t.name);
    expect(names).toContain('estimate_cost');
    expect(names).toContain('list_models');
    expect(names).toContain('get_rates_version');
  });

  it('calls estimate_cost and returns a parseable payload', async () => {
    const response = await client.request('tools/call', {
      name: 'estimate_cost',
      arguments: { text: 'hello world', model: 'gpt-4o' },
    });
    const result = response.result as {
      content: Array<{ type: string; text: string }>;
      isError?: boolean;
    };
    expect(result.isError).toBeFalsy();
    const payload = JSON.parse(result.content[0]?.text ?? '{}') as { tokens: number };
    expect(payload.tokens).toBeGreaterThan(0);
  });

  it('returns isError for an unknown tool name', async () => {
    const response = await client.request('tools/call', {
      name: 'does_not_exist',
      arguments: {},
    });
    const result = response.result as {
      content: Array<{ type: string; text: string }>;
      isError?: boolean;
    };
    expect(result.isError).toBe(true);
    const payload = JSON.parse(result.content[0]?.text ?? '{}') as { code: string };
    expect(payload.code).toBe('unknown_tool');
  });
});
