---
"tokenometer": major
"@tokenometer/core": major
---

# Tokenometer v1.0.0 — production-ready release

First stable release. Every advertised feature is shipped, end-to-end tested in CI, and live across npm + VS Code Marketplace + Open VSX + GitHub Marketplace + the public playground.

## What's in v1.0.0

**Providers (5)** — Anthropic, OpenAI, Google, Mistral, Cohere. **63 known model ids.**

**Tokenization paths**
- Offline (default): exact for OpenAI (`o200k_base`), `cl100k_base` proxy for Anthropic (`approximate: true`), `chars/4` heuristic for Google (`approximate: true`), `mistral-tokenizer-js` for Mistral SentencePiece family + `chars/4` for Tekken family (all `approximate: true`), `chars/4` for Cohere (`approximate: true`).
- Empirical (`--empirical`): real provider `countTokens` calls — Anthropic `messages.countTokens` (free), Google `model.countTokens` (free), tiktoken `o200k_base` for OpenAI, Cohere `/v1/tokenize` (free). Mistral has no public token-count API; throws a clear error.

**CLI flags**
- `--model`, `--format` (json/yaml/xml/markdown/text), `--output table|json|sarif`, `--by-file`, `--image`, `--latency`, `--latency-trials`, `--config`, `--no-config`, `--empirical`, `--max-spend`, `--offline`, auto provider detection from `*_API_KEY` env.

**Latency mode** — the only LLM cost CLI that also reports TTFT + p50/p95/mean wall-clock + tokens/sec across all 5 providers.

**Vision tokens** — formula-based estimation for Anthropic / OpenAI / Gemini images via `--image <path>`. SARIF output via `--output sarif`. Per-file attribution via `--by-file`. Declarative defaults via `.tokenometer.yml`.

**GitHub Action** — sticky PR comment with prompt-cost diff + per-file Δ table + budget gate. New `top-n-files` input. Bundled JS Action; published to GitHub Marketplace.

**VS Code / Cursor extension** — live token count + USD cost in status bar for the active editor file. Settings: model, format, warn-on-cost-above. Published to VS Code Marketplace + Open VSX.

**Claude Code skill** — `tokenometer-cost-check` skill that teaches Claude Code agents to invoke the CLI for prompt cost analysis. One-line install to `~/.claude/skills/tokenometer/`.

**Web playground** — calculator, Cost Atlas (all 63 models, sortable + searchable), per-model SEO pages, prompt-diff preview, vision-token cost estimator, SARIF JSON viewer, config builder, init wizard. Live at https://tokenometer.vercel.app.

**Empirical findings** — `tiktoken cl100k_base` under-counts Claude Opus by 62% median. Format choice (JSON / YAML / XML / Markdown / text) is rounding error vs model choice (Opus → Haiku is 7-12× cheaper).

**Release pipeline** — Changesets-driven version PR + auto-CHANGELOG. One trigger ships: npm × 2 (with provenance) → GH Release → Action Marketplace re-publish → VS Code Marketplace → Open VSX → Vercel deploy → smoke-test job.

## Project health

- `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1)
- `CONTRIBUTING.md`
- `SECURITY.md` (GitHub Private Vulnerability Reporting; no email exposure)
- `.github/copilot-instructions.md` (consumed by `gh copilot review`)
- 227 unit tests across 20 files
- Lint, typecheck, root + web builds, benchmarks all green

## Migration from 0.x

No breaking API changes between `0.1.3` and `1.0.0`. Bumping the major signals stability — the surface is now under semver guarantees.
