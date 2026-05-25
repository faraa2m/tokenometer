# PR for awesome-llm-apps

**Target repo:** https://github.com/Shubhamsaboo/awesome-llm-apps (verify before opening — there are several lists with this name; pick the one whose `README.md` matches the section you intend to land in).
**PR title:** "Add Tokenometer — LLM cost CLI + GitHub Action"
**PR body:**

I'd like to add Tokenometer to the **Tools / Developer Tools** section (or whichever section the maintainers prefer for cost-tracking utilities).

## What it is

**Tokenometer** — empirical LLM token-cost CLI + GitHub Action + VS Code / Cursor extension + Claude Code skill. Multi-provider (Claude, GPT-4o, Gemini, Mistral, Cohere), offline + empirical modes (real `countTokens` API calls), CI cost-guardrail with sticky PR comments and budget gates.

- Repo: https://github.com/faraa2m/tokenometer
- npm: `npx tokenometer ./prompt.md --model claude-opus-4-7`
- Marketplace: https://github.com/marketplace/actions/tokenometer
- Live demo: https://tokenometer.dev

## Why it fits this list

Awesome-llm-apps already curates apps and tooling that help builders ship with LLMs. Tokenometer is the missing "what does this prompt actually cost" piece — it lets app developers measure, diff, and budget token spend across providers from a single CLI as they iterate.

## Markdown line for the list

```
- [Tokenometer](https://github.com/faraa2m/tokenometer) — LLM token cost + latency CLI + GitHub Action + VS Code extension + Claude Code skill. 63 models across Claude, GPT-4o, Gemini, Mistral, Cohere. Empirical mode, CI-native cost guardrail.
```
