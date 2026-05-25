import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAnthropicCount = vi.fn();
const mockGoogleCount = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { countTokens: mockAnthropicCount },
  })),
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({ countTokens: mockGoogleCount }),
  })),
}));

const { tokenizeEmpirical, tokenizeMatrixEmpirical } = await import('./empirical.js');
const { UserFacingError } = await import('./errors.js');

describe('tokenizeEmpirical', () => {
  beforeEach(() => {
    mockAnthropicCount.mockReset();
    mockGoogleCount.mockReset();
  });

  it('uses Anthropic countTokens for Claude models', async () => {
    mockAnthropicCount.mockResolvedValue({ input_tokens: 142 });
    const result = await tokenizeEmpirical({
      env: { anthropicApiKey: 'sk-test' },
      format: 'json',
      modelId: 'claude-opus-4-7',
      prompt: '{"hello":"world"}',
    });
    expect(result.approximate).toBe(false);
    expect(result.inputTokens).toBe(142);
    expect(result.inputCost).toBeGreaterThan(0);
    expect(mockAnthropicCount).toHaveBeenCalledTimes(1);
  });

  it('uses Gemini countTokens for Google models', async () => {
    mockGoogleCount.mockResolvedValue({ totalTokens: 88 });
    const result = await tokenizeEmpirical({
      env: { googleApiKey: 'AIza-test' },
      format: 'yaml',
      modelId: 'gemini-2.5-pro',
      prompt: 'plain prompt',
    });
    expect(result.approximate).toBe(false);
    expect(result.inputTokens).toBe(88);
    expect(mockGoogleCount).toHaveBeenCalledTimes(1);
  });

  it('uses tiktoken locally for OpenAI models (no API key needed)', async () => {
    const result = await tokenizeEmpirical({
      env: {},
      format: 'json',
      modelId: 'gpt-4o',
      prompt: '{"hello":"world"}',
    });
    expect(result.approximate).toBe(false);
    expect(result.tokenizer).toBe('o200k_base');
    expect(result.inputTokens).toBeGreaterThan(0);
  });

  it('throws a UserFacingError when Anthropic key is missing', async () => {
    await expect(
      tokenizeEmpirical({
        env: {},
        format: 'json',
        modelId: 'claude-opus-4-7',
        prompt: 'hi',
      }),
    ).rejects.toThrow(UserFacingError);
    await expect(
      tokenizeEmpirical({
        env: {},
        format: 'json',
        modelId: 'claude-opus-4-7',
        prompt: 'hi',
      }),
    ).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });

  it('throws a clear error when Google key is missing', async () => {
    await expect(
      tokenizeEmpirical({
        env: {},
        format: 'json',
        modelId: 'gemini-2.5-pro',
        prompt: 'hi',
      }),
    ).rejects.toThrow(/GOOGLE_API_KEY/);
  });

  it('throws on Mistral empirical mode (no public token-count endpoint)', async () => {
    await expect(
      tokenizeEmpirical({
        env: {},
        format: 'text',
        modelId: 'open-mistral-7b',
        prompt: 'hi',
      }),
    ).rejects.toThrow(/Mistral does not expose a public token-count API/);
  });

  it('hits Cohere /v1/tokenize when key is provided (mocked fetch)', async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ tokens: [10, 20, 30] }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
    ) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;
    try {
      const result = await tokenizeEmpirical({
        env: { cohereApiKey: 'co-test' },
        format: 'text',
        modelId: 'command-r-plus-08-2024',
        prompt: 'hello',
      });
      expect(result.approximate).toBe(false);
      expect(result.inputTokens).toBe(3);
      expect(result.inputCost).toBeGreaterThan(0);
      expect(result.provider).toBe('cohere');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws a clear error when Cohere key is missing', async () => {
    await expect(
      tokenizeEmpirical({
        env: {},
        format: 'text',
        modelId: 'command-r-plus-08-2024',
        prompt: 'hi',
      }),
    ).rejects.toThrow(/COHERE_API_KEY/);
  });
});

describe('tokenizeMatrixEmpirical', () => {
  beforeEach(() => {
    mockAnthropicCount.mockReset();
    mockGoogleCount.mockReset();
  });

  it('returns N x M results from concurrent provider calls', async () => {
    mockAnthropicCount.mockResolvedValue({ input_tokens: 100 });
    mockGoogleCount.mockResolvedValue({ totalTokens: 90 });
    const results = await tokenizeMatrixEmpirical({
      env: { anthropicApiKey: 'sk', googleApiKey: 'gg' },
      formats: ['json', 'yaml'],
      modelIds: ['claude-opus-4-7', 'gemini-2.5-pro', 'gpt-4o'],
      prompt: '{"a":1}',
    });
    expect(results).toHaveLength(6);
    expect(results.every((r) => r.approximate === false)).toBe(true);
  });
});
