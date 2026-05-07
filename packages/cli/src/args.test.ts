import { describe, expect, it } from 'vitest';
import { parseArgs } from './args.js';

describe('parseArgs', () => {
  it('returns sensible defaults with no flags', () => {
    const r = parseArgs(['./prompt.md']);
    expect(r.inputPaths).toEqual(['./prompt.md']);
    expect(r.modelIds).toEqual(['claude-opus-4-7']);
    expect(r.formats.length).toBeGreaterThan(0);
    expect(r.empirical).toBe(false);
    expect(r.maxSpend).toBeCloseTo(0.05);
  });

  it('parses --model with comma-separated ids', () => {
    const r = parseArgs(['p.md', '--model', 'claude-opus-4-7,gpt-4o']);
    expect(r.modelIds).toEqual(['claude-opus-4-7', 'gpt-4o']);
  });

  it('parses --format and validates each value', () => {
    const r = parseArgs(['p.md', '--format', 'yaml,json']);
    expect(r.formats).toEqual(['yaml', 'json']);
  });

  it('rejects unknown formats with a helpful message', () => {
    expect(() => parseArgs(['p.md', '--format', 'toml'])).toThrow(/Unknown format/);
  });

  it('parses --max-spend as positive number only', () => {
    const r = parseArgs(['p.md', '--max-spend', '0.10']);
    expect(r.maxSpend).toBeCloseTo(0.1);
    expect(() => parseArgs(['p.md', '--max-spend', '-1'])).toThrow(/positive number/);
  });

  it('treats -h and --help equivalently', () => {
    expect(parseArgs(['-h']).help).toBe(true);
    expect(parseArgs(['--help']).help).toBe(true);
  });

  it('rejects unknown flags', () => {
    expect(() => parseArgs(['--unknown'])).toThrow(/Unknown flag/);
  });
});
