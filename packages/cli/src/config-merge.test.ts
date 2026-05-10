import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseArgs } from './args.js';
import { applyConfig, loadConfigFromPath } from './config-merge.js';

describe('applyConfig', () => {
  it('is a no-op when config is null', () => {
    const args = parseArgs(['p.md']);
    const after = applyConfig(args, { config: null });
    expect(after).toEqual(args);
  });

  it('fills in models from config when --model was not user-set', () => {
    const args = parseArgs(['p.md']);
    const after = applyConfig(args, { config: { models: ['gpt-4o'] } });
    expect(after.modelIds).toEqual(['gpt-4o']);
  });

  it('does NOT override user-passed --model', () => {
    const args = parseArgs(['p.md', '--model', 'claude-opus-4-7']);
    const after = applyConfig(args, { config: { models: ['gpt-4o'] } });
    expect(after.modelIds).toEqual(['claude-opus-4-7']);
  });

  it('fills in formats from config when --format was not user-set', () => {
    const args = parseArgs(['p.md']);
    const after = applyConfig(args, { config: { formats: ['json'] } });
    expect(after.formats).toEqual(['json']);
  });

  it('does NOT override user-passed --format', () => {
    const args = parseArgs(['p.md', '--format', 'yaml']);
    const after = applyConfig(args, { config: { formats: ['json'] } });
    expect(after.formats).toEqual(['yaml']);
  });

  it('fills in inputPaths from config.paths when none were positional', () => {
    const args = parseArgs([]);
    const after = applyConfig(args, { config: { paths: ['prompts/a.md'] } });
    expect(after.inputPaths).toEqual(['prompts/a.md']);
  });

  it('does NOT override positional input paths', () => {
    const args = parseArgs(['cli.md']);
    const after = applyConfig(args, { config: { paths: ['cfg.md'] } });
    expect(after.inputPaths).toEqual(['cli.md']);
  });
});

describe('loadConfigFromPath', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'tokenometer-cfg-cli-'));
  });

  afterEach(() => {
    rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('parses a valid config file', async () => {
    const file = join(tmpRoot, 'tokenometer.yml');
    writeFileSync(file, 'models: [gpt-4o]\nformats: [json]\n');
    const cfg = await loadConfigFromPath(file);
    expect(cfg.models).toEqual(['gpt-4o']);
    expect(cfg.formats).toEqual(['json']);
  });

  it('throws including the file path on invalid model id', async () => {
    const file = join(tmpRoot, 'tokenometer.yml');
    writeFileSync(file, 'models: [not-a-model]\n');
    await expect(loadConfigFromPath(file)).rejects.toThrow(/Invalid config at/);
    await expect(loadConfigFromPath(file)).rejects.toThrow(file);
  });

  it('throws including the file path on invalid format', async () => {
    const file = join(tmpRoot, 'tokenometer.yml');
    writeFileSync(file, 'formats: [toml]\n');
    await expect(loadConfigFromPath(file)).rejects.toThrow(/Invalid config at/);
    await expect(loadConfigFromPath(file)).rejects.toThrow(/unknown format/);
  });

  it('throws including the path when the file does not exist', async () => {
    await expect(loadConfigFromPath(join(tmpRoot, 'nope.yml'))).rejects.toThrow(
      /Failed to read config/,
    );
  });
});
