# PR for awesome-actions

**Target repo:** https://github.com/sdras/awesome-actions
**PR title:** "Add Tokenometer — LLM cost CLI + GitHub Action"
**PR body:**

I'd like to add Tokenometer to the **Utility / Pull Requests** (or **Code Quality**) section.

## What it is

**Tokenometer** — empirical LLM token-cost CLI + GitHub Action + VS Code / Cursor extension + Claude Code skill. Multi-provider (Claude, GPT-4o, Gemini, Mistral, Cohere), offline + empirical modes (real `countTokens` API calls), CI cost-guardrail with sticky PR comments and budget gates.

- Repo: https://github.com/faraa2m/tokenometer
- npm: `npx tokenometer ./prompt.md --model claude-opus-4-7`
- Marketplace: https://github.com/marketplace/actions/tokenometer
- Live demo: https://tokenometer.dev

## Why it fits this list

It is a first-class GitHub Action that posts a sticky PR comment diffing prompt-token cost across models on every push, and can fail the build when a USD budget is exceeded — the same shape as test-coverage or bundle-size guardrails, applied to LLM cost.

## Markdown line for the list

```
- [Tokenometer](https://github.com/faraa2m/tokenometer) — LLM token cost + latency CLI + GitHub Action + VS Code extension + Claude Code skill. 63 models across Claude, GPT-4o, Gemini, Mistral, Cohere. Empirical mode, CI-native cost guardrail.
```
