import { describe, expect, it } from 'vitest';
import { allFormats, isFormat, toFormat } from './convert.js';

describe('convert', () => {
  describe('isFormat', () => {
    it('accepts known format strings', () => {
      expect(isFormat('json')).toBe(true);
      expect(isFormat('yaml')).toBe(true);
      expect(isFormat('xml')).toBe(true);
      expect(isFormat('markdown')).toBe(true);
      expect(isFormat('text')).toBe(true);
    });

    it('rejects unknown strings', () => {
      expect(isFormat('toml')).toBe(false);
      expect(isFormat('')).toBe(false);
    });
  });

  describe('toFormat', () => {
    const sample = '{"name":"alice","age":30}';

    it('text format flattens structured input (no braces/quotes)', () => {
      const out = toFormat(sample, 'text');
      expect(out).not.toContain('{');
      expect(out).not.toContain('"');
      expect(out).toContain('alice');
      expect(out).toContain('30');
    });

    it('text format passes unstructured input through unchanged', () => {
      const raw = 'just some plain prose without structure';
      expect(toFormat(raw, 'text')).toBe(raw);
    });

    it('round-trips JSON to JSON', () => {
      expect(toFormat(sample, 'json')).toContain('"name":"alice"');
    });

    it('produces YAML with key:value form', () => {
      const out = toFormat(sample, 'yaml');
      expect(out).toContain('name:');
      expect(out).toContain('alice');
    });

    it('produces XML with sanitized tags', () => {
      const out = toFormat(sample, 'xml');
      expect(out).toContain('<name>alice</name>');
      expect(out).toContain('<age>30</age>');
    });

    it('falls back gracefully for plain unparseable text', () => {
      const text = 'just some plain prose without structure';
      expect(toFormat(text, 'json')).toBe(JSON.stringify(text));
      expect(toFormat(text, 'yaml')).toContain('just some plain prose');
    });

    it('produces markdown table for array-of-objects', () => {
      const arr = '[{"name":"a","age":1},{"name":"b","age":2}]';
      const out = toFormat(arr, 'markdown');
      expect(out).toContain('| name | age |');
      expect(out).toContain('| a | 1 |');
    });
  });

  it('allFormats lists all supported formats', () => {
    expect(allFormats()).toEqual(['json', 'markdown', 'text', 'xml', 'yaml']);
  });
});
