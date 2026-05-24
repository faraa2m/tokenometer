# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/). This project adheres to [Semantic Versioning](https://semver.org/).

Going forward, entries are managed by [Changesets](https://github.com/changesets/changesets) and emitted as part of the unified release workflow.

## [Unreleased]

### Added
- Project legitimacy docs: `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md` (using GitHub Private Vulnerability Reporting), `CHANGELOG.md`.
- GitHub repo templates: `.github/copilot-instructions.md` (consumed by `gh copilot review`), `PULL_REQUEST_TEMPLATE.md`, issue forms (`bug_report.yml`, `feature_request.yml`, `config.yml`), `FUNDING.yml`.
- README rewrite: badges row, "Why Tokenometer vs alternatives" comparison table, ASCII demo of CLI table output, project-health checklist links.
- npm SEO: extended `keywords` across `tokenometer` (CLI), `@tokenometer/core`, and `@tokenometer/action`. Updated `description` on root + every package.
- Marketplace publish prep: draft v1.0.0 release notes, awesome-list PR templates (`awesome-llm-apps`, `awesome-actions`, `awesome-prompt-engineering`, `awesome-ai-tools`, `awesome-llmops`).

## [0.0.2] — 2026-05-08

### Fixed
- `fix(release): build before bumping versions to avoid stale nested install` (#9)
- `fix(cli): run main() when invoked via npx symlink` (#7)

### Changed
- `refactor(core): source pricing + context limits from tokenlens registry` (#8) — pricing is now sourced from the [`tokenlens`](https://www.npmjs.com/package/tokenlens) registry plus a small set of `LOCAL_OVERRIDES` for bleeding-edge models the registry hasn't picked up yet (see `packages/core/src/rates.ts`).

### Added
- `ci(release): manual-trigger workflow that publishes both packages` (#6)
- `docs(readme): align usage with shipped CLI + Action` (#10)

## [0.0.1] — initial publish

### Added
- `tokenometer` CLI: multi-provider (Anthropic, OpenAI, Google), multi-format (JSON, YAML, XML, Markdown, text), offline + empirical modes (`--empirical`, `--max-spend`).
- `@tokenometer/core` library: tokenizer dispatch, USD cost calculation, honest `approximate` flag when the offline path is a proxy (Claude `cl100k_base`, Google `chars/4`).
- GitHub Action (`packages/action`): sticky PR comment with prompt-cost diff vs base branch, optional `budget` input that fails the check when exceeded.
- Web playground at https://tokenometer.dev — paste-and-compare UI, observatory aesthetic.
- Empirical benchmark sweep: `npm run benchmarks:empirical` produces the n=150 dataset that powers the README findings (Opus is +62% denser than `cl100k_base`).
- Vercel monorepo deploy config.
