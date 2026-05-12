import { describe, expect, it } from 'vitest';
import { SDK_PATTERNS, detectSdkPrompts } from './sdk-regex-detector.js';

describe('detectSdkPrompts — anthropic', () => {
  it('extracts a system literal', () => {
    const src = [
      'const r = await anthropic.messages.create({',
      "  model: 'claude-opus-4-7',",
      "  system: 'You are a helpful assistant.',",
      '  messages: [],',
      '});',
    ].join('\n');
    const result = detectSdkPrompts(src, 'src/a.ts');
    expect(result.prompts.length).toBeGreaterThanOrEqual(1);
    const sys = result.prompts.find((p) => p.text === 'You are a helpful assistant.');
    expect(sys).toBeDefined();
    expect(sys?.sdk).toBe('anthropic');
    expect(sys?.model).toBe('claude-opus-4-7');
  });

  it('extracts per-message content literals from messages: []', () => {
    const src = [
      'await anthropic.messages.create({',
      "  model: 'claude-opus-4-7',",
      '  messages: [',
      "    { role: 'user', content: 'Hello there' },",
      "    { role: 'assistant', content: 'Hi!' },",
      '  ],',
      '});',
    ].join('\n');
    const result = detectSdkPrompts(src, 'src/b.ts');
    const texts = result.prompts.map((p) => p.text).sort();
    expect(texts).toContain('Hello there');
    expect(texts).toContain('Hi!');
  });
});

describe('detectSdkPrompts — openai', () => {
  it('extracts chat.completions.create system+content', () => {
    const src = [
      'const r = await openai.chat.completions.create({',
      "  model: 'gpt-4o',",
      '  messages: [',
      "    { role: 'system', content: 'You are concise.' },",
      "    { role: 'user', content: 'Hi' },",
      '  ],',
      '});',
    ].join('\n');
    const result = detectSdkPrompts(src, 'src/c.ts');
    const texts = result.prompts.map((p) => p.text).sort();
    expect(texts).toContain('You are concise.');
    expect(texts).toContain('Hi');
  });

  it('extracts responses.create', () => {
    const src = [
      'await openai.responses.create({',
      "  model: 'gpt-4o',",
      "  input: 'ignored',",
      "  prompt: 'Tell me a joke.',",
      '});',
    ].join('\n');
    const result = detectSdkPrompts(src, 'src/d.ts');
    expect(result.prompts.some((p) => p.text === 'Tell me a joke.')).toBe(true);
  });
});

describe('detectSdkPrompts — google', () => {
  it('extracts contents literal from generateContent', () => {
    const src = ['await model.generateContent({', "  contents: 'Write a haiku.',", '});'].join(
      '\n',
    );
    const result = detectSdkPrompts(src, 'src/e.ts');
    expect(result.prompts.some((p) => p.text === 'Write a haiku.')).toBe(true);
    expect(result.prompts[0]?.sdk).toBe('google');
  });
});

describe('detectSdkPrompts — mistral', () => {
  it('extracts mistralClient.chat content', () => {
    const src = [
      'await mistralClient.chat({',
      "  model: 'mistral-large-latest',",
      "  messages: [{ role: 'user', content: 'Bonjour' }],",
      '});',
    ].join('\n');
    const result = detectSdkPrompts(src, 'src/f.ts');
    expect(result.prompts.some((p) => p.text === 'Bonjour')).toBe(true);
  });

  it('extracts mistral.chat.complete', () => {
    const src = [
      'await mistral.chat.complete({',
      "  model: 'mistral-large-latest',",
      "  messages: [{ role: 'user', content: 'Hola' }],",
      '});',
    ].join('\n');
    const result = detectSdkPrompts(src, 'src/g.ts');
    expect(result.prompts.some((p) => p.text === 'Hola')).toBe(true);
  });
});

describe('detectSdkPrompts — cohere', () => {
  it('extracts cohere.chat message', () => {
    const src = [
      'await cohere.chat({',
      "  model: 'command-r-plus',",
      "  message: 'unused-field',",
      "  preamble: 'unused-field',",
      "  content: 'Tell me about Cohere.',",
      '});',
    ].join('\n');
    const result = detectSdkPrompts(src, 'src/h.ts');
    expect(result.prompts.some((p) => p.text === 'Tell me about Cohere.')).toBe(true);
    expect(result.prompts[0]?.sdk).toBe('cohere');
  });
});

describe('detectSdkPrompts — non-literal handling', () => {
  it('flags non-literal system as nonLiteralLocations and skips it', () => {
    const src = [
      'const sys = buildSystemPrompt();',
      'await anthropic.messages.create({',
      "  model: 'claude-opus-4-7',",
      '  system: sys,',
      '});',
    ].join('\n');
    const result = detectSdkPrompts(src, 'src/i.ts');
    expect(result.prompts).toHaveLength(0);
    expect(result.nonLiteralLocations.length).toBeGreaterThan(0);
    expect(result.nonLiteralLocations[0]?.sdk).toBe('anthropic');
  });
});

describe('SDK_PATTERNS registry', () => {
  it('has at least one pattern per supported SDK', () => {
    const sdks = new Set(SDK_PATTERNS.map((p) => p.sdk));
    expect(sdks.has('anthropic')).toBe(true);
    expect(sdks.has('openai')).toBe(true);
    expect(sdks.has('google')).toBe(true);
    expect(sdks.has('mistral')).toBe(true);
    expect(sdks.has('cohere')).toBe(true);
  });
});
