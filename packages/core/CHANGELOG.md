# @tokenometer/core

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
