import { describe, expect, it, vi } from 'vitest';
import { cohereCount, cohereTokenizeApi } from './tokenize-cohere.js';

describe('cohereCount (offline)', () => {
  it('returns chars/4 heuristic count flagged approximate', () => {
    const result = cohereCount('a'.repeat(20));
    expect(result.tokens).toBe(5);
    expect(result.approximate).toBe(true);
    expect(result.tokenizer).toBe('heuristic');
  });

  it('count scales with input length', () => {
    const short = cohereCount('hi');
    const long = cohereCount('hi'.repeat(200));
    expect(long.tokens).toBeGreaterThan(short.tokens);
  });
});

describe('cohereTokenizeApi (empirical, mocked)', () => {
  it('POSTs to /v1/tokenize with bearer auth and returns tokens.length', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ tokens: [1, 2, 3, 4, 5] }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
    ) as unknown as typeof fetch;

    const count = await cohereTokenizeApi('hello', 'command-r-plus-08-2024', 'fake-key', fetchMock);
    expect(count).toBe(5);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.cohere.com/v1/tokenize');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer fake-key');
    expect(JSON.parse(init.body)).toEqual({ model: 'command-r-plus-08-2024', text: 'hello' });
  });

  it('throws a clear error on non-2xx', async () => {
    const fetchMock = vi.fn(
      async () => new Response('unauthorized', { status: 401, statusText: 'Unauthorized' }),
    ) as unknown as typeof fetch;
    await expect(
      cohereTokenizeApi('hi', 'command-r-08-2024', 'bad-key', fetchMock),
    ).rejects.toThrow(/Cohere \/v1\/tokenize returned 401/);
  });

  it('throws when response shape is unexpected', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
    ) as unknown as typeof fetch;
    await expect(cohereTokenizeApi('hi', 'command-r-08-2024', 'k', fetchMock)).rejects.toThrow(
      /unexpected shape/,
    );
  });
});
