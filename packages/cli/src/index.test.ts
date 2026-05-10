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

  it('rejects unknown flags with exit 2 and a stderr message', async () => {
    const { stdout, stderr } = makeStreams();
    const code = await main(['--unknown'], {
      stderr: stderr as unknown as NodeJS.WriteStream,
      stdout: stdout as unknown as NodeJS.WriteStream,
    });
    expect(code).toBe(2);
    expect(stderr.text()).toMatch(/Unknown flag/);
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
});
