# Tokenometer

> Empirical token-cost benchmarking for LLM prompts. **Live: https://tokenometer.vercel.app**

Tokenometer answers a simple, expensive question: **does it actually cost less to send your prompt as YAML, JSON, XML, or Markdown — across Claude, GPT-4o, and Gemini?**

It started as a [\$23 question](https://hackernoon.com/i-spent-$23-testing-the-yaml-saves-tokens-hack-it-doesnt-work). This is the tool anyone can run.

## Findings (Anthropic, n=150 cells across 10 prompt shapes)

- `claude-opus-4-7` real `messages.countTokens` is **+62% denser (median)** than the popular `cl100k_base` proxy. **If you budget Claude cost from `tiktoken`, you under-budget by ~half.**
- `claude-sonnet-4-6` and `claude-haiku-4-5` are within ~17% of `cl100k_base` (and **identical to each other** — same tokenizer family).
- Format choice (JSON / YAML / XML / Markdown / text) is a wash — within ~1pp on the median delta. Picking a cheaper model saves 7-12×; reformatting saves ~10%.
- `gpt-4o` empirical (Anthropic's countTokens equivalent for OpenAI: tiktoken `o200k_base`) matches the offline tokenometer counts on **100/100 cells, exactly**. Sanity anchor.

Reproduce: `npm install && npm run benchmarks:empirical` with `ANTHROPIC_API_KEY` set. Full sweep is free (countTokens is free).

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

## Methodology

Tokenometer picks a tokenizer per provider and flags the count as approximate (`approximate: true` in the API result) when the offline path is a proxy:

| Provider  | Offline tokenizer            | Exactness   | Empirical (`--empirical`)        |
|-----------|------------------------------|-------------|----------------------------------|
| OpenAI    | `gpt-tokenizer` `o200k_base` | exact       | same `o200k_base` (matches OpenAI production count) |
| Anthropic | `gpt-tokenizer` `cl100k_base`| approximate | `messages.countTokens` (exact, free) |
| Google    | `chars / 4` heuristic        | approximate | `model.countTokens` (exact, free) |

Cost = `tokens / 1000 × per-1k input rate`. Pricing and context windows are sourced from the [`tokenlens`](https://www.npmjs.com/package/tokenlens) registry, with a small set of local overrides for bleeding-edge models the registry hasn't picked up yet — see [`packages/core/src/rates.ts`](packages/core/src/rates.ts) (`RATES_VERSION`).

## Status

Early. v0.0.x — see [milestones](https://github.com/faraa2m/tokenometer/milestones).

## License

MIT
