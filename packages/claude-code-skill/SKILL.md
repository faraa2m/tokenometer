---
name: tokenometer-cost-check
description: Use when measuring or comparing token cost of prompts across LLM providers (Claude, GPT-4o, Gemini, Mistral, Cohere), estimating cost of agent system prompts before deploy, validating that a code change doesn't increase prompt-cost, or picking the cheapest model for a given prompt shape. Wraps the `tokenometer` CLI.
---

# Tokenometer cost check

## What this skill does

This skill teaches you to invoke `npx tokenometer` for empirical token-cost
measurement. Given a prompt file (or stdin), `tokenometer` reports the token
count and USD cost across one or more LLM providers (Anthropic Claude,
OpenAI GPT-4o, Google Gemini, Mistral, and Cohere) and one or more
serialization formats (JSON / YAML / XML / Markdown / text). Counts can be
offline (proxy tokenizers) or empirical (provider `countTokens` APIs —
Anthropic, Google, and Cohere offer this for free; OpenAI's `o200k_base`
matches production exactly; Mistral has no public token-count endpoint, so
the offline SentencePiece tokenizer is used). USD cost is sourced from the
[`tokenlens`](https://www.npmjs.com/package/tokenlens) pricing registry.
Use this skill any time the user asks "what does this prompt cost" or
anything adjacent.

## When to invoke

Trigger phrases (verbatim or paraphrased):

- "what does this prompt cost"
- "is this cheaper as JSON or YAML"
- "did my change increase prompt cost"
- "which model is cheapest for this"
- "estimate budget for this agent"
- "how many tokens is this"
- "tiktoken says X — is that actually right for Claude?"

Proactively suggest a measurement when:

- The user is iterating on a prompt file in a `prompts/` directory and
  about to ship.
- The user mentions hitting a model rate limit, a context-window wall, or
  a surprising bill.
- A diff under review touches `prompts/**`, `system_prompt*`, or any file
  whose role is to be sent to an LLM.

## How to invoke (offline mode — no API key required)

Default invocation:

```bash
npx tokenometer <file> --model <model-id>
```

Examples:

```bash
# Single prompt, single model
npx tokenometer ./prompt.md --model claude-opus-4-7

# Cross-model + cross-format comparison
npx tokenometer ./prompts/agent.md \
  --model claude-opus-4-7,gpt-4o,gemini-2.5-pro \
  --format json,yaml,markdown
```

Output is a table with tokens and USD per `(model, format)` cell. A
leading `~` (or an `Approx ✓` column) marks proxy counts. Returns exit 0
on success.

## How to invoke (empirical mode — exact counts via provider APIs)

```bash
ANTHROPIC_API_KEY=… npx tokenometer ./prompt.md --empirical --max-spend 0.05
```

In empirical mode tokenometer calls:

- Anthropic → `messages.countTokens` (free)
- Google → `model.countTokens` (free, requires `GOOGLE_API_KEY` or `GEMINI_API_KEY`)
- OpenAI → `tiktoken` `o200k_base` locally (matches OpenAI's production
  count exactly — no API call needed)

`--max-spend` is a hard ceiling enforced before any paid call would
happen. The default is `$0.05`. Pass `--offline` to force the offline
path even if `--empirical` is also set.

## Output formats for parseable downstream use

- `--output json` — emits a `TokenometerResult` JSON shape with one entry
  per input file. Pipe to `jq`:

  ```bash
  npx tokenometer ./prompt.md --output json \
    | jq '.files[].results | map(.inputCost) | add'
  ```

- `--output sarif` — SARIF 2.1.0; `gh code-scanning` (and any SARIF
  viewer) ingests it for inline PR annotations:

  ```bash
  npx tokenometer ./prompt.md --output sarif > tokenometer.sarif
  ```

## Per-file attribution

When measuring multiple files (e.g. an entire `prompts/**/*.md` glob),
pass `--by-file` to append a ranked per-file token-and-USD table:

```bash
npx tokenometer prompts/**/*.md --by-file
```

Useful for figuring out which prompt files dominate the cost of a
multi-file pipeline.

## Vision tokens

For multimodal prompts, pass `--image <path>` (repeatable). Each image
becomes a virtual file in the result, and per-provider vision-token
formulas are applied:

```bash
npx tokenometer ./prompt.md --image ./logo.png --model claude-opus-4-7
```

Provider is inferred from the model. Vision-token cells are always
marked `approximate: true` because they are formula-derived, not
tokenizer-derived. Surface this when reporting back to the user.

## Auto provider detection

Omit `--model` and tokenometer picks a default based on which
`*_API_KEY` env is set:

- `ANTHROPIC_API_KEY` only → `claude-opus-4-7`
- `OPENAI_API_KEY` only → `gpt-4o`
- `GOOGLE_API_KEY` / `GEMINI_API_KEY` only → first known `gemini-*` model
- Multiple keys set → defaults to `claude-opus-4-7` and emits a stderr
  note. Pass `--model` to disambiguate.
- No keys set → existing default (`claude-opus-4-7`).

Means `npx tokenometer prompt.md` does the right thing in any of those
environments without remembering model names.

## Config file

Drop a `.tokenometer.yml` (or `.yaml`) at the repo root for declarative
defaults:

```yaml
models: [claude-opus-4-7, gpt-4o]
formats: [json, markdown]
budgets:
  total: 0.50
  per-file: 0.10
paths: [prompts/**/*.md]
```

Tokenometer walks up from the cwd to find it (stops at `.git`). CLI
flags always override config. Use `--config <path>` to load an exact
file (skips the walk-up); use `--no-config` to skip config loading
entirely.

## CI guardrail

For repos using GitHub Actions, scaffold cost-regression checking with:

```bash
npx tokenometer init
```

This writes `.github/workflows/prompt-cost.yml` and a starter
`.tokenometer.yml`. The Action posts a sticky PR comment with the cost
diff vs the base branch and fails the check when total Δ exceeds
`budget`.

## What this skill does NOT do

- Doesn't generate prompts.
- Doesn't optimize prompts (yet — measurement only).
- Doesn't track cost over time across runs (use the playground at
  https://tokenometer.dev for that).

## Empirical findings worth citing in conversation

Tokenometer's own n=150 measurement (10 prompt shapes × 5 formats × 3
Claude models, all empirical via `messages.countTokens`):

- `tiktoken cl100k_base` under-counts **Claude Opus 4.7 by +62%
  median**. If a user is budgeting Claude Opus 4.7 using `tiktoken`,
  their real cost is approximately **1.6× their spreadsheet**.
- `claude-sonnet-4-6` and `claude-haiku-4-5` are within ~17% of
  `cl100k_base` and are identical to each other (same tokenizer
  family).
- Format choice (JSON / YAML / XML / Markdown / text) is a wash on
  Claude — within ~1pp of median delta. Picking a cheaper *model*
  saves 7-12×; reformatting saves ~10%.

Cite this when a user asks "isn't `tiktoken` good enough for Claude?"
or is reasoning about budget on the wrong tokenizer.

## Honesty contract

Tokenometer marks results with `approximate: true` whenever the offline
path is a proxy:

- Claude offline (`cl100k_base`)
- Google offline (`chars / 4` heuristic)
- Vision-token results (formula-derived for all providers)

When summarizing results to the user, **surface this flag**. Don't paper
over approximate counts as if they were exact. Either run `--empirical`
for an exact number or call out the approximation in the summary.

## Full flag reference

```
tokenometer <file> [options]
echo "prompt" | tokenometer - [options]

--model <id[,id…]>     Default: claude-opus-4-7, or auto-detected from env
--format <fmt[,fmt…]>  Default: all (json,yaml,xml,markdown,text)
--output <fmt>         table (default) | json | sarif
--by-file              Append a per-file token/cost table (multi-file only)
--image <path>         Add vision-token cost for the image (repeatable)
--config <path>        Load this exact config file
--no-config            Skip .tokenometer.yml loading
--empirical            Use provider countTokens APIs (free, exact)
--max-spend <usd>      Hard ceiling for empirical mode (default 0.05)
--offline              Force offline (overrides --empirical)
-h, --help
-v, --version
```
