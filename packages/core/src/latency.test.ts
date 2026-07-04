import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAnthropicStream = vi.fn();
const mockGoogleStream = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function MockAnthropic() {
    return {
      messages: { stream: mockAnthropicStream },
    };
  }),
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function MockGoogleGenerativeAI() {
    return {
      getGenerativeModel: () => ({ generateContentStream: mockGoogleStream }),
    };
  }),
}));

const { measureLatency, nthPercentile } = await import('./latency.js');
import type { LatencyTrial, MeasureLatencyOptions } from './latency.js';
import type { Provider } from './types.js';

const makeTrial = (ttftMs: number, totalMs: number, outputTokens = 100): LatencyTrial => ({
  ttftMs,
  totalMs,
  outputTokens,
  tokensPerSec: (outputTokens / Math.max(totalMs - ttftMs, 1)) * 1000,
});

describe('nthPercentile', () => {
  it('returns 0 for an empty list', () => {
    expect(nthPercentile([], 50)).toBe(0);
  });

  it('returns the only value for a single-element list', () => {
    expect(nthPercentile([42], 50)).toBe(42);
    expect(nthPercentile([42], 95)).toBe(42);
  });

  it('linearly interpolates between sorted samples', () => {
    expect(nthPercentile([10, 20, 30], 50)).toBe(20);
    // p100 over any list returns max
    expect(nthPercentile([10, 20, 30], 100)).toBe(30);
    // p95 over n=3: rank = 0.95*(3-1) = 1.9 → between idx 1 (20) and idx 2 (30), 90% toward 30 → 29
    expect(nthPercentile([10, 20, 30], 95)).toBeCloseTo(29, 5);
  });

  it('is order-independent (sorts internally)', () => {
    expect(nthPercentile([30, 10, 20], 50)).toBe(20);
  });
});

describe('measureLatency (mocked trial runner)', () => {
  beforeEach(() => {
    mockAnthropicStream.mockReset();
    mockGoogleStream.mockReset();
  });

  const opts = (overrides: Partial<MeasureLatencyOptions> = {}): MeasureLatencyOptions => ({
    env: { anthropicApiKey: 'sk-test' },
    modelId: 'claude-opus-4-7',
    prompt: 'hi',
    trials: 3,
    ...overrides,
  });

  it('runs N trials and reports p50/p95/mean over them', async () => {
    const trials = [makeTrial(100, 500), makeTrial(150, 600), makeTrial(200, 700)];
    let i = 0;
    const result = await measureLatency(opts(), {
      trialRunner: async () => trials[i++] as LatencyTrial,
    });
    expect(result.trials).toHaveLength(3);
    expect(result.p50.ttftMs).toBe(150);
    expect(result.p50.totalMs).toBe(600);
    // p95 over 3 trials: linear interp at rank 1.9 → 90% from idx 1 to idx 2
    expect(result.p95.ttftMs).toBeCloseTo(195, 5);
    expect(result.p95.totalMs).toBeCloseTo(690, 5);
    expect(result.mean.ttftMs).toBe(150);
    expect(result.mean.totalMs).toBeCloseTo(600, 0);
  });

  it('accepts trials=1 and returns the single trial in p50/p95/mean', async () => {
    const result = await measureLatency(opts({ trials: 1 }), {
      trialRunner: async () => makeTrial(123, 456),
    });
    expect(result.trials).toHaveLength(1);
    expect(result.p50.ttftMs).toBe(123);
    expect(result.p95.ttftMs).toBe(123);
    expect(result.mean.ttftMs).toBe(123);
  });

  it('retries a failed trial once before throwing', async () => {
    let calls = 0;
    const trial = makeTrial(100, 500);
    const runner = vi.fn(async () => {
      calls++;
      if (calls === 1) throw new Error('transient');
      return trial;
    });
    const result = await measureLatency(opts({ trials: 1 }), { trialRunner: runner });
    expect(runner).toHaveBeenCalledTimes(2);
    expect(result.trials[0]).toEqual(trial);
  });

  it('throws when both attempts fail with the original provider message', async () => {
    const runner = vi.fn(async () => {
      throw new Error('rate-limited 429');
    });
    await expect(measureLatency(opts({ trials: 1 }), { trialRunner: runner })).rejects.toThrow(
      /rate-limited 429/,
    );
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it('passes the resolved provider through to the trial runner', async () => {
    const seen: Provider[] = [];
    const runner = async (provider: Provider) => {
      seen.push(provider);
      return makeTrial(100, 500);
    };
    await measureLatency(opts({ modelId: 'gpt-4o', env: { openaiApiKey: 'sk-x' }, trials: 1 }), {
      trialRunner: runner,
    });
    expect(seen).toEqual(['openai']);
  });

  it('computes tokensPerSec from outputTokens / (totalMs - ttftMs)', async () => {
    // 200 tokens generated in 800 ms (after 200 ms TTFT) → 250 tokens/sec
    const result = await measureLatency(opts({ trials: 1 }), {
      trialRunner: async () => makeTrial(200, 1000, 200),
    });
    expect(result.trials[0]?.tokensPerSec).toBeCloseTo(250, 0);
    expect(result.p50.tokensPerSec).toBeCloseTo(250, 0);
  });
});

describe('measureLatency (provider trial runners, mocked I/O)', () => {
  beforeEach(() => {
    mockAnthropicStream.mockReset();
    mockGoogleStream.mockReset();
  });

  it('Anthropic: tracks TTFT on first text_delta and outputTokens from message_delta usage', async () => {
    // Build an async iterable yielding Anthropic stream events.
    mockAnthropicStream.mockImplementation(() => ({
      [Symbol.asyncIterator]: async function* () {
        yield { type: 'message_start', message: { usage: { output_tokens: 0 } } };
        yield { type: 'content_block_start', index: 0 };
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'hello' } };
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ' world' } };
        yield { type: 'message_delta', usage: { output_tokens: 47 } };
        yield { type: 'message_stop' };
      },
    }));
    const result = await measureLatency({
      env: { anthropicApiKey: 'sk-test' },
      modelId: 'claude-opus-4-7',
      prompt: 'hi',
      trials: 1,
    });
    expect(result.trials).toHaveLength(1);
    expect(result.trials[0]?.outputTokens).toBe(47);
    // ttft / total are wall-clock so we just assert non-negative bounds
    expect(result.trials[0]?.ttftMs).toBeGreaterThanOrEqual(0);
    expect(result.trials[0]?.totalMs).toBeGreaterThanOrEqual(result.trials[0]?.ttftMs ?? 0);
  });

  it('Anthropic: throws when ANTHROPIC_API_KEY is missing', async () => {
    await expect(
      measureLatency({
        env: {},
        modelId: 'claude-opus-4-7',
        prompt: 'hi',
        trials: 1,
      }),
    ).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });

  it('Google: tracks TTFT on first non-empty chunk and outputTokens from usageMetadata', async () => {
    mockGoogleStream.mockImplementation(async () => ({
      stream: {
        [Symbol.asyncIterator]: async function* () {
          yield { text: () => 'hi', usageMetadata: { candidatesTokenCount: 0 } };
          yield { text: () => ' there', usageMetadata: { candidatesTokenCount: 31 } };
        },
      },
    }));
    const result = await measureLatency({
      env: { googleApiKey: 'AIza-x' },
      modelId: 'gemini-2.5-pro',
      prompt: 'hi',
      trials: 1,
    });
    expect(result.trials[0]?.outputTokens).toBe(31);
  });

  it('Google: throws when GOOGLE_API_KEY is missing', async () => {
    await expect(
      measureLatency({
        env: {},
        modelId: 'gemini-2.5-pro',
        prompt: 'hi',
        trials: 1,
      }),
    ).rejects.toThrow(/GOOGLE_API_KEY/);
  });

  it('OpenAI: parses SSE stream, picks up TTFT on first delta.content, usage on the final event', async () => {
    const sseBody = [
      'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"completion_tokens":17}}\n\n',
      'data: [DONE]\n\n',
    ].join('');
    const fetchMock = vi.fn(
      async () =>
        new Response(sseBody, {
          headers: { 'Content-Type': 'text/event-stream' },
          status: 200,
        }),
    ) as unknown as typeof fetch;
    const result = await measureLatency(
      {
        env: { openaiApiKey: 'sk-test' },
        modelId: 'gpt-4o',
        prompt: 'hi',
        trials: 1,
      },
      { fetchImpl: fetchMock },
    );
    expect(result.trials[0]?.outputTokens).toBe(17);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('OpenAI: throws when OPENAI_API_KEY is missing', async () => {
    await expect(
      measureLatency({
        env: {},
        modelId: 'gpt-4o',
        prompt: 'hi',
        trials: 1,
      }),
    ).rejects.toThrow(/OPENAI_API_KEY/);
  });

  it('OpenAI: throws on non-2xx response', async () => {
    const fetchMock = vi.fn(
      async () => new Response('forbidden', { status: 403, statusText: 'Forbidden' }),
    ) as unknown as typeof fetch;
    await expect(
      measureLatency(
        { env: { openaiApiKey: 'bad' }, modelId: 'gpt-4o', prompt: 'hi', trials: 1 },
        { fetchImpl: fetchMock },
      ),
    ).rejects.toThrow(/OpenAI .* 403/);
  });

  it('Mistral: parses SSE stream and extracts usage', async () => {
    const sseBody = [
      'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"bonjour"}}]}\n\n',
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"completion_tokens":9}}\n\n',
      'data: [DONE]\n\n',
    ].join('');
    const fetchMock = vi.fn(
      async () =>
        new Response(sseBody, {
          headers: { 'Content-Type': 'text/event-stream' },
          status: 200,
        }),
    ) as unknown as typeof fetch;
    const result = await measureLatency(
      {
        env: { mistralApiKey: 'mi-test' },
        modelId: 'open-mistral-7b',
        prompt: 'hi',
        trials: 1,
      },
      { fetchImpl: fetchMock },
    );
    expect(result.trials[0]?.outputTokens).toBe(9);
  });

  it('Mistral: throws when MISTRAL_API_KEY is missing', async () => {
    await expect(
      measureLatency({
        env: {},
        modelId: 'open-mistral-7b',
        prompt: 'hi',
        trials: 1,
      }),
    ).rejects.toThrow(/MISTRAL_API_KEY/);
  });

  it('Cohere: parses NDJSON stream and extracts output_tokens from stream-end', async () => {
    const ndjson = [
      JSON.stringify({ event_type: 'stream-start', generation_id: 'x' }),
      JSON.stringify({ event_type: 'text-generation', text: 'hi' }),
      JSON.stringify({ event_type: 'text-generation', text: ' there' }),
      JSON.stringify({
        event_type: 'stream-end',
        finish_reason: 'COMPLETE',
        response: { meta: { tokens: { output_tokens: 13 } } },
      }),
      '',
    ].join('\n');
    const fetchMock = vi.fn(
      async () =>
        new Response(ndjson, {
          headers: { 'Content-Type': 'application/stream+json' },
          status: 200,
        }),
    ) as unknown as typeof fetch;
    const result = await measureLatency(
      {
        env: { cohereApiKey: 'co-test' },
        modelId: 'command-r-plus-08-2024',
        prompt: 'hi',
        trials: 1,
      },
      { fetchImpl: fetchMock },
    );
    expect(result.trials[0]?.outputTokens).toBe(13);
  });

  it('Cohere: throws when COHERE_API_KEY is missing', async () => {
    await expect(
      measureLatency({
        env: {},
        modelId: 'command-r-plus-08-2024',
        prompt: 'hi',
        trials: 1,
      }),
    ).rejects.toThrow(/COHERE_API_KEY/);
  });
});

describe('LatencyResult shape', () => {
  it('always exposes trials, p50, p95, and mean with the same field set', async () => {
    const result = await measureLatency(
      {
        env: { anthropicApiKey: 'sk' },
        modelId: 'claude-opus-4-7',
        prompt: 'hi',
        trials: 2,
      },
      {
        trialRunner: async () => makeTrial(50, 200, 80),
      },
    );
    expect(Object.keys(result).sort()).toEqual(['mean', 'p50', 'p95', 'trials']);
    for (const key of ['p50', 'p95', 'mean'] as const) {
      expect(Object.keys(result[key]).sort()).toEqual(['tokensPerSec', 'totalMs', 'ttftMs']);
    }
  });
});
