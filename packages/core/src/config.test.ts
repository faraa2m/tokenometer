import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig, parseConfig } from './config.js';

describe('parseConfig', () => {
  it('parses a fully populated config', () => {
    const yaml = `
models: [claude-opus-4-7, gpt-4o]
formats: [json, markdown]
budgets:
  total: 0.5
  per-file: 0.1
paths: [prompts/**/*.md]
`;
    const cfg = parseConfig(yaml);
    expect(cfg.models).toEqual(['claude-opus-4-7', 'gpt-4o']);
    expect(cfg.formats).toEqual(['json', 'markdown']);
    expect(cfg.budgets).toEqual({ total: 0.5, 'per-file': 0.1 });
    expect(cfg.paths).toEqual(['prompts/**/*.md']);
  });

  it('returns an empty config for empty input', () => {
    expect(parseConfig('')).toEqual({});
    expect(parseConfig('   \n  ')).toEqual({});
  });

  it('throws on unknown model id', () => {
    expect(() => parseConfig('models: [not-a-real-model]')).toThrow(/unknown model/);
  });

  it('throws on unknown format', () => {
    expect(() => parseConfig('formats: [toml]')).toThrow(/unknown format/);
  });

  it('throws on negative budget', () => {
    expect(() => parseConfig('budgets:\n  total: -0.1')).toThrow(/non-negative/);
  });

  it('throws on non-numeric budget', () => {
    expect(() => parseConfig('budgets:\n  total: "free"')).toThrow(/non-negative/);
  });

  it('throws on unknown top-level key', () => {
    expect(() => parseConfig('weirdkey: 1')).toThrow(/unknown top-level key/);
  });

  it('throws on unknown budget key', () => {
    expect(() => parseConfig('budgets:\n  monthly: 1')).toThrow(/unknown budget key/);
  });

  it('throws when paths contains a non-string', () => {
    expect(() => parseConfig('paths: [1, 2]')).toThrow(/must be a string/);
  });

  it('throws when top-level is not a mapping', () => {
    expect(() => parseConfig('- one\n- two')).toThrow(/top-level must be a mapping/);
  });
});

describe('loadConfig', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'tokenometer-cfg-'));
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('returns null when no config file is found in the walk-up', async () => {
    // Create an inner directory with a fake .git so walk-up halts inside tmpRoot.
    const inner = join(tmpRoot, 'inner');
    mkdirSync(inner, { recursive: true });
    mkdirSync(join(tmpRoot, '.git'));
    expect(await loadConfig(inner)).toBeNull();
  });

  it('finds .tokenometer.yml in the cwd', async () => {
    writeFileSync(join(tmpRoot, '.tokenometer.yml'), 'models: [gpt-4o]\n');
    mkdirSync(join(tmpRoot, '.git'));
    const cfg = await loadConfig(tmpRoot);
    expect(cfg?.models).toEqual(['gpt-4o']);
  });

  it('walks up to find .tokenometer.yaml at a parent', async () => {
    writeFileSync(join(tmpRoot, '.tokenometer.yaml'), 'formats: [json]\n');
    mkdirSync(join(tmpRoot, '.git'));
    const nested = join(tmpRoot, 'a', 'b', 'c');
    mkdirSync(nested, { recursive: true });
    const cfg = await loadConfig(nested);
    expect(cfg?.formats).toEqual(['json']);
  });

  it('stops at git root and does not return parent configs', async () => {
    // Outer config above git root should be ignored.
    writeFileSync(join(tmpRoot, '.tokenometer.yml'), 'models: [gpt-4o]\n');
    const repo = join(tmpRoot, 'repo');
    mkdirSync(repo);
    mkdirSync(join(repo, '.git'));
    expect(await loadConfig(repo)).toBeNull();
  });
});
