import { describe, expect, it } from 'vitest';
import { type TokenometerResult, toSarif } from './format-sarif.js';
import { tokenizeMatrix } from './tokenize.js';

const sampleResult = (): TokenometerResult => ({
  files: [
    {
      path: 'prompts/a.md',
      results: tokenizeMatrix({
        formats: ['json', 'yaml'],
        modelIds: ['claude-opus-4-7', 'gpt-4o'],
        prompt: '{"hello":"world"}',
      }),
    },
    {
      path: 'prompts/b.md',
      results: tokenizeMatrix({
        formats: ['markdown'],
        modelIds: ['gpt-4o'],
        prompt: 'plain prose here',
      }),
    },
  ],
});

describe('toSarif', () => {
  it('produces a SARIF 2.1.0 root with the canonical schema URL', () => {
    const out = toSarif(sampleResult()) as Record<string, unknown>;
    expect(out.version).toBe('2.1.0');
    expect(out.$schema).toMatch(/sarif-schema-2\.1\.0\.json$/);
    expect(Array.isArray(out.runs)).toBe(true);
  });

  it('emits a single run with the Tokenometer tool driver', () => {
    type SarifLike = {
      runs: { tool: { driver: { name: string; version: string; informationUri: string } } }[];
    };
    const out = toSarif(sampleResult(), { toolVersion: '1.2.3' }) as unknown as SarifLike;
    expect(out.runs).toHaveLength(1);
    const driver = out.runs[0]?.tool.driver;
    expect(driver?.name).toBe('Tokenometer');
    expect(driver?.version).toBe('1.2.3');
    expect(driver?.informationUri).toBe('https://github.com/faraa2m/tokenometer');
  });

  it('falls back to "0.0.0" when toolVersion is omitted', () => {
    type SarifLike = { runs: { tool: { driver: { version: string } } }[] };
    const out = toSarif({ files: [] }) as unknown as SarifLike;
    expect(out.runs[0]?.tool.driver.version).toBe('0.0.0');
  });

  it('emits one result per (file × model × format) cell', () => {
    type SarifLike = {
      runs: {
        results: { ruleId: string; level: string; locations: { physicalLocation: unknown }[] }[];
      }[];
    };
    const input = sampleResult();
    const expectedCells = input.files.reduce((acc, f) => acc + f.results.length, 0);
    const out = toSarif(input) as unknown as SarifLike;
    const results = out.runs[0]?.results ?? [];
    expect(results).toHaveLength(expectedCells);
    expect(results.every((r) => r.ruleId === 'prompt-cost')).toBe(true);
    expect(results.every((r) => r.level === 'note')).toBe(true);
    expect(results.every((r) => r.locations.length === 1)).toBe(true);
  });

  it('attaches the file path to each result location', () => {
    type SarifLike = {
      runs: {
        results: {
          message: { text: string };
          locations: { physicalLocation: { artifactLocation: { uri: string } } }[];
        }[];
      }[];
    };
    const out = toSarif(sampleResult()) as unknown as SarifLike;
    const results = out.runs[0]?.results ?? [];
    expect(
      results.some((r) => r.locations[0]?.physicalLocation.artifactLocation.uri === 'prompts/a.md'),
    ).toBe(true);
    expect(
      results.some((r) => r.locations[0]?.physicalLocation.artifactLocation.uri === 'prompts/b.md'),
    ).toBe(true);
  });

  it('result message references model, format, tokens, and a dollar-prefixed cost', () => {
    type SarifLike = { runs: { results: { message: { text: string } }[] }[] };
    const out = toSarif(sampleResult()) as unknown as SarifLike;
    const text = out.runs[0]?.results[0]?.message.text ?? '';
    expect(text).toMatch(/tokens/);
    expect(text).toMatch(/\$/);
    expect(text).toMatch(/\//);
  });

  it('handles an empty file list', () => {
    type SarifLike = { runs: { results: unknown[] }[] };
    const out = toSarif({ files: [] }) as unknown as SarifLike;
    expect(out.runs[0]?.results).toEqual([]);
  });
});
