// Cohere tokenizer dispatch.
//
// Cohere ships their tokenizers as `tokenizer.json` files on HuggingFace
// (e.g. `Cohere/command-r-plus`). The `cohere-ai` SDK is a thin REST client
// — it does NOT bundle an offline tokenizer, only a `client.tokenize()`
// method that hits Cohere's API. Confirmed against `cohere-ai@8.0.0` at the
// time of writing (May 2026). So:
//
//   * Offline mode: chars/4 heuristic, `approximate: true`. Same accuracy
//     tier as the Google heuristic in tokenize.ts.
//
//   * Empirical mode: POST https://api.cohere.com/v1/tokenize. The endpoint
//     is free and very low latency. Wired in `empirical.ts`.
//
// We deliberately do NOT depend on `cohere-ai` for the empirical path — it
// is a 4.9 MB SDK and we only need one POST. Native `fetch` keeps the
// install footprint identical to the offline-only build.
//
// Future upgrade: once `@huggingface/tokenizers` is stable (Path D in the
// research memo), lazy-load `tokenizer.json` per Cohere model from HF Hub
// for exact offline counts.

const COHERE_HEURISTIC_CHARS_PER_TOKEN = 4;

export interface CohereCountResult {
  approximate: true;
  tokens: number;
  tokenizer: 'heuristic';
}

export const cohereCount = (text: string): CohereCountResult => ({
  approximate: true,
  tokens: Math.ceil(text.length / COHERE_HEURISTIC_CHARS_PER_TOKEN),
  tokenizer: 'heuristic',
});

/**
 * Hits Cohere's `POST /v1/tokenize` endpoint. The response shape we care
 * about is `{ tokens: number[] }`; only `tokens.length` is used.
 *
 * Endpoint reference: https://docs.cohere.com/reference/tokenize
 *
 * Returns the exact token count. Pulled out of `empirical.ts` so the
 * dependency surface (one fetch call, no SDK) stays here next to the
 * offline path it complements.
 */
export const cohereTokenizeApi = async (
  text: string,
  modelId: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<number> => {
  const response = await fetchImpl('https://api.cohere.com/v1/tokenize', {
    body: JSON.stringify({ model: modelId, text }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Cohere /v1/tokenize returned ${response.status} ${response.statusText}${body ? `: ${body}` : ''}`,
    );
  }
  const data = (await response.json()) as { tokens?: number[] };
  if (!Array.isArray(data.tokens)) {
    throw new Error('Cohere /v1/tokenize returned an unexpected shape (no tokens array).');
  }
  return data.tokens.length;
};
