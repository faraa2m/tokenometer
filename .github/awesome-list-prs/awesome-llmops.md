# PR for awesome-llmops

**Target repo:** https://github.com/tensorchord/Awesome-LLMOps
**PR title:** "Add Tokenometer — LLM cost CLI + GitHub Action"
**PR body:**

I'd like to add Tokenometer to the **Observability / Cost** (or **Developer Tools**) section.

## What it is

**Tokenometer** — empirical LLM token-cost CLI + GitHub Action + VS Code / Cursor extension + Claude Code skill. Multi-provider (Claude, GPT-4o, Gemini, Mistral, Cohere), offline + empirical modes (real `countTokens` API calls), CI cost-guardrail with sticky PR comments and budget gates.

- Repo: https://github.com/faraa2m/tokenometer
- npm: `npx tokenometer ./prompt.md --model claude-opus-4-7`
- Marketplace: https://github.com/marketplace/actions/tokenometer
- Live demo: https://tokenometer.vercel.app

## Why it fits this list

Cost is a first-class LLMOps concern but most platforms treat it as a post-hoc dashboard. Tokenometer pulls it left into the developer workflow — a CLI for local prompt iteration plus a GitHub Action that gates PRs on a USD budget — so prompt-cost regressions get caught in code review the same way performance regressions do.

## Markdown line for the list

```
- [Tokenometer](https://github.com/faraa2m/tokenometer) — LLM token cost + latency CLI + GitHub Action + VS Code extension + Claude Code skill. 63 models across Claude, GPT-4o, Gemini, Mistral, Cohere. Empirical mode, CI-native cost guardrail.
```
