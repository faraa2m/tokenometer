# Tokenometer

[![npm tokenometer](https://img.shields.io/npm/v/tokenometer.svg?label=tokenometer)](https://www.npmjs.com/package/tokenometer)
[![npm @tokenometer/core](https://img.shields.io/npm/v/@tokenometer/core.svg?label=@tokenometer/core)](https://www.npmjs.com/package/@tokenometer/core)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/faraa2m.tokenometer-vscode?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=faraa2m.tokenometer-vscode)
[![Open VSX](https://img.shields.io/open-vsx/v/faraa2m/tokenometer-vscode?label=Open%20VSX)](https://open-vsx.org/extension/faraa2m/tokenometer-vscode)
[![CI](https://github.com/faraa2m/tokenometer/actions/workflows/ci.yml/badge.svg)](https://github.com/faraa2m/tokenometer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/faraa2m/tokenometer.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/faraa2m/tokenometer.svg?style=social)](https://github.com/faraa2m/tokenometer/stargazers)

> Tokenometer — LLM cost calculator, token counter, latency benchmark, and CI cost guardrail for Claude, GPT-4o, Gemini, Mistral, and Cohere. CLI + GitHub Action + VS Code extension + Claude Code skill.
> **Live: https://tokenometer.dev**

Created and maintained by [Faraazuddin Mohammed](https://github.com/faraa2m) · [LinkedIn](https://www.linkedin.com/in/faraazuddin-mohammed/) · [HackerNoon](https://hackernoon.com/u/faraa2m)

> [!WARNING]
> `tokenometer.cloud` is not affiliated with this project or its maintainer. Do not enter credentials, API keys, or provider tokens there. Official Tokenometer surfaces are this GitHub repository, the npm packages linked above, the VS Code/Open VSX marketplace listings, and `https://tokenometer.dev`.

Tokenometer answers a simple, expensive question: **does it actually cost less to send your prompt as YAML, JSON, XML, or Markdown — across Claude, GPT-4o, Gemini, Mistral, and Cohere — and how fast does each provider actually respond?** It started as a [\$23 question](https://hackernoon.com/i-spent-$23-testing-the-yaml-saves-tokens-hack-it-doesnt-work). Today it's the only LLM cost CLI that also tells you latency, ships a PR-blocking GitHub Action, lights up your editor's status bar, and teaches Claude Code agents to think in dollars.

## Why Tokenometer vs alternatives

|                                       | Tokenometer | [tokencost](https://github.com/AgentOps-AI/tokencost) (AgentOps) | [tiktoken](https://github.com/openai/tiktoken) (OpenAI) | [gpt-tokenizer](https://github.com/niieani/gpt-tokenizer) | [promptfoo](https://github.com/promptfoo/promptfoo) | gpt-token-counter-live (VS Code) |
|---------------------------------------|:-----------:|:--------:|:--------:|:--------:|:--------:|:--------:|
| Multi-provider (Anthropic / OpenAI / Google) | ✓ | ✓ | – | – | ✓ | – |
| Mistral support                       | ✓ | – | – | – | partial | – |
| Cohere support                        | ✓ | – | – | – | partial | – |
| Multi-format compare (JSON / YAML / XML / MD / text) | ✓ | – | – | – | – | – |
| Empirical mode (real provider `countTokens`) | ✓ | – | – | – | partial | – |
| Latency (TTFT + tokens/sec, p50/p95)  | ✓ | – | – | – | partial | – |
| Vision-token cost (image inputs)      | ✓ | – | – | – | – | – |
| Cost (USD), not just tokens           | ✓ | ✓ | – | – | partial | – |
| Honest "approximate" flag when offline is a proxy | ✓ | – | – | – | – | – |
| CLI                                   | ✓ | ✓ | – | – | ✓ | – |
| GitHub Action (PR cost-diff guardrail) | ✓ | – | – | – | partial | – |
| Per-file attribution in CI            | ✓ | – | – | – | – | – |
| SARIF output (GitHub code scanning)   | ✓ | – | – | – | – | – |
| VS Code / Cursor extension            | ✓ | – | – | – | – | ✓ |
| Claude Code skill                     | ✓ | – | – | – | – | – |

Tokenometer is the only tool in this list that combines **multi-provider (5 providers, 63 models) + multi-format + empirical mode + latency benchmarking + USD cost + a PR-blocking GitHub Action + an editor extension + a Claude Code skill + an honest approximate-vs-exact flag**. tokencost is the closest match for cost-in-USD across providers, but it doesn't compare formats, measure latency, or run as a CI guardrail. tiktoken and gpt-tokenizer are great single-provider primitives — Tokenometer uses gpt-tokenizer under the hood for the offline path. promptfoo is the broadest evaluator overall, but cost is one input among many; it isn't a dedicated cost-guardrail. The VS Code extension is real-time-in-editor only.

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

The `Approx` column shows `✓` when the count is a proxy (Anthropic / Google / Mistral-Tekken / Cohere offline) and is empty when it's an exact match (OpenAI offline, Mistral SentencePiece-family offline, or any provider with `--empirical`).

> Real demo (with empirical mode + GIF) at **https://tokenometer.dev**.

## Why this exists

**Cost AND latency in one CLI — the only tool that does both.** `tiktoken` and `@anthropic-ai/tokenizer` give you a token count for one provider. They don't tell you:

- What the same prompt costs across **multiple providers and models** (Claude, GPT-4o, Gemini, Mistral, Cohere)
- How **fast** each provider actually responds (TTFT + tokens/sec, p50/p95/mean) — a real generation, not a synthetic benchmark
- Whether **format conversion** (YAML ↔ JSON ↔ XML ↔ MD) actually moves the needle
- The **empirical** cost — what your provider actually charged on a real call, after prompt caching
- Whether a PR introduced a **prompt-cost regression**
- The **vision-token** cost when your prompt includes images

Tokenometer is dev-time, multi-provider, multi-format, optionally empirical, latency-aware, vision-aware, and CI-native. And the same core powers the CLI, the GitHub Action, the VS Code / Cursor status bar, and the Claude Code skill — counts, pricing, and tokenizer choices stay identical across surfaces.

## Install

One-shot:

```bash
npx tokenometer ./prompt.md --model claude-opus-4-7
```

Global:

```bash
npm i -g tokenometer
tokenometer ./prompt.md --format yaml,json,xml,markdown,text --model claude-opus-4-7,gpt-4o,mistral-large-latest,command-r-plus
```

Stdin works too:

```bash
echo "prompt body" | tokenometer - --model claude-sonnet-4-6
```

Run `tokenometer --help` for the full flag list and the current set of known model ids (63 across 5 providers).

## Adoption playbooks

Use [`docs/ADOPTION.md`](docs/ADOPTION.md) for copy-paste integration paths:
GitHub Actions cost gates, VS Code/Cursor rollout, MCP clients, LangChain,
Vercel AI SDK, OpenAI SDK, Anthropic SDK, and a PR cost-regression case study.

Canonical tutorial: [Add an LLM Prompt Cost Gate to GitHub Actions in 10 Minutes](docs/tutorials/add-llm-prompt-cost-gate-github-actions.md).

## Five-line use

### 1. Compare formats for a single prompt (offline, no API key)

```bash
tokenometer ./prompt.md --model claude-opus-4-7
```

Prints estimated tokens + USD across each format × the chosen model(s). Default model is `claude-opus-4-7` (or auto-detected from `*_API_KEY` env vars); default formats are all of `json,markdown,text,xml,yaml`.

### 2. Empirical mode (real provider `countTokens`, with a hard ceiling)

```bash
ANTHROPIC_API_KEY=… tokenometer ./prompt.md --empirical --max-spend 0.05
```

For each `(model × format)` cell, calls the provider's exact token-count API:

- Anthropic → `messages.countTokens` (free)
- Google → `model.countTokens` (free)
- OpenAI → tiktoken `o200k_base` (matches OpenAI's production count exactly, no API call)
- Cohere → `POST /v1/tokenize` (free, requires `COHERE_API_KEY`)
- Mistral → unsupported (no public token-count endpoint); offline `mistral-tokenizer-js` is exact for SentencePiece-family models, approximate (chars/4) for Tekken-family models.

Set `GOOGLE_API_KEY` (or `GEMINI_API_KEY`) for Gemini, `MISTRAL_API_KEY` for Mistral, `COHERE_API_KEY` for Cohere. `--offline` forces the offline path even if `--empirical` is also passed.

### 3. CI guardrail (GitHub Action)

```yaml
- uses: faraa2m/tokenometer/packages/action@v1
  with:
    paths: prompts/**/*.md,prompts/**/*.json
    models: claude-opus-4-7,claude-sonnet-4-6,gpt-4o
    formats: json,yaml,markdown
    budget: '0.50'      # USD; omit to disable the gate
    top-n-files: 5      # rows shown in the per-file Δ table; the rest fold into <details>
```

Posts a sticky PR comment with the cost diff vs the base branch, including a per-file Δ table and a collapsible "all files" block. Fails the check when the total Δ exceeds `budget`. See [`packages/action/README.md`](packages/action/README.md) for all inputs and outputs.

### 4. Live cost in your editor (VS Code / Cursor)

```
ext install faraa2m.tokenometer-vscode
```

Or install directly from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=faraa2m.tokenometer-vscode) or [Open VSX](https://open-vsx.org/extension/faraa2m/tokenometer-vscode) (Cursor / VSCodium).

Status bar shows `model · tokens · USD` for the active prompt file, updates on every keystroke (debounced), and turns warning-colored when you exceed `tokenometer.warnOnCostAbove`. Same `@tokenometer/core` as the CLI — what you see in the editor matches what CI computes. See [`packages/vscode/README.md`](packages/vscode/README.md).

### 5. Claude Code skill (agentic prompt-cost awareness)

```bash
cp -R packages/claude-code-skill ~/.claude/skills/tokenometer
```

Installs the `tokenometer-cost-check` skill so Claude Code agents can answer "what does this prompt cost?" with a real number — they shell out to `npx tokenometer` instead of guessing from `tiktoken`. See [`packages/claude-code-skill/README.md`](packages/claude-code-skill/README.md).

## Methodology

Tokenometer picks a tokenizer per provider and flags the count as approximate (`approximate: true` in the API result) when the offline path is a proxy:

| Provider  | Offline tokenizer                              | Exactness   | Empirical (`--empirical`)        |
|-----------|------------------------------------------------|-------------|----------------------------------|
| OpenAI    | `gpt-tokenizer` `o200k_base`                   | exact       | same `o200k_base` (matches OpenAI production count) |
| Anthropic | `gpt-tokenizer` `cl100k_base`                  | approximate | `messages.countTokens` (exact, free) |
| Google    | `chars / 4` heuristic                          | approximate | `model.countTokens` (exact, free) |
| Mistral   | `mistral-tokenizer-js` (V1/V2/V3) · `chars/4` for Tekken family | exact for SP-family · approximate for Tekken | unsupported (no public token-count endpoint) |
| Cohere    | `chars / 4` heuristic                          | approximate | `POST /v1/tokenize` (exact, free, requires `COHERE_API_KEY`) |

Cost = `tokens / 1000 × per-1k input rate`. Pricing and context windows are sourced from the [`tokenlens`](https://www.npmjs.com/package/tokenlens) registry, with a small set of local overrides for bleeding-edge models the registry hasn't picked up yet (and the full Cohere catalog, which `@tokenlens/models` doesn't ship at v1.3.0) — see [`packages/core/src/rates.ts`](packages/core/src/rates.ts) (`RATES_VERSION`). Local overrides were last checked against Anthropic and Cohere public pricing on 2026-05-23.

## Output formats

The CLI is multi-surface by design:

- **`--output table`** (default) — human-readable per-cell table.
- **`--output json`** — emits a `TokenometerResult` shape (`{ files: [{ path, results: [...] }] }`); pipe to `jq`.
- **`--output sarif`** — emits SARIF 2.1.0; drop into GitHub Code Scanning or any SARIF viewer.
- **`--by-file`** — appends a per-file token + USD summary table for multi-file inputs.
- **`--image <path>`** (repeatable) — adds vision-token cost for Claude / GPT-4o / Gemini.
- **`--latency`** — measures real generation latency (TTFT + total ms + tokens/sec, p50/p95/mean over `n` trials, default 3). Implies `--empirical`. Supported on Anthropic, OpenAI, Google, Cohere, and Mistral.

```bash
npx tokenometer ./prompt.md --output sarif > tokenometer.sarif
npx tokenometer ./prompts/*.md --by-file --output json | jq '.files[].results | map(.inputCost) | add'
ANTHROPIC_API_KEY=… OPENAI_API_KEY=… npx tokenometer ./prompt.md --latency --model claude-opus-4-7,gpt-4o
```

Full flag reference: [`packages/cli/README.md`](packages/cli/README.md).

## Editor + Claude Code

- **VS Code / Cursor** — [`@tokenometer/vscode`](packages/vscode/README.md). Status bar with live token count + USD cost; settings for model, format, and a warn-above-USD threshold; `Tokenometer: Switch model` and `Tokenometer: Show details` commands.
- **Claude Code skill** — [`@tokenometer/claude-code-skill`](packages/claude-code-skill/README.md). Drop in `~/.claude/skills/tokenometer/SKILL.md` and Claude Code agents will reach for `npx tokenometer …` when you ask them anything cost-shaped.

## Project health

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md) — uses GitHub Private Vulnerability Reporting
- [Changelog](CHANGELOG.md)
- [Discussions](https://github.com/faraa2m/tokenometer/discussions)

## More from Faraazuddin Mohammed

Tokenometer is part of a focused open-source toolkit for LLM cost, tokenization, routing, and prompt optimization.

- [llm-tokens-atlas](https://github.com/faraa2m/llm-tokens-atlas) — open benchmark of LLM tokenization calibration across providers.
- [Hugging Face dataset](https://huggingface.co/datasets/faraa2m/llm-tokens-atlas) — canonical public dataset behind the tokenization atlas.
- [promptc](https://github.com/faraa2m/promptc) — deterministic compiler for cost-aware prompt optimization.
- [routerlab](https://github.com/faraa2m/routerlab) — cost-quality routing for LLM APIs with reproducible Pareto frontiers.
- [ast-ai-model-router](https://github.com/faraa2m/ast-ai-model-router) — AST-aware Claude and Codex model router for token-conscious coding agents.

## Status

**v2.x — production-ready.** Shipped across npm (`tokenometer`, `@tokenometer/core`, `@tokenometer/mcp`), VS Code Marketplace + Open VSX (`faraa2m.tokenometer-vscode`), the repo-hosted GitHub Action (`faraa2m/tokenometer/packages/action@v1`), and the live playground at [tokenometer.dev](https://tokenometer.dev). See [CHANGELOG.md](CHANGELOG.md) for release notes and the [milestones page](https://github.com/faraa2m/tokenometer/milestones) for what's next.

## License

MIT
