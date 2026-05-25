# PR for awesome-prompt-engineering

**Target repo:** https://github.com/promptslab/Awesome-Prompt-Engineering
**PR title:** "Add Tokenometer — LLM cost CLI + GitHub Action"
**PR body:**

I'd like to add Tokenometer to the **Tools & Code** section.

## What it is

**Tokenometer** — empirical LLM token-cost CLI + GitHub Action + VS Code / Cursor extension + Claude Code skill. Multi-provider (Claude, GPT-4o, Gemini, Mistral, Cohere), offline + empirical modes (real `countTokens` API calls), CI cost-guardrail with sticky PR comments and budget gates.

- Repo: https://github.com/faraa2m/tokenometer
- npm: `npx tokenometer ./prompt.md --model claude-opus-4-7`
- Marketplace: https://github.com/marketplace/actions/tokenometer
- Live demo: https://tokenometer.dev

## Why it fits this list

Prompt engineers iterate on wording, structure, and few-shot examples — all of which move token count and cost. Tokenometer makes that feedback loop quantitative: you get a real `countTokens` measurement and a per-model USD figure for each prompt revision, so cost-aware prompt iteration stops being guesswork.

## Markdown line for the list

```
- [Tokenometer](https://github.com/faraa2m/tokenometer) — LLM token cost + latency CLI + GitHub Action + VS Code extension + Claude Code skill. 63 models across Claude, GPT-4o, Gemini, Mistral, Cohere. Empirical mode, CI-native cost guardrail.
```
