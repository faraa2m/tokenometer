# Contributing to Tokenometer

Thanks for your interest. Tokenometer is a small, opinionated project — clear measurements, honest defaults, no magic. Contributions that move in that direction are welcome.

## Quick start

```bash
git clone https://github.com/faraa2m/tokenometer.git
cd tokenometer
npm install
npm test
```

Node ≥20 required.

## Development workflow

| Task | Command |
|---|---|
| Lint | `npm run lint` |
| Format | `npm run format` |
| Type-check | `npm run typecheck` |
| Test | `npm test` |
| Test (watch) | `npm run test:watch` |
| Build all packages | `npm run build` |
| Run benchmarks (offline) | `npm run benchmarks` |
| Run benchmarks (empirical, needs `ANTHROPIC_API_KEY`) | `npm run benchmarks:empirical` |
| Full local pre-release smoke | `npm run smoke` |

Before opening a PR: `npm run lint && npm run typecheck && npm test && npm run build`. CI runs the same steps. For a release-readiness check, `npm run smoke` runs the full sweep (lint, typecheck, test, build, web build, benchmarks, plus CLI smoke checks against the built `dist/` — SARIF, `--by-file`, auto-detect, Action bundle present, VS Code extension dist present).

## Code style

- TypeScript strict.
- Biome handles lint + format. Don't fight it.
- Self-documenting names preferred. **No comments unless the WHY is non-obvious** (a hidden constraint, a workaround, a subtle invariant). Comments that restate the code are noise.
- See `.github/copilot-instructions.md` for the full conventions Copilot CLI uses to review PRs — same rules apply to humans.

## Honesty contract

When the offline tokenizer is a proxy (Anthropic `cl100k_base`, Google `chars/4`), the API result must set `approximate: true`. This flag is load-bearing. Don't silently fall back without it. If you add a new provider with an inexact tokenizer, set the flag.

## Commit messages

Conventional Commits. Examples from `git log`:

- `refactor(core): source pricing + context limits from tokenlens registry`
- `fix(cli): run main() when invoked via npx symlink`
- `feat(action): GitHub Action — sticky PR comment with prompt-cost diff`

Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `ci`, `test`, `style`, `perf`, `build`. Scope is the package or area (`cli`, `core`, `action`, `web`, `release`, `readme`, etc.).

PR titles match the same format.

## Adding a new model

1. If `tokenlens` already lists the model, it's auto-picked up — usually nothing to do.
2. If the model is too new for `tokenlens`, add an entry to `LOCAL_OVERRIDES` in `packages/core/src/rates.ts` with `pricingSource: 'local'`. The override is removed once `scripts/check-overrides.mjs` reports the registry caught up.
3. Add a Vitest case in `packages/core/test/` covering the new id.
4. Update README's known-models table if user-facing.

## Adding a new provider

1. Add tokenizer dispatch in `packages/core/src/tokenize.ts`.
2. Add a provider catalog entry in `packages/core/src/rates.ts` (`CATALOG`). If `@tokenlens/models/<provider>` exists, prefer it over hand-rolled pricing.
3. Decide: exact or approximate offline path. Set `approximate: true` if the path is a proxy. **Document the choice in the README methodology table.**
4. Add Vitest fixtures across all formats (json, yaml, xml, markdown, text).
5. If the provider exposes an empirical `countTokens` endpoint, wire it up.

## Filing bugs

Use the bug report template. Include:
- `tokenometer --version`
- Node version
- OS
- Exact flags used
- Repro steps
- Expected vs actual

## Reporting security issues

See [`SECURITY.md`](SECURITY.md). Use GitHub Private Vulnerability Reporting; do not file public issues for vulnerabilities.

## Changesets

Releases are driven by [Changesets](https://github.com/changesets/changesets). For any PR that should produce a release entry:

```bash
npx changeset
```

Pick the affected packages, the bump type (`patch` / `minor` / `major`), and write a one-line summary. A `.changeset/<random>.md` file is written; commit it. See [`.changeset/README.md`](.changeset/README.md) for the full rules (notably: `tokenometer` and `@tokenometer/core` are version-fixed — bumping one bumps both).

## Releasing

The release pipeline is **fully unified** — one merge of the Version Packages PR ships everything. Pushes to `main` trigger `.github/workflows/release.yml`:

1. If `.changeset/` has any pending changesets, the workflow opens (or updates) a **Version Packages** PR that auto-bumps `package.json` versions and auto-generates `CHANGELOG.md` entries.
2. Merging that PR triggers the same workflow to:
   - Publish `tokenometer`, `@tokenometer/core`, and `@tokenometer/mcp` to npm with provenance through npm Trusted Publishing / GitHub OIDC.
   - Create a GitHub Release on the new tag (GitHub Marketplace listens to that and republishes the Action's listing).
   - Build a fresh `.vsix` and publish the VS Code extension to the **VS Code Marketplace** (`vsce`) and **Open VSX** (`ovsx`, the registry Cursor + VSCodium read from).
   - HTTP-verify the GitHub Marketplace listing (best-effort — propagation can take a few minutes).
   - Trigger the **Vercel deploy hook** so the playground rebuilds against the new published packages.
3. A separate `smoke-test` job then runs on a fresh runner against the **just-published** npm versions (`npx tokenometer@<new-version>`) so a broken publish surfaces in CI rather than user reports.

Before merging the Version Packages PR, you can sanity-check the build locally with `npm run smoke` — same gates the workflow runs, plus CLI smoke against the local `dist/`.

Required secrets in repo settings → Secrets and variables → Actions:

- `VSCE_PAT` — Personal Access Token from https://dev.azure.com (Marketplace publisher → Manage Tokens, scope: Marketplace → Acquire + Manage). If absent, the VS Code Marketplace step is skipped with a clear notice.
- `OVSX_PAT` — Personal Access Token from https://open-vsx.org (User Settings → Access Tokens). If absent, the Open VSX step is skipped.
- `VERCEL_DEPLOY_HOOK` — Deploy hook URL from Vercel project settings (optional; the playground also rebuilds automatically on every push to main).

npm package publishing does not use a repository secret. Configure npm Trusted Publisher bindings for `tokenometer`, `@tokenometer/core`, and `@tokenometer/mcp` to point at `faraa2m/tokenometer` and `.github/workflows/release.yml`.

## Questions

Use [Discussions](https://github.com/faraa2m/tokenometer/discussions). Issues are for bugs and concrete proposals.
