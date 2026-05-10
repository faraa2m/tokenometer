import { describe, expect, it } from 'vitest';
import { autoDetectDefaultModel } from './auto-detect.js';

describe('autoDetectDefaultModel', () => {
  it('returns the existing default when no provider keys are set', () => {
    const r = autoDetectDefaultModel({ env: {} });
    expect(r.modelId).toBe('claude-opus-4-7');
    expect(r.note).toBeNull();
  });

  it('picks claude-opus-4-7 when only ANTHROPIC_API_KEY is set', () => {
    const r = autoDetectDefaultModel({ env: { ANTHROPIC_API_KEY: 'sk-ant' } });
    expect(r.modelId).toBe('claude-opus-4-7');
    expect(r.note).toBeNull();
  });

  it('picks gpt-4o when only OPENAI_API_KEY is set', () => {
    const r = autoDetectDefaultModel({ env: { OPENAI_API_KEY: 'sk-oa' } });
    expect(r.modelId).toBe('gpt-4o');
    expect(r.note).toBeNull();
  });

  it('picks a Gemini model when only GOOGLE_API_KEY is set', () => {
    const r = autoDetectDefaultModel({ env: { GOOGLE_API_KEY: 'goog' } });
    expect(r.modelId.startsWith('gemini-')).toBe(true);
    expect(r.note).toBeNull();
  });

  it('picks a Gemini model when only GEMINI_API_KEY is set', () => {
    const r = autoDetectDefaultModel({ env: { GEMINI_API_KEY: 'goog' } });
    expect(r.modelId.startsWith('gemini-')).toBe(true);
    expect(r.note).toBeNull();
  });

  it('falls back to default with a stderr note when multiple keys are set', () => {
    const r = autoDetectDefaultModel({
      env: { ANTHROPIC_API_KEY: 'a', OPENAI_API_KEY: 'b' },
    });
    expect(r.modelId).toBe('claude-opus-4-7');
    expect(r.note).toMatch(/Multiple provider API keys/);
    expect(r.note).toMatch(/--model to override/);
  });

  it('treats GOOGLE_API_KEY + GEMINI_API_KEY as a single provider', () => {
    const r = autoDetectDefaultModel({
      env: { GEMINI_API_KEY: 'g1', GOOGLE_API_KEY: 'g2' },
    });
    expect(r.modelId.startsWith('gemini-')).toBe(true);
    expect(r.note).toBeNull();
  });
});
