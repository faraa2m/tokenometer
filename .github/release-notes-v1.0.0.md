# Tokenometer v1.0.0 — Production-ready LLM cost calculator and CI guardrail.

> Note: this is a **DRAFT**. Some items below are marked `[planned]` because the
> phase has not yet landed on `main`. Edit before publishing the GitHub Release.

## Highlights

- **CLI + GitHub Action shipped** — `npx tokenometer` and the marketplace action
  share a single core, so local results match CI results.
- **Multi-provider** — Claude (Opus / Sonnet / Haiku), OpenAI GPT-4o family, and
  Google Gemini all run through the same interface.
- **Empirical mode** — real `countTokens` API calls (free for Anthropic and
  Google) instead of ad-hoc heuristics; falls back to `approximate` only when
  the user opts out or no key is configured.
- **CI cost-guardrail** — sticky PR comment with a per-model diff, plus a
  `budget` input that fails the run when the head delta exceeds your USD cap.
- **Auto-updating prices** — pricing and context limits are sourced from the
  `tokenlens` registry, not a hand-maintained table.
- **Honest `approximate` flag** — every output row is tagged so you always know
  whether a number came from a real tokenizer or an estimate.
- **Vision-token cost** `[planned — Phase D]` — image-aware token accounting
  for multi-modal prompts.
- **Per-file attribution** `[planned — Phase C.4]` — costs broken down by source
  file in PR comments.
- **SARIF output** `[planned — Phase C.5]` — lets cost regressions surface in
  GitHub code scanning.
- **Auto provider detection** `[planned — Phase C.1]` — infer the provider from
  the model id without an extra flag.
- **`.tokenometer.yml` config** `[planned — Phase C.2]` — repo-level defaults
  for paths, models, and budgets.
- **VS Code / Cursor extension** `[planned — Phase E.1]` — inline cost lens for
  prompt files in the editor.
- **Claude Code skill** `[planned — Phase E.2]` — first-class skill so Claude
  Code can call Tokenometer when iterating on prompts.
- **Mistral + Cohere providers** `[planned — Phase H]` — additional model
  families behind the same CLI surface.
- **Latency mode** `[planned]` — `--latency` flag to surface per-model latency
  alongside cost.
- **Unified release pipeline** — one workflow publishes both `tokenometer` and
  `@tokenometer/core` so the CLI and library never drift.

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
```

## What's next

See the project roadmap milestones on GitHub for the planned post-1.0 phases:
<https://github.com/faraa2m/tokenometer/milestones>.

## Acknowledgments

Pricing and context-window data are sourced from the
[`tokenlens`](https://github.com/m31coding/tokenlens) registry — thanks to the
upstream maintainers for keeping that table accurate.
