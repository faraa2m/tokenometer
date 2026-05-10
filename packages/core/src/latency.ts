// Real-generation latency measurement.
//
// Unlike `tokenizeEmpirical` (which calls the free `countTokens` endpoints),
// this dispatches a real metered streaming generation per provider and
// measures wall-clock TTFT (time to first token) + total stream duration +
// tokens/sec from the actual output. Reported as p50/p95/mean over `trials`
// runs so callers see a stable distribution rather than a single noisy run.
//
// Cost note: every trial is a metered chat completion. The CLI bumps the
// default `--max-spend` ceiling when `--latency` is on; see args.ts.

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { EmpiricalEnv } from './empirical.js';
import { getModel } from './rates.js';
import type { LatencyResult, LatencyStats, LatencyTrial, Provider } from './types.js';

export type { LatencyResult, LatencyStats, LatencyTrial };

export interface MeasureLatencyOptions {
  modelId: string;
  prompt: string;
  trials: number;
  maxTokens?: number;
  env: EmpiricalEnv;
}

const DEFAULT_MAX_TOKENS = 200;

const ENV_VAR_NAME: Record<keyof EmpiricalEnv, string> = {
  anthropicApiKey: 'ANTHROPIC_API_KEY',
  cohereApiKey: 'COHERE_API_KEY',
  googleApiKey: 'GOOGLE_API_KEY',
  mistralApiKey: 'MISTRAL_API_KEY',
  openaiApiKey: 'OPENAI_API_KEY',
};

const requireKey = (env: EmpiricalEnv, key: keyof EmpiricalEnv, provider: Provider): string => {
  const value = env[key];
  if (!value) {
    const envName =
      key === 'googleApiKey' ? `${ENV_VAR_NAME[key]} (or GEMINI_API_KEY)` : ENV_VAR_NAME[key];
    throw new Error(`${provider} latency mode requires ${envName}`);
  }
  return value;
};

/**
 * Linear-interpolation percentile. `p` is 0-100. With p95 over n=3 trials this
 * just returns max(values), which is what we want for the "tail" reading.
 */
const nthPercentile = (values: readonly number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0] as number;
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const lowerValue = sorted[lower] as number;
  if (lower === upper) return lowerValue;
  const upperValue = sorted[upper] as number;
  return lowerValue + (upperValue - lowerValue) * (rank - lower);
};

const mean = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
};

const summarize = (trials: readonly LatencyTrial[]): LatencyResult => {
  const ttft = trials.map((t) => t.ttftMs);
  const total = trials.map((t) => t.totalMs);
  const tps = trials.map((t) => t.tokensPerSec);
  return {
    trials: [...trials],
    p50: {
      ttftMs: nthPercentile(ttft, 50),
      totalMs: nthPercentile(total, 50),
      tokensPerSec: nthPercentile(tps, 50),
    },
    p95: {
      ttftMs: nthPercentile(ttft, 95),
      totalMs: nthPercentile(total, 95),
      tokensPerSec: nthPercentile(tps, 95),
    },
    mean: {
      ttftMs: mean(ttft),
      totalMs: mean(total),
      tokensPerSec: mean(tps),
    },
  };
};

const computeTokensPerSec = (outputTokens: number, ttftMs: number, totalMs: number): number => {
  // Avoid divide-by-zero on instant streams (mocked tests, very fast paths).
  const generationMs = Math.max(totalMs - ttftMs, 1);
  return (outputTokens / generationMs) * 1000;
};

// ---------------------------------------------------------------------------
// Per-provider trial runners. Each returns one LatencyTrial.
// ---------------------------------------------------------------------------

const trialAnthropic = async (
  modelId: string,
  prompt: string,
  maxTokens: number,
  apiKey: string,
): Promise<LatencyTrial> => {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const start = Date.now();
  let ttftMs = 0;
  let outputTokens = 0;
  const stream = client.messages.stream({
    max_tokens: maxTokens,
    messages: [{ content: prompt, role: 'user' }],
    model: modelId,
  });
  for await (const event of stream as AsyncIterable<unknown>) {
    const e = event as {
      type?: string;
      delta?: { type?: string; text?: string };
      usage?: { output_tokens?: number };
      message?: { usage?: { output_tokens?: number } };
    };
    if (
      ttftMs === 0 &&
      e.type === 'content_block_delta' &&
      e.delta?.type === 'text_delta' &&
      typeof e.delta?.text === 'string' &&
      e.delta.text.length > 0
    ) {
      ttftMs = Date.now() - start;
    }
    if (e.type === 'message_delta' && typeof e.usage?.output_tokens === 'number') {
      outputTokens = e.usage.output_tokens;
    }
    if (e.type === 'message_start' && typeof e.message?.usage?.output_tokens === 'number') {
      // initial usage is typically 0 — message_delta carries the running count
    }
  }
  const totalMs = Date.now() - start;
  return {
    ttftMs: ttftMs || totalMs,
    totalMs,
    outputTokens,
    tokensPerSec: computeTokensPerSec(outputTokens, ttftMs || totalMs, totalMs),
  };
};

const trialGoogle = async (
  modelId: string,
  prompt: string,
  maxTokens: number,
  apiKey: string,
): Promise<LatencyTrial> => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: { maxOutputTokens: maxTokens },
  });
  const start = Date.now();
  let ttftMs = 0;
  let outputTokens = 0;
  const result = await model.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    if (ttftMs === 0) {
      const text = (chunk as { text?: () => string }).text?.();
      if (text && text.length > 0) ttftMs = Date.now() - start;
    }
    const usage = (chunk as { usageMetadata?: { candidatesTokenCount?: number } }).usageMetadata;
    if (usage && typeof usage.candidatesTokenCount === 'number') {
      outputTokens = usage.candidatesTokenCount;
    }
  }
  const totalMs = Date.now() - start;
  return {
    ttftMs: ttftMs || totalMs,
    totalMs,
    outputTokens,
    tokensPerSec: computeTokensPerSec(outputTokens, ttftMs || totalMs, totalMs),
  };
};

/**
 * Generic SSE iterator. Yields one parsed JSON object per `data: …` line and
 * stops on `data: [DONE]`. Used for OpenAI + Mistral (Cohere has its own
 * NDJSON-style stream, see below).
 */
async function* iterSse(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<Record<string, unknown>, void, unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    // Split on double-newline (SSE event boundary).
    while (true) {
      const idx = buf.indexOf('\n\n');
      if (idx === -1) break;
      const eventBlock = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of eventBlock.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]' || payload.length === 0) return;
        try {
          yield JSON.parse(payload) as Record<string, unknown>;
        } catch {
          // skip malformed line
        }
      }
    }
  }
}

const trialOpenAi = async (
  modelId: string,
  prompt: string,
  maxTokens: number,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LatencyTrial> => {
  const start = Date.now();
  const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });
  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `OpenAI /v1/chat/completions returned ${response.status} ${response.statusText}${body ? `: ${body}` : ''}`,
    );
  }
  let ttftMs = 0;
  let outputTokens = 0;
  for await (const ev of iterSse(response.body)) {
    const choices = ev.choices as
      | { delta?: { content?: string }; finish_reason?: string | null }[]
      | undefined;
    if (ttftMs === 0 && choices && choices[0]?.delta?.content) ttftMs = Date.now() - start;
    const usage = ev.usage as { completion_tokens?: number } | undefined;
    if (usage && typeof usage.completion_tokens === 'number')
      outputTokens = usage.completion_tokens;
  }
  const totalMs = Date.now() - start;
  return {
    ttftMs: ttftMs || totalMs,
    totalMs,
    outputTokens,
    tokensPerSec: computeTokensPerSec(outputTokens, ttftMs || totalMs, totalMs),
  };
};

const trialMistral = async (
  modelId: string,
  prompt: string,
  maxTokens: number,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LatencyTrial> => {
  const start = Date.now();
  const response = await fetchImpl('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      stream: true,
    }),
  });
  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Mistral /v1/chat/completions returned ${response.status} ${response.statusText}${body ? `: ${body}` : ''}`,
    );
  }
  let ttftMs = 0;
  let outputTokens = 0;
  for await (const ev of iterSse(response.body)) {
    const choices = ev.choices as { delta?: { content?: string } }[] | undefined;
    if (ttftMs === 0 && choices && choices[0]?.delta?.content) ttftMs = Date.now() - start;
    const usage = ev.usage as { completion_tokens?: number } | undefined;
    if (usage && typeof usage.completion_tokens === 'number')
      outputTokens = usage.completion_tokens;
  }
  const totalMs = Date.now() - start;
  return {
    ttftMs: ttftMs || totalMs,
    totalMs,
    outputTokens,
    tokensPerSec: computeTokensPerSec(outputTokens, ttftMs || totalMs, totalMs),
  };
};

const trialCohere = async (
  modelId: string,
  prompt: string,
  maxTokens: number,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LatencyTrial> => {
  // Cohere /v1/chat streams NDJSON (one JSON object per line), not SSE.
  // See https://docs.cohere.com/reference/chat for event types
  // (stream-start, text-generation, stream-end).
  const start = Date.now();
  const response = await fetchImpl('https://api.cohere.com/v1/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      message: prompt,
      max_tokens: maxTokens,
      stream: true,
    }),
  });
  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Cohere /v1/chat returned ${response.status} ${response.statusText}${body ? `: ${body}` : ''}`,
    );
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buf = '';
  let ttftMs = 0;
  let outputTokens = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    while (true) {
      const nl = buf.indexOf('\n');
      if (nl === -1) break;
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let ev: Record<string, unknown>;
      try {
        ev = JSON.parse(line) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (ttftMs === 0 && ev.event_type === 'text-generation') ttftMs = Date.now() - start;
      if (ev.event_type === 'stream-end') {
        const resp = ev.response as { meta?: { tokens?: { output_tokens?: number } } } | undefined;
        const out = resp?.meta?.tokens?.output_tokens;
        if (typeof out === 'number') outputTokens = out;
      }
    }
  }
  const totalMs = Date.now() - start;
  return {
    ttftMs: ttftMs || totalMs,
    totalMs,
    outputTokens,
    tokensPerSec: computeTokensPerSec(outputTokens, ttftMs || totalMs, totalMs),
  };
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Test seam: callers (tests) can substitute a provider's trial runner. The
 * production `measureLatency` always uses the real implementations above.
 */
export interface LatencyDeps {
  fetchImpl?: typeof fetch;
  trialRunner?: (
    provider: Provider,
    modelId: string,
    prompt: string,
    maxTokens: number,
    env: EmpiricalEnv,
  ) => Promise<LatencyTrial>;
}

const defaultTrialRunner = async (
  provider: Provider,
  modelId: string,
  prompt: string,
  maxTokens: number,
  env: EmpiricalEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<LatencyTrial> => {
  switch (provider) {
    case 'anthropic':
      return trialAnthropic(
        modelId,
        prompt,
        maxTokens,
        requireKey(env, 'anthropicApiKey', provider),
      );
    case 'google':
      return trialGoogle(modelId, prompt, maxTokens, requireKey(env, 'googleApiKey', provider));
    case 'openai':
      return trialOpenAi(
        modelId,
        prompt,
        maxTokens,
        requireKey(env, 'openaiApiKey', provider),
        fetchImpl,
      );
    case 'mistral':
      return trialMistral(
        modelId,
        prompt,
        maxTokens,
        requireKey(env, 'mistralApiKey', provider),
        fetchImpl,
      );
    case 'cohere':
      return trialCohere(
        modelId,
        prompt,
        maxTokens,
        requireKey(env, 'cohereApiKey', provider),
        fetchImpl,
      );
  }
};

/**
 * Run `trials` real streaming generations and return percentile-summarized
 * latency data. Each trial is retried once on failure; if both attempts
 * fail, the original provider error is rethrown.
 */
export const measureLatency = async (
  options: MeasureLatencyOptions,
  deps: LatencyDeps = {},
): Promise<LatencyResult> => {
  const provider = getModel(options.modelId).provider;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const runner =
    deps.trialRunner ??
    ((p, m, prompt, max, env) => defaultTrialRunner(p, m, prompt, max, env, fetchImpl));
  const trials: LatencyTrial[] = [];
  for (let i = 0; i < options.trials; i++) {
    let lastErr: unknown;
    let success: LatencyTrial | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        success = await runner(provider, options.modelId, options.prompt, maxTokens, options.env);
        break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (!success) {
      throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
    }
    trials.push(success);
  }
  return summarize(trials);
};

export { nthPercentile };
