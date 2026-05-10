# Tokenometer v1.0.0 — Production-ready LLM cost calculator, latency benchmark, and CI guardrail.

> Note: this is a **DRAFT**. Edit before publishing the GitHub Release.
> All items below have landed on `main` (Waves 2 + 3 + 4 Phase I). The
> release pipeline itself is now unified — one merge of the Version
> Packages PR ships every artifact below in a single workflow run.

## Highlights

- **CLI + GitHub Action + VS Code extension + Claude Code skill — one core.**
  `npx tokenometer`, the marketplace Action, the editor status bar, and the
  Claude Code skill all share `@tokenometer/core`, so local results match CI
  results match what's on screen in the editor match what an agent reports.
- **Multi-provider** — Claude (Opus / Sonnet / Haiku, Claude 3.x), OpenAI
  GPT-4o family + o1, Google Gemini 2.5 / 1.5, Mistral (19 models — open
  weights, large, codestral, NeMo, Pixtral, Magistral, Ministral, Devstral,
  Mistral Medium 2505), and Cohere (command-r, command-r-plus). 63 models
  total.
- **Empirical mode** — real `countTokens` API calls (free for Anthropic,
  Google, and Cohere; tiktoken-anchored for OpenAI) instead of ad-hoc
  heuristics; falls back to `approximate` only when the user opts out or
  no key is configured. Mistral has no public token-count endpoint —
  offline `mistral-tokenizer-js` is exact for SentencePiece-family models
  and `chars/4` for Tekken-family models.
- **Latency benchmarking (`--latency`)** — TTFT, total ms, and tokens/sec
  reported as p50 / p95 / mean over `n` real generations (default `n=3`,
  configurable with `--latency-trials 1..10`). Supported on Anthropic,
  OpenAI, Google, Cohere, and Mistral. The default `--max-spend` is
  bumped from `$0.05` to `$0.25` when `--latency` is set.
- **CI cost-guardrail** — sticky PR comment with a per-model summary and a
  per-file Δ table (configurable via `top-n-files`, with the rest folded
  into a `<details>` block). The `budget` input fails the run when the
  head delta exceeds your USD cap.
- **Per-file attribution** (`--by-file` in the CLI; per-file Δ in the
  Action comment) so you know which prompt files dominate cost.
- **SARIF output** (`--output sarif`) — drop the file into GitHub Code
  Scanning or any SARIF viewer to surface cost regressions next to lint
  findings.
- **Vision-token cost** (`--image <path>`) — image-aware accounting for
  Claude (`(w*h)/750`, capped at 1600), GPT-4o (high-detail tile cost),
  and Gemini (`258 × ⌈w/768⌉ × ⌈h/768⌉`).
- **Auto provider detection** — infer the default model from whichever
  `*_API_KEY` env var is set. No flag needed for the common case.
- **`.tokenometer.yml` config** — repo-level defaults for paths, models,
  formats, and budgets. Walks up from cwd, stopping at `.git`. CLI
  flags always win.
- **VS Code / Cursor extension** — status bar shows live `model · tokens
  · USD` for the active prompt file. Settings: `tokenometer.model`,
  `tokenometer.format`, `tokenometer.warnOnCostAbove`. Commands:
  *Tokenometer: Switch model*, *Tokenometer: Show details*. Published
  to the VS Code Marketplace and Open VSX (Cursor / VSCodium read from
  Open VSX) by the unified release workflow.
- **Claude Code skill** (`tokenometer-cost-check`) — drop into
  `~/.claude/skills/tokenometer/SKILL.md` and Claude Code agents will
  reach for `npx tokenometer` when asked anything cost- or latency-shaped.
- **Auto-updating prices** — pricing and context limits are sourced from
  the `tokenlens` registry, not a hand-maintained table. A small
  `LOCAL_OVERRIDES` map covers bleeding-edge models (and the entire
  Cohere catalog, which `@tokenlens/models` doesn't ship at v1.3.0).
- **Honest `approximate` flag** — every output row is tagged so you
  always know whether a number came from a real tokenizer or an estimate.
- **Unified release pipeline** — one merge of the Version Packages PR
  publishes `tokenometer` + `@tokenometer/core` to npm with provenance,
  creates the GitHub Release (which republishes the Action to GitHub
  Marketplace), publishes the VS Code extension to the VS Code Marketplace
  + Open VSX, fires the Vercel deploy hook for the playground, and runs
  a post-publish smoke test against the just-published npm versions —
  all from one workflow run, so CLI / library / Action / extension /
  playground never drift apart.

## v1.0.0 launch surface

| Surface | Where | Notes |
|---|---|---|
| CLI | `npx tokenometer` / `npm i -g tokenometer` | All flags above |
| GitHub Action | `faraa2m/tokenometer@v1` (Marketplace) | Sticky PR comment with per-file Δ + budget gate |
| VS Code extension | Marketplace + Open VSX (Cursor / VSCodium) | Status bar live cost |
| Claude Code skill | `~/.claude/skills/tokenometer/SKILL.md` | Agentic prompt-cost awareness |
| Web playground | https://tokenometer.vercel.app | Calculator, diff, by-file, SARIF, vision, config builder, init wizard, Cost Atlas |
| Library | `@tokenometer/core` on npm | Engine for everything above |

**Providers (5):** Anthropic, OpenAI, Google, Mistral, Cohere
**Models (63):** Claude 4.x + 3.x, GPT-4o family + o1, Gemini 2.5 + 1.5, Mistral 19-model catalog, Cohere command-r family
**Output formats:** table, JSON, SARIF
**Latency providers:** Anthropic, OpenAI, Google, Cohere, Mistral

## Empirical findings

The `n=150` cross-shape comparison that motivated this project is in the
[Findings section of the README](https://github.com/faraa2m/tokenometer#findings-anthropic-n150-cells-across-10-prompt-shapes).

## Install

CLI:

```
npx tokenometer ./prompt.md --model claude-opus-4-7
```

GitHub Action:

```yaml
- uses: faraa2m/tokenometer@v1
  with:
    paths: |
      prompts/**/*.md
    models: claude-opus-4-7,claude-sonnet-4-6,gpt-4o
    budget: '0.50'
    top-n-files: 5
```

VS Code / Cursor:

```
ext install faraa2m.tokenometer-vscode
```

Claude Code skill:

```
cp -R packages/claude-code-skill ~/.claude/skills/tokenometer
```

## What's next

See the project roadmap milestones on GitHub for the planned post-1.0 phases:
<https://github.com/faraa2m/tokenometer/milestones>.

## Acknowledgments

Pricing and context-window data are sourced from the
[`tokenlens`](https://github.com/m31coding/tokenlens) registry — thanks to the
upstream maintainers for keeping that table accurate.
