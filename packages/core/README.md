# @tokenometer/core

[![npm @tokenometer/core](https://img.shields.io/npm/v/@tokenometer/core.svg?label=@tokenometer/core)](https://www.npmjs.com/package/@tokenometer/core)
[![License: MIT](https://img.shields.io/github/license/faraa2m/tokenometer.svg)](https://github.com/faraa2m/tokenometer/blob/main/LICENSE)

> Core library powering [tokenometer](https://www.npmjs.com/package/tokenometer): tokenizer dispatch, format converters, versioned cost rate matrix, vision-token estimators, latency measurement, SARIF emitter, config loader, and an empirical-mode `countTokens` adapter for Anthropic, OpenAI, Google, Mistral, and Cohere.

See the [root README](https://github.com/faraa2m/tokenometer#readme) for findings, methodology, and the full project overview.

[**Live playground**](https://tokenometer.dev) · [Source](https://github.com/faraa2m/tokenometer) · MIT

If you just want a CLI, `npm install -g tokenometer`. This package is for programmatic use — it's the engine the CLI, the GitHub Action, the VS Code / Cursor extension, and the playground all share, so counts and pricing stay identical across every surface.

## API

```ts
import {
  // Core tokenization
  tokenize,
  tokenizeMatrix,
  countTokens,
  // Empirical (real provider countTokens / tokenize endpoints)
  tokenizeEmpirical,
  tokenizeMatrixEmpirical,
  // Latency benchmarking
  measureLatency,
  nthPercentile,
  // Format conversion
  toFormat,
  isFormat,
  allFormats,
  // Config (.tokenometer.yml)
  loadConfig,
  parseConfig,
  // SARIF + JSON emitter
  toSarif,
  // Vision-token estimators
  anthropicVisionTokens,
  openaiVisionTokens,
  googleVisionTokens,
  // Pricing / model registry
  KNOWN_CATALOG_MODELS,
  KNOWN_MODELS,
  MODEL_CATALOG,
  MODELS,
  RATES,
  RATES_VERSION,
  getCatalogModel,
  getModel,
  getRate,
  priceUsage,
} from '@tokenometer/core';

import type {
  // Token results
  CountResult,
  TokenizeResult,
  EmpiricalResult,
  EmpiricalCountResult,
  EmpiricalEnv,
  // Latency
  LatencyResult,
  LatencyTrial,
  LatencyStats,
  LatencyDeps,
  MeasureLatencyOptions,
  // Aggregates / formatters
  TokenometerResult,
  TokenometerFileResult,
  ToSarifOptions,
  // Config
  TokenometerConfig,
  ConfigFormat,
  // Vision input shapes
  AnthropicVisionInput,
  OpenAIVisionInput,
  GoogleVisionInput,
  // Registry
  ModelDescriptor,
  Provider,
  RateEntry,
  Format,
  TokenizerKind,
  PriceUsageResult,
  UsagePricing,
  UsageTokens,
} from '@tokenometer/core';
```

### Offline (deterministic, no API key)

```ts
const result = tokenize({
  prompt: '{"hello": "world"}',
  format: 'yaml',
  modelId: 'claude-opus-4-7',
});
// {
//   model: 'claude-opus-4-7',
//   provider: 'anthropic',
//   format: 'yaml',
//   tokenizer: 'cl100k_base',
//   inputTokens: 12,
//   inputCost: 0.00018,
//   approximate: true   // ← Anthropic does not publish a public Claude 3+ tokenizer
// }
```

### Empirical (real provider counts, free)

```ts
const result = await tokenizeEmpirical({
  prompt: '{"hello": "world"}',
  format: 'yaml',
  modelId: 'claude-opus-4-7',
  env: { anthropicApiKey: process.env.ANTHROPIC_API_KEY! },
});
// approximate: false  ← uses Anthropic's messages.countTokens
```

### Price actual usage

```ts
const cost = priceUsage({
  modelId: 'claude-sonnet-4-6',
  usage: {
    inputTokens: 12_000,
    cachedInputTokens: 4_000,
    outputTokens: 1_500,
  },
});
// { inputUsd, cachedInputUsd, outputUsd, totalUsd, ... }
```

Use this after a real LLM call when the provider returns actual usage. `tokenize()`
estimates the next prompt before execution; `priceUsage()` prices completed
steps so agent loops and routers can maintain an accurate running budget.

For models outside Tokenometer's registry, pass explicit per-million-token rates:

```ts
const cost = priceUsage({
  pricing: { inputUsdPerMtok: 0.59, outputUsdPerMtok: 0.79 },
  usage: { inputTokens: 8_000, outputTokens: 600 },
});
```

### Latency benchmarking

```ts
const stats = await measureLatency({
  modelId: 'claude-opus-4-7',
  prompt: 'Write a haiku about CI.',
  trials: 3,
  env: { anthropicApiKey: process.env.ANTHROPIC_API_KEY! },
});
// LatencyResult: { trials: LatencyTrial[], stats: { ttftMs, totalMs, tokensPerSec } }
// Each stat is { p50, p95, mean }.
```

Supported providers: Anthropic (`messages.stream`), OpenAI (`/v1/chat/completions` SSE), Google (`generateContentStream`), Cohere (`/v1/chat` NDJSON), Mistral (`/v1/chat/completions` SSE). Each call is capped at `max_tokens=200`; trials retry once on transient failures.

### Vision tokens

```ts
const tokens = anthropicVisionTokens({ width: 1280, height: 720 });
// 1228 (capped at 1600 for very large images)
```

The `openaiVisionTokens` and `googleVisionTokens` exports are formula-equivalent to the OpenAI high-detail tile cost and Gemini's 258-per-768²-tile cost respectively.

### SARIF + JSON output

```ts
const sarif = toSarif({ files: [{ path: 'prompt.md', results: [...] }] });
// SARIF 2.1.0 — drop into GitHub Code Scanning or any SARIF viewer.
```

### Rate table

`RATES` is a `Record<modelId, { inputPer1k, outputPer1k, cachedInputPer1k? }>`. `RATES_VERSION` ships as a date string so consumers can pin or audit. `KNOWN_MODELS` is generated from the costable registry, while `MODEL_CATALOG` includes visible catalog-only models that are not eligible for text cost estimates.

## Providers

| Provider  | Models | Offline tokenizer | Exactness | Empirical (`tokenizeEmpirical`) |
|-----------|--------|-------------------|-----------|----------------------------------|
| OpenAI    | `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-3.5-turbo`, `o1` family | `gpt-tokenizer` `o200k_base` | exact | same `o200k_base` (matches production) |
| Anthropic | `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5`, Claude 3.x family | `gpt-tokenizer` `cl100k_base` | approximate | `messages.countTokens` (free, exact) |
| Google    | `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-1.5-pro`, `gemini-1.5-flash` | `chars / 4` heuristic | approximate | `model.countTokens` (free, exact) |
| Mistral (19 models) | `open-mistral-7b`, `open-mixtral-8x22b`, `mistral-large-latest`, `codestral-latest`, `mistral-nemo`, `pixtral-large-latest`, `mistral-medium-2505`, `magistral-small`, `ministral-3b-latest`, `devstral-small-2505` | `mistral-tokenizer-js` (V1/V2/V3 SentencePiece); `chars/4` for Tekken family (NeMo, Pixtral, Mistral Small 2409+, Devstral, Mistral Medium 2505+, Magistral, Ministral) | exact for SentencePiece · approximate for Tekken | unsupported (no public token-count endpoint) |
| Cohere    | `command-r-08-2024`, `command-r-plus-08-2024` | `chars / 4` heuristic | approximate | `POST /v1/tokenize` (free, exact, requires `COHERE_API_KEY`) |

Pricing comes from `@tokenlens/models` plus a `LOCAL_OVERRIDES` map for current priced models the registry has not picked up yet. Models that are visible in provider catalogs but lack stable public text pricing or a supported token-counting path live in `MODEL_CATALOG` only. Local overrides were last checked against OpenAI, Anthropic, Google, Mistral, and Cohere public docs on 2026-07-04.

Internally the dispatch helpers `mistralCount`, `cohereCount`, `cohereTokenizeApi`, and `isTekken` (in `tokenize-mistral.ts` / `tokenize-cohere.ts`) are not part of the public API — they're called from `tokenize` / `tokenizeEmpirical`. If you need them, import the files directly; they may move.

## License

MIT
