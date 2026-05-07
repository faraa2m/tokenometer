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

```bash
npx tokenometer ./prompt.md --model claude-opus-4-7
```

Or:

```bash
npm i -g tokenometer
tokenometer ./prompt.md --format yaml,json,xml,md --model claude-opus-4-7,gpt-4o,gemini-2.5-pro
```

## Three-line use

### 1. Compare formats for a single prompt (offline, no API key)

```bash
tokenometer ./prompt.md --model claude-opus-4-7
```

Prints estimated cost across all formats × the chosen model.

### 2. Empirical mode (real API calls, cache-aware, with a hard ceiling)

```bash
ANTHROPIC_API_KEY=… tokenometer ./prompt.md --empirical --max-spend 0.05
```

Sends one minimal call per (provider × format), records `usage.input_tokens` and `cache_read_input_tokens`, prints empirical $ next to estimated.

### 3. CI guardrail

```yaml
- uses: faraa2m/tokenometer-action@v1
  with:
    paths: prompts/**/*.md
    budget: 0.50
```

Posts a sticky PR comment with the cost diff vs the base branch. Fails the check if the diff exceeds `budget`.

## Methodology

Tokenometer chooses a tokenizer per provider and tells you when the count is approximate (rendered with a leading `~` and `approximate: true` in the API):

| Provider  | Offline tokenizer            | Exactness   | Notes                                                                 |
|-----------|------------------------------|-------------|-----------------------------------------------------------------------|
| OpenAI    | `gpt-tokenizer` `o200k_base` | exact       | Same encoding GPT-4o / 4o-mini use in production.                      |
| Anthropic | `gpt-tokenizer` `cl100k_base`| approximate | Anthropic does not publish a Claude 3+ tokenizer. cl100k is a close proxy; empirical mode (planned) will call Anthropic for the real number. |
| Google    | `chars / 4` heuristic        | approximate | Gemini token counting is API-only. Empirical mode (planned) will call `countTokens` for the real number. |

Cost = `tokens / 1000 × per-1k input rate`. Rate table is versioned (`RATES_VERSION`) and lives in [`packages/core/src/rates.ts`](packages/core/src/rates.ts).

## Status

Early. v0.0.x — see [milestones](https://github.com/faraa2m/tokenometer/milestones).

## License

MIT
