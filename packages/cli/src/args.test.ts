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
    expect(r.byFile).toBe(false);
    expect(r.output).toBe('table');
    expect(r.imagePaths).toEqual([]);
    expect(r.modelsSet).toBe(false);
    expect(r.formatsSet).toBe(false);
    expect(r.inputPathsSet).toBe(true);
    expect(r.noConfig).toBe(false);
    expect(r.configPath).toBeNull();
  });

  it('parses --model with comma-separated ids', () => {
    const r = parseArgs(['p.md', '--model', 'claude-opus-4-7,gpt-4o']);
    expect(r.modelIds).toEqual(['claude-opus-4-7', 'gpt-4o']);
    expect(r.modelsSet).toBe(true);
  });

  it('parses --format and validates each value', () => {
    const r = parseArgs(['p.md', '--format', 'yaml,json']);
    expect(r.formats).toEqual(['yaml', 'json']);
    expect(r.formatsSet).toBe(true);
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

  it('parses --by-file as a boolean flag', () => {
    expect(parseArgs(['p.md', '--by-file']).byFile).toBe(true);
    expect(parseArgs(['p.md']).byFile).toBe(false);
  });

  it('parses --output table|json|sarif and rejects others', () => {
    expect(parseArgs(['p.md', '--output', 'json']).output).toBe('json');
    expect(parseArgs(['p.md', '--output', 'sarif']).output).toBe('sarif');
    expect(parseArgs(['p.md', '--output', 'table']).output).toBe('table');
    expect(() => parseArgs(['p.md', '--output', 'csv'])).toThrow(/Unknown --output/);
  });

  it('--output requires a value', () => {
    expect(() => parseArgs(['p.md', '--output'])).toThrow(/--output requires a value/);
  });

  it('parses repeated --image into imagePaths', () => {
    const r = parseArgs(['p.md', '--image', 'a.png', '--image', 'b.jpg']);
    expect(r.imagePaths).toEqual(['a.png', 'b.jpg']);
  });

  it('--image requires a value', () => {
    expect(() => parseArgs(['p.md', '--image'])).toThrow(/--image requires a value/);
  });

  it('parses --no-config and --config <path>', () => {
    expect(parseArgs(['p.md', '--no-config']).noConfig).toBe(true);
    const r = parseArgs(['p.md', '--config', './tokenometer.yml']);
    expect(r.configPath).toBe('./tokenometer.yml');
  });

  it('--config requires a value', () => {
    expect(() => parseArgs(['p.md', '--config'])).toThrow(/--config requires a value/);
  });

  it('marks modelsSet/formatsSet only when user passes them', () => {
    const r = parseArgs(['p.md']);
    expect(r.modelsSet).toBe(false);
    expect(r.formatsSet).toBe(false);
  });

  it('--latency parses as a boolean and implies --empirical', () => {
    const r = parseArgs(['p.md', '--latency']);
    expect(r.latency).toBe(true);
    expect(r.empirical).toBe(true);
  });

  it('--latency without explicit --max-spend bumps the default ceiling to $0.25', () => {
    const r = parseArgs(['p.md', '--latency']);
    expect(r.maxSpend).toBeCloseTo(0.25);
    expect(r.maxSpendSet).toBe(false);
  });

  it('--latency with explicit --max-spend keeps the user value', () => {
    const r = parseArgs(['p.md', '--latency', '--max-spend', '0.40']);
    expect(r.maxSpend).toBeCloseTo(0.4);
    expect(r.maxSpendSet).toBe(true);
  });

  it('--latency-trials defaults to 3 and parses an integer in [1,10]', () => {
    expect(parseArgs(['p.md']).latencyTrials).toBe(3);
    expect(parseArgs(['p.md', '--latency-trials', '5']).latencyTrials).toBe(5);
    expect(parseArgs(['p.md', '--latency-trials', '1']).latencyTrials).toBe(1);
    expect(parseArgs(['p.md', '--latency-trials', '10']).latencyTrials).toBe(10);
  });

  it('--latency-trials rejects out-of-range and non-integer values', () => {
    expect(() => parseArgs(['p.md', '--latency-trials', '0'])).toThrow(/between 1 and 10/);
    expect(() => parseArgs(['p.md', '--latency-trials', '11'])).toThrow(/between 1 and 10/);
    expect(() => parseArgs(['p.md', '--latency-trials', 'abc'])).toThrow(/between 1 and 10/);
  });

  it('--latency-trials requires a value', () => {
    expect(() => parseArgs(['p.md', '--latency-trials'])).toThrow(
      /--latency-trials requires a value/,
    );
  });
});
