# @tokenometer/core

## 2.0.0

### Major Changes

- [#41](https://github.com/faraa2m/tokenometer/pull/41) [`e0b86ff`](https://github.com/faraa2m/tokenometer/commit/e0b86ffe7e6c37cabbe56f02823f7c66f1a14ed8) Thanks [@faraa2m](https://github.com/faraa2m)! - Require Node.js 26 and run CI, release, registry, and automation workflows on Node 26.

## 1.1.0

### Minor Changes

- [#36](https://github.com/faraa2m/tokenometer/pull/36) [`c6249c0`](https://github.com/faraa2m/tokenometer/commit/c6249c05863795d39cf4b9773e5224b7916f0bbf) Thanks [@faraa2m](https://github.com/faraa2m)! - Add `@tokenometer/mcp` — Model Context Protocol server wrapping `@tokenometer/core`. Exposes 10 tools (cost estimation, token counting, model info, vision cost, budget check, latency benchmarking) over stdio so any MCP client (Claude Desktop, Cursor, Zed) can call tokenometer natively. Run with `npx -y @tokenometer/mcp`.

## 1.0.1

### Patch Changes

- [#32](https://github.com/faraa2m/tokenometer/pull/32) [`c1b608b`](https://github.com/faraa2m/tokenometer/commit/c1b608bcce9df8d1a6d3dd51132554fa6f5318fd) Thanks [@faraa2m](https://github.com/faraa2m)! - CLI error UX polish: known user errors (missing API key, unknown model, unknown format) now print a clean one-line `tokenometer: <message>` instead of dumping a Node stack trace under "Unexpected error:". Bad flag / format / output errors now print a short `Run 'tokenometer --help' for usage.` hint instead of dumping the full help body.

  - New `UserFacingError` class in `@tokenometer/core` (exported); thrown by `getModel` / `getRate` for unknown ids and by empirical / latency `requireKey` for missing provider keys.
  - CLI catches `UserFacingError` at both `main()` and the IIFE entry point, so programmatic callers also get a clean exit code (1) instead of a rejected promise.
  - Existing exit-code semantics preserved: `2` for argv parse errors (bad flag / format / output), `1` for runtime user errors (unknown model, missing key, missing file, config error).

## 1.0.0

### Major Changes

- [#29](https://github.com/faraa2m/tokenometer/pull/29) [`d911ef1`](https://github.com/faraa2m/tokenometer/commit/d911ef1fb9ac84f6d79e0fda749ea70d53b9f7d0) Thanks [@faraa2m](https://github.com/faraa2m)! - # Tokenometer v1.0.0 — production-ready release

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

## 0.1.3

### Patch Changes

- [#27](https://github.com/faraa2m/tokenometer/pull/27) [`16daecb`](https://github.com/faraa2m/tokenometer/commit/16daecb6b86b08b1b5656d2c47564f52c4533253) Thanks [@faraa2m](https://github.com/faraa2m)! - Fix `tokenometer --version` always printing `0.0.2` regardless of the
  installed version. The CLI had a hardcoded `const VERSION = '0.0.2'`
  left over from initial scaffolding. Now reads the version from the
  package's own `package.json` at runtime via `import.meta.url`.

  Also hardens the smoke-test job: switches from `npx --yes tokenometer@<v>`
  (which hit `sh: 1: tokenometer: not found` flakiness on Linux runners
  even when the published bin had the execute bit) to `npm install
--no-save` + direct `node node_modules/tokenometer/dist/index.js`.
  Adds a 6-attempt × 30s retry loop to absorb npm registry CDN
  propagation lag right after publish.

## 0.1.2

### Patch Changes

- [#25](https://github.com/faraa2m/tokenometer/pull/25) [`377ebff`](https://github.com/faraa2m/tokenometer/commit/377ebff84fe22147c5b786b336a9852aaebde666) Thanks [@faraa2m](https://github.com/faraa2m)! - Fix CLI bin missing execute bit when published from CI. Root `npm run
build` runs `tsc -b` without recursing into workspace scripts, so the
  chmod added in the CLI's build script never ran in CI. Added a `prepack`
  hook in `packages/cli/package.json` that chmods `dist/index.js` right
  before `npm publish` packs the tarball — runs regardless of how the
  build was invoked.

## 0.1.1

### Patch Changes

- [#23](https://github.com/faraa2m/tokenometer/pull/23) [`776191c`](https://github.com/faraa2m/tokenometer/commit/776191c9f5b24c5978e26a8fe37af6678894297f) Thanks [@faraa2m](https://github.com/faraa2m)! - Fix `tokenometer` CLI not invokable via `npx` on Linux. The published
  `dist/index.js` had no execute bit, so `npx --yes tokenometer@<v>` on
  Linux runners failed with `sh: 1: tokenometer: not found`. Build script
  now chmods +x after tsc emit.

## 0.1.0

### Minor Changes

- [#11](https://github.com/faraa2m/tokenometer/pull/11) [`a864454`](https://github.com/faraa2m/tokenometer/commit/a8644542d65641a4d8804ec4c4153bcfb2ccbf10) Thanks [@faraa2m](https://github.com/faraa2m)! - Project legitimacy and SEO rollout (Wave 1 of v1.0.0):

  - Added `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `CONTRIBUTING.md`, `SECURITY.md` (GitHub Private Vulnerability Reporting only — no email exposure), `CHANGELOG.md`.
  - Added `.github/copilot-instructions.md` for `gh copilot review`, plus `PULL_REQUEST_TEMPLATE.md`, issue forms (`bug_report.yml`, `feature_request.yml`, `config.yml`), and `FUNDING.yml`.
  - Rewrote root `README.md` with badges row, "Why Tokenometer vs alternatives" comparison table (vs `tokencost`, `tiktoken`, `gpt-tokenizer`, `promptfoo`, `gpt-token-counter-live`), ASCII demo of CLI table output, and project-health checklist.
  - Extended npm `keywords` and `description` across `tokenometer` (CLI), `@tokenometer/core`, and `@tokenometer/action` for SEO. Root description now reads: "Tokenometer — LLM cost calculator, token counter, and CI cost-guardrail Action for Claude, GPT-4o, Gemini."
  - Added Marketplace publish prep (`.github/release-notes-v1.0.0.md`) and awesome-list PR templates (`.github/awesome-list-prs/`).
  - Initialized Changesets for auto-bump + auto-CHANGELOG-generation on release. Replaced the manual `release.yml` workflow with the Changesets-driven version-PR + publish flow.

- [#13](https://github.com/faraa2m/tokenometer/pull/13) [`cc745d5`](https://github.com/faraa2m/tokenometer/commit/cc745d5701bec2e9fd4f52afd008b87e63f06802) Thanks [@faraa2m](https://github.com/faraa2m)! - Action sticky PR comment now includes a top-N changed-file table with per-file
  Δ tokens and Δ USD, plus a collapsible "all files" section. New optional
  `top-n-files` input controls N (default 5).

- [#13](https://github.com/faraa2m/tokenometer/pull/13) [`cc745d5`](https://github.com/faraa2m/tokenometer/commit/cc745d5701bec2e9fd4f52afd008b87e63f06802) Thanks [@faraa2m](https://github.com/faraa2m)! - CLI gains:

  - Auto provider detection when `--model` is omitted (picks based on which `*_API_KEY` env is set).
  - `.tokenometer.yml` config loading (walk-up); `--no-config` and `--config <path>` overrides.
  - `--by-file` per-file token/cost attribution table.
  - `--output table|json|sarif` for machine-readable output.
  - `--image <path>` (repeatable) for vision-token cost estimation across Claude / GPT-4o / Gemini.

- [#13](https://github.com/faraa2m/tokenometer/pull/13) [`cc745d5`](https://github.com/faraa2m/tokenometer/commit/cc745d5701bec2e9fd4f52afd008b87e63f06802) Thanks [@faraa2m](https://github.com/faraa2m)! - Core lib additions for v1.0.0:

  - `loadConfig` / `parseConfig` for `.tokenometer.yml`.
  - `toSarif` SARIF 2.1.0 output.
  - Vision token estimators for Anthropic, OpenAI, and Google.

- [#14](https://github.com/faraa2m/tokenometer/pull/14) [`061e0c5`](https://github.com/faraa2m/tokenometer/commit/061e0c577fce3ecc09c6a201a408cd1a360d5587) Thanks [@faraa2m](https://github.com/faraa2m)! - Add `@tokenometer/claude-code-skill` — a Claude Code skill that teaches
  Claude Code agents to invoke `npx tokenometer` for prompt-cost analysis.
  Install via `~/.claude/skills/tokenometer/SKILL.md`. Submission to
  community skill registry tracked separately.

- [#14](https://github.com/faraa2m/tokenometer/pull/14) [`061e0c5`](https://github.com/faraa2m/tokenometer/commit/061e0c577fce3ecc09c6a201a408cd1a360d5587) Thanks [@faraa2m](https://github.com/faraa2m)! - Add `--latency` flag — measures real generation latency (TTFT + total ms +
  tokens/sec, p50/p95/mean over n trials) alongside token cost. Implies
  `--empirical`. Default trials = 3, configurable via `--latency-trials <n>`
  (1-10). Bumps default `--max-spend` to $0.25 to cover the n × 200-token
  generations. Supported providers: Anthropic, OpenAI, Google, Cohere,
  Mistral (latter two are metered).

- [#14](https://github.com/faraa2m/tokenometer/pull/14) [`061e0c5`](https://github.com/faraa2m/tokenometer/commit/061e0c577fce3ecc09c6a201a408cd1a360d5587) Thanks [@faraa2m](https://github.com/faraa2m)! - Add Mistral and Cohere providers.

  - Mistral: `mistral-tokenizer-js` for SentencePiece family (Mistral 7B,
    Mixtral, Mistral Large 2407, Codestral); `chars/4` heuristic for Tekken
    models (NeMo, Pixtral, Mistral Small 2409+, Devstral, Mistral Medium
    2505+, Magistral, Ministral). All marked `approximate: true`. Empirical
    mode unsupported (Mistral has no public token-count API).
  - Cohere: offline heuristic `chars/4` (Cohere SDK is REST-only; no offline
    tokenizer ships in JS). Empirical via `POST /v1/tokenize` when
    `COHERE_API_KEY` is set.

  Pricing for Mistral auto-sourced from `@tokenlens/models/mistral`. Cohere
  pricing comes from `LOCAL_OVERRIDES` (`command-r`, `command-r-plus`)
  because `@tokenlens/models` does not yet ship a Cohere catalog at v1.3.0.

- [#14](https://github.com/faraa2m/tokenometer/pull/14) [`061e0c5`](https://github.com/faraa2m/tokenometer/commit/061e0c577fce3ecc09c6a201a408cd1a360d5587) Thanks [@faraa2m](https://github.com/faraa2m)! - Playground (`https://tokenometer.vercel.app`) gains showcase pages for
  every Wave 2 feature: `/diff`, `/by-file`, `/sarif`, `/vision`,
  `/config-builder`, `/init`, `/models` (Cost Atlas + per-model SEO pages),
  plus placeholder pages for the VS Code extension and Claude Code skill.
  </content>
  </invoke>

- [#14](https://github.com/faraa2m/tokenometer/pull/14) [`061e0c5`](https://github.com/faraa2m/tokenometer/commit/061e0c577fce3ecc09c6a201a408cd1a360d5587) Thanks [@faraa2m](https://github.com/faraa2m)! - Add VS Code / Cursor extension (`@tokenometer/vscode`). Status bar shows
  live token count + USD cost for the active editor file across Claude,
  GPT-4o, and Gemini. Reuses `@tokenometer/core`. Marketplace publish
  follows in Phase I.

- [#15](https://github.com/faraa2m/tokenometer/pull/15) [`3681ae3`](https://github.com/faraa2m/tokenometer/commit/3681ae35d021a22a300271e2ea945cfeaeca9a0e) Thanks [@faraa2m](https://github.com/faraa2m)! - Documentation + SEO sweep: README, per-package READMEs, package.json
  descriptions and keywords updated to reflect every shipped feature
  (CLI flags, GitHub Action, VS Code extension, Claude Code skill,
  Mistral + Cohere providers, latency benchmarking, vision tokens, SARIF).
  Repo metadata + awesome-list templates regenerated. No source code
  changes.

- [#16](https://github.com/faraa2m/tokenometer/pull/16) [`dd9dab3`](https://github.com/faraa2m/tokenometer/commit/dd9dab3e06bbaf374b72d1903055b8a22472e5a1) Thanks [@faraa2m](https://github.com/faraa2m)! - Unified release pipeline (Phase I): one merge of the Version Packages PR
  publishes tokenometer + @tokenometer/core to npm with provenance, creates
  the GitHub Release (which republishes the Action to GitHub Marketplace),
  publishes the VS Code extension to VS Code Marketplace + Open VSX, runs
  a post-publish smoke test, verifies the Marketplace listing, and triggers
  the Vercel deploy hook. Local `npm run smoke` runs the full sweep (lint,
  typecheck, test, build, benchmarks, CLI smoke).
