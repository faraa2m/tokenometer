# tokenometer

[![npm tokenometer](https://img.shields.io/npm/v/tokenometer.svg?label=tokenometer)](https://www.npmjs.com/package/tokenometer)
[![License: MIT](https://img.shields.io/github/license/faraa2m/tokenometer.svg)](https://github.com/faraa2m/tokenometer/blob/main/LICENSE)

> Empirical token-cost + latency benchmarking for LLM prompts. Tells you what your prompt actually costs and how fast each provider responds across Claude, GPT-4o, Gemini, Mistral, and Cohere — in every format.

See the [root README](https://github.com/faraa2m/tokenometer#readme) for findings, methodology, and the full project overview.

[**Live playground: tokenometer.dev**](https://tokenometer.dev) · [Source](https://github.com/faraa2m/tokenometer) · MIT

```bash
npx tokenometer ./prompt.md --model claude-opus-4-7,gpt-4o
```

```
model            format    tokens  est. cost  tokenizer
---------------  --------  ------  ---------  --------------
claude-opus-4-7  json         ~78  $0.001170  cl100k_base
claude-opus-4-7  yaml         ~84  $0.001260  cl100k_base
gpt-4o           json          77  $0.000192  o200k_base
gpt-4o           yaml          83  $0.000208  o200k_base

Cheapest: gpt-4o as json ($0.000192)
Priciest: claude-opus-4-7 as yaml ($0.001260, 6.74x more)
```

A leading `~` marks an approximate count (offline mode for Claude / Gemini / Mistral-Tekken / Cohere, since none of those vendors publishes a public production tokenizer that ships in JS).

## Flags

| Flag | Default | Notes |
|---|---|---|
| `--model <id[,id…]>` | `claude-opus-4-7` (or auto-detected) | Any registered model id from the runtime registry. |
| `--format <fmt[,fmt…]>` | `json,yaml,xml,markdown,text` | Subset of supported formats. |
| `--output <fmt>` | `table` | `table` \| `json` \| `sarif`. |
| `--by-file` | _off_ | Append a per-file token/USD table (multi-file only). |
| `--image <path>` | _none_ | Add vision-token cost for the image (repeatable). |
| `--config <path>` | _none_ | Load this exact config file (skips walk-up). |
| `--no-config` | _off_ | Skip `.tokenometer.yml` loading entirely. |
| `--empirical` | _off_ | Use provider `countTokens` APIs (free, exact). |
| `--latency` | _off_ | Measure real generation latency (TTFT, total ms, tokens/sec). Implies `--empirical`. |
| `--latency-trials <n>` | `3` | Trials per cell when `--latency` is set (1–10). |
| `--max-spend <usd>` | `0.05` (or `0.25` with `--latency`) | Hard ceiling for empirical / latency mode. |
| `--offline` | _off_ | Force offline path (overrides `--empirical`). |
| `-h`, `--help` |  | Print help. |
| `-v`, `--version` |  | Print version. |

```
tokenometer <file> [options]
echo "prompt" | tokenometer - [options]
```

## Models supported

63 models across 5 providers. Run `tokenometer --help` for the full list at runtime, or browse the [Cost Atlas](https://tokenometer.dev/models) for sortable per-model pages.

| Provider | Examples | Offline tokenizer | Empirical |
|---|---|---|---|
| Anthropic | `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5`, Claude 3.x family | `gpt-tokenizer` `cl100k_base` (approximate) | `messages.countTokens` (free, exact) |
| OpenAI | `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-3.5-turbo`, `o1` family | `gpt-tokenizer` `o200k_base` (exact) | same `o200k_base` (matches production) |
| Google | `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-1.5-pro`, `gemini-1.5-flash` | `chars / 4` (approximate) | `model.countTokens` (free, exact) |
| Mistral (19 models) | `open-mistral-7b`, `open-mixtral-8x22b`, `mistral-large-latest`, `codestral-latest`, `mistral-nemo`, `pixtral-large-latest`, `mistral-medium-2505`, `magistral-small`, `ministral-3b-latest`, `devstral-small-2505` | `mistral-tokenizer-js` for SentencePiece V1/V2/V3 (exact); `chars/4` for Tekken (approximate) | unsupported (no public token-count API) |
| Cohere | `command-r-08-2024`, `command-r-plus-08-2024` | `chars / 4` (approximate) | `POST /v1/tokenize` (free, exact, requires `COHERE_API_KEY`) |

Pricing comes from the [`tokenlens`](https://www.npmjs.com/package/tokenlens) registry with local overrides for current priced models. Visible preview, specialized, limited-access, or missing-price models are catalog-visible through `MODEL_CATALOG` in core but are not accepted by CLI cost estimation until they have public text pricing and a supported token-counting path.

## Empirical mode

For exact, vendor-billed counts on Claude, Gemini, and Cohere, set the right env var and pass `--empirical`. The tool calls each provider's free `countTokens`-equivalent endpoint — no charge.

```bash
ANTHROPIC_API_KEY=… GOOGLE_API_KEY=… COHERE_API_KEY=… \
  npx tokenometer ./prompt.md --empirical --model claude-opus-4-7,gemini-2.5-pro,command-r-plus-08-2024
```

OpenAI's empirical path uses tiktoken `o200k_base` locally — that encoding matches OpenAI's production count exactly, so no API call is needed. Mistral has no public token-count endpoint; the offline `mistral-tokenizer-js` path is used regardless.

## Auto provider detection

When `--model` is omitted, tokenometer picks a default based on which provider key is set in your environment:

- `ANTHROPIC_API_KEY` only → `claude-opus-4-7`
- `OPENAI_API_KEY` only → `gpt-4o`
- `GOOGLE_API_KEY` / `GEMINI_API_KEY` only → first known `gemini-*` model (falls back to `gemini-2.5-pro`)
- `MISTRAL_API_KEY` only → first known `mistral-*` model
- `COHERE_API_KEY` only → `command-r-plus-08-2024`
- Multiple keys set → falls back to `claude-opus-4-7` and prints a stderr note. Pass `--model` to disambiguate.
- No keys set → existing default (`claude-opus-4-7`).

This means `npx tokenometer prompt.md` does the right thing in any of those environments without you having to remember model names.

## `.tokenometer.yml` config

Drop a `.tokenometer.yml` (or `.yaml`) at the project root and tokenometer will pick it up automatically (walks up from the cwd, stopping at `.git`):

```yaml
models: [claude-opus-4-7, gpt-4o, mistral-large-latest]
formats: [json, yaml, markdown]
paths: [prompts/**/*.md]
budgets:
  total: 0.50
  per-file: 0.10
```

User-passed CLI flags always win over config defaults. Use `--config <path>` to load an explicit file (skips the walk-up). Use `--no-config` to skip config loading entirely.

## Output formats

The `--output` flag picks the *display* format (separate from `--format`, which controls how the prompt body is converted before tokenization):

- `--output table` (default) — the human-readable per-cell table you've been seeing.
- `--output json` — emits a `TokenometerResult` JSON shape: `{ files: [{ path, results: [...] }] }`. One entry per input file. Pipe to `jq` for filtering.
- `--output sarif` — emits SARIF 2.1.0 with one result per (file, model, format) cell. Drop the file into GitHub Code Scanning or any SARIF viewer.

```bash
npx tokenometer ./prompt.md --output sarif > tokenometer.sarif
npx tokenometer ./prompt.md --output json | jq '.files[].results | map(.inputCost) | add'
```

## Latency

`--latency` measures real generation latency in addition to token cost. For each `(model, format)` cell, tokenometer streams `n` real chat completions (default `n=3`, override with `--latency-trials 1..10`) capped at `max_tokens=200`, and reports:

- **TTFT** — time to first streamed token (ms)
- **Total** — wall-clock from request start to stream end (ms)
- **tokens/sec** — `output_tokens / (total - ttft)`

Numbers are reported as **p50 / p95 / mean** over the trials. Full per-trial data is included in `--output json`.

```bash
ANTHROPIC_API_KEY=… OPENAI_API_KEY=… \
  npx tokenometer ./prompt.md --latency --model claude-opus-4-7,gpt-4o
```

`--latency` implies `--empirical` (offline mode can't measure real latency). The default `--max-spend` ceiling is bumped from `$0.05` to `$0.25` to cover the `n × 200-token` generations; pass `--max-spend` explicitly to override.

Supported providers: Anthropic (`messages.stream`), OpenAI (`/v1/chat/completions` SSE), Google (`generateContentStream`), Cohere (`/v1/chat` NDJSON), Mistral (`/v1/chat/completions` SSE). Each trial retries once on transient failures.

## Per-file attribution

`--by-file` appends a per-file token + USD summary table when you pass multiple input files (single-file inputs are a no-op):

```
By file:
  File              Tokens   USD
  ────────────────  ───────  ───────
  prompts/agent.md  1,243    $0.0186
  prompts/router.md   872    $0.0131
```

Useful for figuring out which prompt files dominate the cost of a multi-file pipeline. The aggregator that produces this table is also what powers the GitHub Action's per-file Δ comment, and is unit-tested in [`packages/action`](https://github.com/faraa2m/tokenometer/tree/main/packages/action).

## Vision tokens

Pass `--image <path>` (repeatable) to factor image-based vision tokens into the cost estimate alongside your prompt text:

```bash
npx tokenometer ./prompt.md --image ./screenshot.png --image ./diagram.jpg
```

Each image's dimensions are read with `image-size` (no native deps), then dispatched to the provider-specific vision-token estimator:

- Claude → Anthropic's `(width × height) / 750`, capped at 1600 tokens.
- GPT-4o → OpenAI's high-detail tiling: `85 + 170 × ceil(w/512) × ceil(h/512)` after the 2048/768 resize step.
- Gemini → Google's `258 × ceil(w/768) × ceil(h/768)` (with a flat 258 for ≤384×384 images).

Mistral and Cohere don't have published vision-token formulas, so vision images are skipped for those providers (with a stderr note). Vision-token cells are always marked `approximate: true` since they're formula-derived. Each image also gets its own row in the `--by-file` table as a virtual file `<image-path> [vision]`.

## Why not just `tiktoken`?

`tiktoken`'s `cl100k_base` (the encoding most "Claude tokenizer" libraries fall back on) **under-counts Opus 4.7 by a median of +62%** across a 10-prompt benchmark. Sonnet 4.6 and Haiku 4.5 are closer (~17%). Format choice is a wash. Model choice swings cost by 12×. See [README](https://github.com/faraa2m/tokenometer#findings-anthropic-n150-cells-across-10-prompt-shapes) for the dataset findings.

## License

MIT
