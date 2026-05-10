---
"tokenometer": minor
"@tokenometer/core": minor
---

Project legitimacy and SEO rollout (Wave 1 of v1.0.0):

- Added `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `CONTRIBUTING.md`, `SECURITY.md` (GitHub Private Vulnerability Reporting only — no email exposure), `CHANGELOG.md`.
- Added `.github/copilot-instructions.md` for `gh copilot review`, plus `PULL_REQUEST_TEMPLATE.md`, issue forms (`bug_report.yml`, `feature_request.yml`, `config.yml`), and `FUNDING.yml`.
- Rewrote root `README.md` with badges row, "Why Tokenometer vs alternatives" comparison table (vs `tokencost`, `tiktoken`, `gpt-tokenizer`, `promptfoo`, `gpt-token-counter-live`), ASCII demo of CLI table output, and project-health checklist.
- Extended npm `keywords` and `description` across `tokenometer` (CLI), `@tokenometer/core`, and `@tokenometer/action` for SEO. Root description now reads: "Tokenometer — LLM cost calculator, token counter, and CI cost-guardrail Action for Claude, GPT-4o, Gemini."
- Added Marketplace publish prep (`.github/release-notes-v1.0.0.md`) and awesome-list PR templates (`.github/awesome-list-prs/`).
- Initialized Changesets for auto-bump + auto-CHANGELOG-generation on release. Replaced the manual `release.yml` workflow with the Changesets-driven version-PR + publish flow.
