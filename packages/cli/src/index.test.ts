import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { main } from './index.js';

class CaptureStream extends Writable {
  chunks: string[] = [];
  override _write(
    chunk: Buffer | string,
    _enc: BufferEncoding,
    cb: (err?: Error | null) => void,
  ): void {
    this.chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'));
    cb();
  }
  text(): string {
    return this.chunks.join('');
  }
}

const makeStreams = (): { stdout: CaptureStream; stderr: CaptureStream } => ({
  stderr: new CaptureStream(),
  stdout: new CaptureStream(),
});

const writePrompt = (dir: string, name: string, body: string): string => {
  const p = join(dir, name);
  writeFileSync(p, body);
  return p;
};

describe('main (integration)', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'tokenometer-cli-'));
  });

  afterEach(() => {
    rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('renders a table by default and exits 0', async () => {
    const file = writePrompt(tmpRoot, 'p.md', 'hello world');
    const { stdout, stderr } = makeStreams();
    const code = await main([file, '--no-config'], {
      stderr: stderr as unknown as NodeJS.WriteStream,
      stdout: stdout as unknown as NodeJS.WriteStream,
    });
    expect(code).toBe(0);
    const out = stdout.text();
    expect(out).toContain('claude-opus-4-7');
    expect(out).toMatch(/tokens/);
  });

  it('emits valid JSON for --output json including a parseable files array', async () => {
    const file = writePrompt(tmpRoot, 'p.md', 'hello world');
    const { stdout, stderr } = makeStreams();
    const code = await main([file, '--output', 'json', '--no-config'], {
      stderr: stderr as unknown as NodeJS.WriteStream,
      stdout: stdout as unknown as NodeJS.WriteStream,
    });
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.text());
    expect(Array.isArray(parsed.files)).toBe(true);
    expect(parsed.files[0].path).toBe(file);
    expect(parsed.files[0].results.length).toBeGreaterThan(0);
  });

  it('emits SARIF 2.1.0 for --output sarif', async () => {
    const file = writePrompt(tmpRoot, 'p.md', 'hello world');
    const { stdout, stderr } = makeStreams();
    const code = await main([file, '--output', 'sarif', '--no-config'], {
      stderr: stderr as unknown as NodeJS.WriteStream,
      stdout: stdout as unknown as NodeJS.WriteStream,
    });
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.text());
    expect(parsed.version).toBe('2.1.0');
    expect(Array.isArray(parsed.runs)).toBe(true);
    expect(parsed.runs[0].tool.driver.name).toBe('Tokenometer');
    expect(parsed.runs[0].results.length).toBeGreaterThan(0);
  });

  it('--by-file with multi-file input renders a per-file table', async () => {
    const f1 = writePrompt(tmpRoot, 'a.md', 'first prompt');
    const f2 = writePrompt(tmpRoot, 'b.md', 'second prompt is longer');
    const { stdout, stderr } = makeStreams();
    const code = await main([f1, f2, '--by-file', '--no-config', '--format', 'json'], {
      stderr: stderr as unknown as NodeJS.WriteStream,
      stdout: stdout as unknown as NodeJS.WriteStream,
    });
    expect(code).toBe(0);
    const out = stdout.text();
    expect(out).toContain('By file:');
    expect(out).toContain('a.md');
    expect(out).toContain('b.md');
  });

  it('--by-file with single-file input is a no-op (no By file: section)', async () => {
    const file = writePrompt(tmpRoot, 'p.md', 'hello world');
    const { stdout, stderr } = makeStreams();
    const code = await main([file, '--by-file', '--no-config'], {
      stderr: stderr as unknown as NodeJS.WriteStream,
      stdout: stdout as unknown as NodeJS.WriteStream,
    });
    expect(code).toBe(0);
    expect(stdout.text()).not.toContain('By file:');
  });

  it('--image factors vision tokens into the per-cell table and adds a [vision] virtual file', async () => {
    const file = writePrompt(tmpRoot, 'p.md', 'hello world');
    const { stdout, stderr } = makeStreams();
    const code = await main(
      [file, '--image', 'fake.png', '--by-file', '--no-config', '--format', 'json'],
      {
        imageSizeReader: async () => ({ height: 600, width: 800 }),
        stderr: stderr as unknown as NodeJS.WriteStream,
        stdout: stdout as unknown as NodeJS.WriteStream,
      },
    );
    expect(code).toBe(0);
    const out = stdout.text();
    expect(out).toContain('fake.png [vision]');
    // by-file table should mention the [vision] virtual file.
    expect(out).toContain('By file:');
  });

  it('--image with --output json includes a [vision] virtual file in files[]', async () => {
    const file = writePrompt(tmpRoot, 'p.md', 'hello');
    const { stdout, stderr } = makeStreams();
    const code = await main([file, '--image', 'shot.png', '--output', 'json', '--no-config'], {
      imageSizeReader: async () => ({ height: 600, width: 800 }),
      stderr: stderr as unknown as NodeJS.WriteStream,
      stdout: stdout as unknown as NodeJS.WriteStream,
    });
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.text());
    const paths: string[] = parsed.files.map((f: { path: string }) => f.path);
    expect(paths).toContain('shot.png [vision]');
  });

  it('rejects unknown flags with exit 2 and a short usage hint (not the full help)', async () => {
    const { stdout, stderr } = makeStreams();
    const code = await main(['--unknown'], {
      stderr: stderr as unknown as NodeJS.WriteStream,
      stdout: stdout as unknown as NodeJS.WriteStream,
    });
    expect(code).toBe(2);
    const err = stderr.text();
    expect(err).toMatch(/Unknown flag/);
    expect(err).toMatch(/Run 'tokenometer --help'/);
    // Short hint only — no full HELP_TEXT body, which would dump every model id.
    expect(err).not.toContain('USAGE');
    expect(err).not.toContain('EXAMPLES');
  });

  it('unknown model exits 1 with a clean message (no stack trace)', async () => {
    const file = writePrompt(tmpRoot, 'p.md', 'hello');
    const { stdout, stderr } = makeStreams();
    const code = await main([file, '--model', 'not-a-real-model', '--no-config'], {
      stderr: stderr as unknown as NodeJS.WriteStream,
      stdout: stdout as unknown as NodeJS.WriteStream,
    });
    expect(code).toBe(1);
    const err = stderr.text();
    expect(err).toMatch(/^tokenometer: /);
    expect(err).toMatch(/Unknown model "not-a-real-model"/);
    // No stack frames in user-facing errors.
    expect(err).not.toMatch(/\bat \w/);
  });

  it('--empirical without the matching API key exits 1 with a clean message (no stack trace)', async () => {
    const file = writePrompt(tmpRoot, 'p.md', 'hello');
    const original = process.env.ANTHROPIC_API_KEY;
    Reflect.deleteProperty(process.env, 'ANTHROPIC_API_KEY');
    try {
      const { stdout, stderr } = makeStreams();
      const code = await main(
        [file, '--empirical', '--max-spend', '0.01', '--model', 'claude-opus-4-7', '--no-config'],
        {
          stderr: stderr as unknown as NodeJS.WriteStream,
          stdout: stdout as unknown as NodeJS.WriteStream,
        },
      );
      expect(code).toBe(1);
      const err = stderr.text();
      expect(err).toMatch(/^tokenometer: /);
      expect(err).toMatch(/anthropic empirical mode requires ANTHROPIC_API_KEY/);
      expect(err).not.toMatch(/\bat \w/);
    } finally {
      if (original !== undefined) process.env.ANTHROPIC_API_KEY = original;
    }
  });

  it('--config <path> loads the named config and applies its models', async () => {
    const cfg = join(tmpRoot, 'cfg.yml');
    writeFileSync(cfg, 'models: [gpt-4o]\nformats: [json]\n');
    const file = writePrompt(tmpRoot, 'p.md', 'hello');
    const { stdout, stderr } = makeStreams();
    const code = await main([file, '--config', cfg, '--output', 'json'], {
      stderr: stderr as unknown as NodeJS.WriteStream,
      stdout: stdout as unknown as NodeJS.WriteStream,
    });
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.text());
    const models = new Set<string>(
      parsed.files.flatMap((f: { results: { model: string }[] }) => f.results.map((r) => r.model)),
    );
    expect(models).toEqual(new Set(['gpt-4o']));
  });

  it('--config <path> error reports the offending file', async () => {
    const cfg = join(tmpRoot, 'cfg.yml');
    writeFileSync(cfg, 'models: [not-a-real-model]\n');
    const file = writePrompt(tmpRoot, 'p.md', 'hello');
    const { stdout, stderr } = makeStreams();
    const code = await main([file, '--config', cfg], {
      stderr: stderr as unknown as NodeJS.WriteStream,
      stdout: stdout as unknown as NodeJS.WriteStream,
    });
    expect(code).toBe(1);
    expect(stderr.text()).toContain(cfg);
    expect(stderr.text()).toMatch(/unknown model/);
  });

  it('--no-config skips config loading entirely', async () => {
    // Place a config in a temp dir then chdir; --no-config should ignore it.
    // We can't easily change cwd here without affecting other tests, so just
    // verify the flag is accepted and main() proceeds with defaults.
    const file = writePrompt(tmpRoot, 'p.md', 'hello');
    const { stdout, stderr } = makeStreams();
    const code = await main([file, '--no-config', '--output', 'json'], {
      stderr: stderr as unknown as NodeJS.WriteStream,
      stdout: stdout as unknown as NodeJS.WriteStream,
    });
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.text());
    expect(parsed.files[0].path).toBe(file);
  });

  it('--by-file with --image and no prompt files still emits the by-file table', async () => {
    const { stdout, stderr } = makeStreams();
    const code = await main(['--image', 'a.png', '--image', 'b.png', '--by-file', '--no-config'], {
      imageSizeReader: async () => ({ height: 600, width: 800 }),
      stderr: stderr as unknown as NodeJS.WriteStream,
      stdout: stdout as unknown as NodeJS.WriteStream,
    });
    expect(code).toBe(0);
    const out = stdout.text();
    expect(out).toContain('a.png [vision]');
    expect(out).toContain('b.png [vision]');
  });

  it('errors out when no input files and no images are provided', async () => {
    const { stdout, stderr } = makeStreams();
    const code = await main(['--no-config', '--model', 'gpt-4o'], {
      // Stdin would block; we provide no positionals AND --no-config so
      // there's no resolved input. The main() check guards this.
      stderr: stderr as unknown as NodeJS.WriteStream,
      stdout: stdout as unknown as NodeJS.WriteStream,
    });
    expect(code).toBe(1);
    expect(stderr.text()).toMatch(/No input files/);
  });

  it('--latency populates per-cell latency block in JSON output', async () => {
    const file = writePrompt(tmpRoot, 'p.md', 'hello world');
    const { stdout, stderr } = makeStreams();
    const measureLatencyFn = async () => ({
      trials: [{ ttftMs: 100, totalMs: 500, outputTokens: 50, tokensPerSec: 125 }],
      p50: { ttftMs: 100, totalMs: 500, tokensPerSec: 125 },
      p95: { ttftMs: 100, totalMs: 500, tokensPerSec: 125 },
      mean: { ttftMs: 100, totalMs: 500, tokensPerSec: 125 },
    });
    // gpt-4o is the fast path: empirical mode uses tiktoken locally so we
    // don't need any provider API keys for the empirical tokenize step.
    const code = await main(
      [
        file,
        '--latency',
        '--latency-trials',
        '1',
        '--model',
        'gpt-4o',
        '--output',
        'json',
        '--no-config',
      ],
      {
        measureLatencyFn,
        stderr: stderr as unknown as NodeJS.WriteStream,
        stdout: stdout as unknown as NodeJS.WriteStream,
      },
    );
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.text());
    const cell = parsed.files[0].results[0];
    expect(cell.latency).toBeDefined();
    expect(cell.latency.p50.ttftMs).toBe(100);
    expect(cell.latency.p50.totalMs).toBe(500);
    expect(cell.latency.trials).toHaveLength(1);
  });

  it('--latency renders latency columns in the table output', async () => {
    const file = writePrompt(tmpRoot, 'p.md', 'hello world');
    const { stdout, stderr } = makeStreams();
    const measureLatencyFn = async () => ({
      trials: [{ ttftMs: 250, totalMs: 1500, outputTokens: 200, tokensPerSec: 160 }],
      p50: { ttftMs: 250, totalMs: 1500, tokensPerSec: 160 },
      p95: { ttftMs: 250, totalMs: 1500, tokensPerSec: 160 },
      mean: { ttftMs: 250, totalMs: 1500, tokensPerSec: 160 },
    });
    const code = await main(
      [file, '--latency', '--latency-trials', '1', '--model', 'gpt-4o', '--no-config'],
      {
        measureLatencyFn,
        stderr: stderr as unknown as NodeJS.WriteStream,
        stdout: stdout as unknown as NodeJS.WriteStream,
      },
    );
    expect(code).toBe(0);
    const out = stdout.text();
    expect(out).toContain('p50 ttft');
    expect(out).toContain('p50 total');
    expect(out).toContain('tokens/s');
    expect(out).toContain('250 ms');
    expect(out).toContain('1500 ms');
    expect(out).toContain('latency:');
  });
});
