# Tokenometer

> Empirical token-cost benchmarking for LLM prompts.

Tokenometer answers a simple, expensive question: **does it actually cost less to send your prompt as YAML, JSON, XML, or Markdown — across Claude, GPT-4o, and Gemini?**

It started as a [\$23 question](https://hackernoon.com/i-spent-$23-testing-the-yaml-saves-tokens-hack-it-doesnt-work). This is the tool anyone can run.

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

## Status

Early. v0 — see [milestones](https://github.com/faraa2m/tokenometer/milestones).

## License

MIT
