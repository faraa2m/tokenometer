# Tokenometer GitHub Action

[![License: MIT](https://img.shields.io/github/license/faraa2m/tokenometer.svg)](https://github.com/faraa2m/tokenometer/blob/main/LICENSE)
<!-- TODO: add marketplace badge after v1.0.0 publish -->

Posts a sticky PR comment with the prompt-cost diff between your branch and its base. Fails the check when the delta exceeds a budget.

See the [root README](https://github.com/faraa2m/tokenometer#readme) for findings, methodology, and the full project overview.

## Usage

```yaml
# .github/workflows/prompt-cost.yml
name: prompt-cost
on:
  pull_request:
    paths:
      - 'prompts/**'
permissions:
  contents: read
  pull-requests: write
jobs:
  measure:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: faraa2m/tokenometer@v0
        with:
          paths: prompts/**/*.md,prompts/**/*.json
          models: claude-opus-4-7,claude-sonnet-4-6,gpt-4o
          formats: json,yaml,markdown
          budget: '0.50' # USD; omit to disable the gate
```

## Inputs

| Name | Default | Notes |
|---|---|---|
| `paths` | `prompts/**/*.{md,json,yaml,yml,txt}` | Comma- or newline-separated globs |
| `models` | `claude-opus-4-7,claude-sonnet-4-6,gpt-4o` | Any tokenometer-supported model id |
| `formats` | `json,yaml,xml,markdown,text` | Subset of supported formats |
| `budget` | _empty_ | Max acceptable total Δ in USD. Empty = disabled |
| `base-ref` | _auto_ | Falls back to `origin/<pr-base>` for PRs, `HEAD~1` otherwise |
| `comment-marker` | `<!-- tokenometer-cost-diff -->` | Sticky comment HTML marker |
| `github-token` | `${{ github.token }}` | Needs `pull-requests: write` |

## Outputs

| Name | Notes |
|---|---|
| `cost-delta` | Total head − base cost in USD (8 decimals) |
| `comment-url` | URL of the sticky comment |

## What it measures

Same offline tokenizer dispatch as the CLI:

- OpenAI: `gpt-tokenizer` `o200k_base` (exact)
- Anthropic: `gpt-tokenizer` `cl100k_base` (approximation — Anthropic does not ship a public Claude 3+ tokenizer)
- Google: `chars / 4` heuristic

Empirical mode (real provider `countTokens` calls) is intentionally **not** wired into the Action — the Action runs on every PR and would either need an Anthropic key in repo secrets (risk) or limit itself to OpenAI (asymmetric). For exact Claude / Gemini numbers, run `npx tokenometer <file> --empirical` locally.

## License

MIT
