# PR for awesome-ai-tools

**Target repo:** https://github.com/mahseema/awesome-ai-tools (verify — there are a few "awesome-ai-tools" repos; pick the one whose README structure matches).
**PR title:** "Add Tokenometer — LLM cost CLI + GitHub Action"
**PR body:**

I'd like to add Tokenometer to the **Developer Tools** (or **Cost / Observability**) section.

## What it is

**Tokenometer** — empirical LLM token-cost CLI + GitHub Action + VS Code / Cursor extension + Claude Code skill. Multi-provider (Claude, GPT-4o, Gemini, Mistral, Cohere), offline + empirical modes (real `countTokens` API calls), CI cost-guardrail with sticky PR comments and budget gates.

- Repo: https://github.com/faraa2m/tokenometer
- npm: `npx tokenometer ./prompt.md --model claude-opus-4-7`
- Marketplace: https://github.com/marketplace/actions/tokenometer
- Live demo: https://tokenometer.dev

## Why it fits this list

The directory already includes generation, agent, and eval tooling but very little on the cost side. Tokenometer fills that gap with a single-command, multi-provider USD estimate that works locally and in CI, so teams can keep model spend in view without rolling their own dashboard.

## Markdown line for the list

```
- [Tokenometer](https://github.com/faraa2m/tokenometer) — LLM token cost + latency CLI + GitHub Action + VS Code extension + Claude Code skill. 63 models across Claude, GPT-4o, Gemini, Mistral, Cohere. Empirical mode, CI-native cost guardrail.
```
