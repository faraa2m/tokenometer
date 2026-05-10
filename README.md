# Tokenometer

[![npm tokenometer](https://img.shields.io/npm/v/tokenometer.svg?label=tokenometer)](https://www.npmjs.com/package/tokenometer)
[![npm @tokenometer/core](https://img.shields.io/npm/v/@tokenometer/core.svg?label=@tokenometer/core)](https://www.npmjs.com/package/@tokenometer/core)
[![CI](https://github.com/faraa2m/tokenometer/actions/workflows/ci.yml/badge.svg)](https://github.com/faraa2m/tokenometer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/faraa2m/tokenometer.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/faraa2m/tokenometer.svg?style=social)](https://github.com/faraa2m/tokenometer/stargazers)
<!-- TODO: add marketplace badge after v1.0.0 publish -->

> Tokenometer — LLM cost calculator, token counter, and CI cost-guardrail Action for Claude, GPT-4o, Gemini.
> **Live: https://tokenometer.vercel.app**

Tokenometer answers a simple, expensive question: **does it actually cost less to send your prompt as YAML, JSON, XML, or Markdown — across Claude, GPT-4o, and Gemini?** It started as a [\$23 question](https://hackernoon.com/i-spent-$23-testing-the-yaml-saves-tokens-hack-it-doesnt-work). This is the tool anyone can run — offline, empirically, or as a PR guardrail.

## Why Tokenometer vs alternatives

|                                       | Tokenometer | [tokencost](https://github.com/AgentOps-AI/tokencost) (AgentOps) | [tiktoken](https://github.com/openai/tiktoken) (OpenAI) | [gpt-tokenizer](https://github.com/niieani/gpt-tokenizer) | [promptfoo](https://github.com/promptfoo/promptfoo) | gpt-token-counter-live (VS Code) |
|---------------------------------------|:-----------:|:--------:|:--------:|:--------:|:--------:|:--------:|
| Multi-provider (Anthropic / OpenAI / Google) | ✓ | ✓ | – | – | ✓ | – |
| Multi-format compare (JSON / YAML / XML / MD / text) | ✓ | – | – | – | – | – |
| Empirical mode (real provider `countTokens`) | ✓ | – | – | – | partial | – |
| CLI                                   | ✓ | ✓ | – | – | ✓ | – |
| GitHub Action (PR cost-diff guardrail) | ✓ | – | – | – | partial | – |
| VS Code / Cursor extension            | – (planned) | – | – | – | – | ✓ |
| Cost (USD), not just tokens           | ✓ | ✓ | – | – | partial | – |
| Honest "approximate" flag when offline is a proxy | ✓ | – | – | – | – | – |
| Per-file attribution in CI            | ✓ | – | – | – | – | – |

Tokenometer is the only tool in this list that combines **multi-provider + multi-format + empirical mode + USD cost + a PR-blocking GitHub Action + an honest approximate-vs-exact flag**. tokencost is the closest match for cost-in-USD across providers, but it doesn't compare formats or run as a CI guardrail. tiktoken and gpt-tokenizer are great single-provider primitives — Tokenometer uses gpt-tokenizer under the hood for the offline path. promptfoo is the broadest evaluator overall, but cost is one input among many; it isn't a dedicated cost-guardrail. The VS Code extension is real-time-in-editor only.

## Findings (Anthropic, n=150 cells across 10 prompt shapes)

- `claude-opus-4-7` real `messages.countTokens` is **+62% denser (median)** than the popular `cl100k_base` proxy. **If you budget Claude cost from `tiktoken`, you under-budget by ~half.**
- `claude-sonnet-4-6` and `claude-haiku-4-5` are within ~17% of `cl100k_base` (and **identical to each other** — same tokenizer family).
- Format choice (JSON / YAML / XML / Markdown / text) is a wash — within ~1pp on the median delta. Picking a cheaper model saves 7-12×; reformatting saves ~10%.
- `gpt-4o` empirical (Anthropic's countTokens equivalent for OpenAI: tiktoken `o200k_base`) matches the offline tokenometer counts on **100/100 cells, exactly**. Sanity anchor.

Reproduce: `npm install && npm run benchmarks:empirical` with `ANTHROPIC_API_KEY` set. Full sweep is free (countTokens is free).

## Demo

```text
$ tokenometer ./prompt.md --model claude-opus-4-7 --format json,yaml,markdown

  Model              Format     Tokens   USD       Approx
  ────────────────── ────────── ──────── ───────── ──────
  claude-opus-4-7    json       1,243    $0.0186   ✓
  claude-opus-4-7    yaml       1,189    $0.0178   ✓
  claude-opus-4-7    markdown   1,156    $0.0173   ✓

  Cheapest: claude-opus-4-7 as markdown ($0.0173)
  Priciest: claude-opus-4-7 as json     ($0.0186, 1.08x more)
```

The `Approx` column shows `✓` when the count is a proxy (Anthropic / Google offline) and is empty when it's an exact match (OpenAI offline, or any provider with `--empirical`).

> Real demo (with empirical mode + GIF) at **https://tokenometer.vercel.app**.

## Why this exists

`tiktoken` and `@anthropic-ai/tokenizer` give you a token count for one provider. They don't tell you:

- What the same prompt costs across **multiple providers and models**
- Whether **format conversion** (YAML ↔ JSON ↔ XML ↔ MD) actually moves the needle
- The **empirical** cost — what your provider actually charged on a real call, after prompt caching
- Whether a PR introduced a **prompt-cost regression**

Tokenometer is dev-time, multi-provider, multi-format, optionally empirical, and CI-native.

## Install

One-shot:

```bash
npx tokenometer ./prompt.md --model claude-opus-4-7
```

Global:

```bash
npm i -g tokenometer
tokenometer ./prompt.md --format yaml,json,xml,markdown,text --model claude-opus-4-7,gpt-4o
```

Stdin works too:

```bash
echo "prompt body" | tokenometer - --model claude-sonnet-4-6
```

Run `tokenometer --help` for the full flag list and the current set of known model ids.

## Three-line use

### 1. Compare formats for a single prompt (offline, no API key)

```bash
tokenometer ./prompt.md --model claude-opus-4-7
```

Prints estimated tokens + USD across each format × the chosen model(s). Default model is `claude-opus-4-7`; default formats are all of `json,markdown,text,xml,yaml`.

### 2. Empirical mode (real provider `countTokens`, with a hard ceiling)

```bash
ANTHROPIC_API_KEY=… tokenometer ./prompt.md --empirical --max-spend 0.05
```

For each `(model × format)` cell, calls the provider's exact token-count API:

- Anthropic → `messages.countTokens` (free)
- Google → `model.countTokens` (free)
- OpenAI → tiktoken `o200k_base` (matches OpenAI's production count exactly, no API call)

Set `GOOGLE_API_KEY` (or `GEMINI_API_KEY`) for Gemini models. `--offline` forces the offline path even if `--empirical` is also passed.

### 3. CI guardrail (GitHub Action)

```yaml
- uses: faraa2m/tokenometer@v0
  with:
    paths: prompts/**/*.md,prompts/**/*.json
    models: claude-opus-4-7,claude-sonnet-4-6,gpt-4o
    formats: json,yaml,markdown
    budget: '0.50'   # USD; omit to disable the gate
```

Posts a sticky PR comment with the cost diff vs the base branch. Fails the check when the total Δ exceeds `budget`. See [`packages/action/README.md`](packages/action/README.md) for all inputs and outputs.

### More flags

The CLI also supports `--output json|sarif` for machine-readable output, `--by-file` for per-file attribution, `--image <path>` for vision-token cost on Claude / GPT-4o / Gemini, and `.tokenometer.yml` config files (auto-discovered, walk-up). See [`packages/cli/README.md`](packages/cli/README.md) for the full list.

## Methodology

Tokenometer picks a tokenizer per provider and flags the count as approximate (`approximate: true` in the API result) when the offline path is a proxy:

| Provider  | Offline tokenizer            | Exactness   | Empirical (`--empirical`)        |
|-----------|------------------------------|-------------|----------------------------------|
| OpenAI    | `gpt-tokenizer` `o200k_base` | exact       | same `o200k_base` (matches OpenAI production count) |
| Anthropic | `gpt-tokenizer` `cl100k_base`| approximate | `messages.countTokens` (exact, free) |
| Google    | `chars / 4` heuristic        | approximate | `model.countTokens` (exact, free) |

Cost = `tokens / 1000 × per-1k input rate`. Pricing and context windows are sourced from the [`tokenlens`](https://www.npmjs.com/package/tokenlens) registry, with a small set of local overrides for bleeding-edge models the registry hasn't picked up yet — see [`packages/core/src/rates.ts`](packages/core/src/rates.ts) (`RATES_VERSION`).

## Project health

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md) — uses GitHub Private Vulnerability Reporting
- [Changelog](CHANGELOG.md)
- [Discussions](https://github.com/faraa2m/tokenometer/discussions)

## Status

Early. v0.0.x — see [milestones](https://github.com/faraa2m/tokenometer/milestones). Roadmap to v1.0.0 in progress: VS Code extension, Claude Code skill, vision-token cost, Mistral + Cohere providers.

## License

MIT
