# tokenometer

[![npm tokenometer](https://img.shields.io/npm/v/tokenometer.svg?label=tokenometer)](https://www.npmjs.com/package/tokenometer)
[![License: MIT](https://img.shields.io/github/license/faraa2m/tokenometer.svg)](https://github.com/faraa2m/tokenometer/blob/main/LICENSE)

> Empirical token-cost benchmarking for LLM prompts. Tells you what your prompt actually costs across Claude, GPT-4o, and Gemini, in every format.

See the [root README](https://github.com/faraa2m/tokenometer#readme) for findings, methodology, and the full project overview.

[**Live playground: tokenometer.vercel.app**](https://tokenometer.vercel.app) · [Source](https://github.com/faraa2m/tokenometer) · MIT

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

A leading `~` marks an approximate count (offline mode for Claude / Gemini, since neither vendor publishes a public tokenizer).

## Empirical mode

For exact, vendor-billed counts on Claude and Gemini, set the right env var and pass `--empirical`. The tool calls the providers' free `countTokens` endpoints — no charge.

```bash
ANTHROPIC_API_KEY=… GOOGLE_API_KEY=… \
  npx tokenometer ./prompt.md --empirical
```

## Auto provider detection

When `--model` is omitted, tokenometer picks a default based on which provider key is set in your environment:

- `ANTHROPIC_API_KEY` only → `claude-opus-4-7`
- `OPENAI_API_KEY` only → `gpt-4o`
- `GOOGLE_API_KEY` / `GEMINI_API_KEY` only → first known `gemini-*` model (falls back to `gemini-2.5-pro`)
- Multiple keys set → falls back to `claude-opus-4-7` and prints a stderr note. Pass `--model` to disambiguate.
- No keys set → existing default (`claude-opus-4-7`).

This means `npx tokenometer prompt.md` does the right thing in any of those environments without you having to remember model names.

## `.tokenometer.yml` config

Drop a `.tokenometer.yml` (or `.yaml`) at the project root and tokenometer will pick it up automatically (walks up from the cwd, stopping at `.git`):

```yaml
models: [claude-opus-4-7, gpt-4o]
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

## Per-file attribution

`--by-file` appends a per-file token + USD summary table when you pass multiple input files (single-file inputs are a no-op):

```
By file:
  File              Tokens   USD
  ────────────────  ───────  ───────
  prompts/agent.md  1,243    $0.0186
  prompts/router.md   872    $0.0131
```

Useful for figuring out which prompt files dominate the cost of a multi-file pipeline.

## Vision tokens

Pass `--image <path>` (repeatable) to factor image-based vision tokens into the cost estimate alongside your prompt text:

```bash
npx tokenometer ./prompt.md --image ./screenshot.png --image ./diagram.jpg
```

Each image's dimensions are read with `image-size` (no native deps), then dispatched to the provider-specific vision-token estimator:

- Claude → Anthropic's `(width × height) / 750`, capped at 1600 tokens.
- GPT-4o → OpenAI's high-detail tiling: `85 + 170 × ceil(w/512) × ceil(h/512)` after the 2048/768 resize step.
- Gemini → Google's `258 × ceil(w/768) × ceil(h/768)` (with a flat 258 for ≤384×384 images).

Vision-token cells are always marked `approximate: true` since they're formula-derived. Each image also gets its own row in the `--by-file` table as a virtual file `<image-path> [vision]`.

## Why not just `tiktoken`?

`tiktoken`'s `cl100k_base` (the encoding most "Claude tokenizer" libraries fall back on) **under-counts Opus 4.7 by a median of +62%** across a 10-prompt benchmark. Sonnet 4.6 and Haiku 4.5 are closer (~17%). Format choice is a wash. Model choice swings cost by 12×. See [README](https://github.com/faraa2m/tokenometer#findings-anthropic-n150-cells-across-10-prompt-shapes) for the dataset findings.

## Flags

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

## License

MIT
