# Copilot Review Instructions — Tokenometer

This is a TypeScript-strict monorepo using npm workspaces. Honor strict-mode discipline: no implicit `any`, no unchecked indexed access, no silent type widening.

## Layout

Packages:
- `@tokenometer/core` lives in `packages/core` — pure measurement, pricing, and tokenizer logic. No I/O.
- `tokenometer` CLI lives in `packages/cli` — thin wrapper that parses argv, calls core, formats output.
- The GitHub Action lives in `packages/action` — bundled to `dist/index.cjs` via ncc.
- The web playground lives in `apps/` (or `packages/web` depending on milestone).

Cross-package imports go through public entrypoints only. Don't reach into `src/internal/*` from another package.

## Toolchain

- Lint with Biome: `npm run lint`. Don't introduce ESLint/Prettier — Biome owns formatting and linting.
- Type-check with `npm run typecheck`. Errors block merge.
- Test with `npm test` (Vitest). Co-locate tests as `*.test.ts` next to source.
- Node ≥20 only. Don't add polyfills for older runtimes.

## Comments and naming

DO NOT add comments unless the WHY is non-obvious. No JSDoc on internal functions. Self-documenting names preferred. If a reviewer would ask "why," leave a comment; if they'd just nod, delete it.

Flag PRs that add narration-style comments (`// loop over items`, `// returns the total`). Those should come out.

## Approximate-token honesty (load-bearing)

When the offline tokenizer is a proxy (Anthropic falls back to `cl100k_base`, Google uses `chars/4`), the result MUST set `approximate: true` on the API surface. This honesty is load-bearing — never silently fall back without the flag. Reviewers should reject any code path that produces a number without propagating the approximate bit.

If a PR adds a new provider tokenizer, verify:
1. The `approximate` flag flows through to `MeasureResult`.
2. The CLI/Action surfaces it (e.g. `~` prefix or explicit "approximate" label).
3. There's a test covering the proxy path.

## Pricing

Pricing source priority:
1. `LOCAL_OVERRIDES` in `packages/core/src/rates.ts` — bleeding-edge rates not yet upstreamed.
2. `tokenlens` registry — the source of truth for stable models.

Don't hardcode dollar amounts anywhere else in the codebase. If a PR introduces a literal price outside `rates.ts`, request a move.

## Commit and PR style

Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `ci:`, `test:`. PR titles match the commit style. Include scope where helpful, e.g. `feat(cli): add --json flag` or `fix(core): correct Gemini chars-per-token ratio`.

Reject PR titles like "Update files" or "Misc fixes" — request a Conventional Commit rewrite.

## Action bundle

Action's `dist/index.cjs` must stay in sync with source — CI verifies this. Run `npm run build` in `packages/action/` before committing changes there. If a PR touches `packages/action/src/**` without updating `dist/`, flag it.

## Empirical mode (do not enable)

Empirical mode in the GitHub Action is intentionally OFF. No API keys live in repo secrets. Don't suggest enabling empirical paths in the workflow, the README, or examples. Offline measurement is the contract for the Action surface.

## Review tone

Terse, specific, point-at-line-numbers. No congratulatory language. No "great work!" or "looks good overall." If there's nothing to flag, say nothing. Otherwise, link the line, name the issue, propose the fix.
