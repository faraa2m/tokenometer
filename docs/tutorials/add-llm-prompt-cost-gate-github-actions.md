# Add an LLM Prompt Cost Gate to GitHub Actions in 10 Minutes

Prompt changes deserve the same review discipline as code changes. A longer
system prompt, a few extra examples, or a copied product description template
can silently increase the cost of every LLM call that uses it.

This tutorial shows how to add a Tokenometer GitHub Actions gate that measures
prompt-cost changes on pull requests, posts a sticky PR comment, and fails the
check when the cost delta crosses a USD budget.

Canonical demo repo:
[faraa2m/commerce-api-starter](https://github.com/faraa2m/commerce-api-starter)

Canonical Tokenometer Action:
[`faraa2m/tokenometer/packages/action@v1`](https://github.com/faraa2m/tokenometer/tree/main/packages/action#readme)

## What You Will Build

You will add:

- A `prompts/` directory containing LLM prompt files.
- A `.github/workflows/prompt-cost.yml` workflow.
- A pull-request budget gate using Tokenometer.
- A local command to reproduce the same measurement before pushing.

The example uses a commerce API prompt because it is easy to reason about:
product-copy prompts are often edited by engineers and product teams, and small
wording changes can affect every generated product description.

## Prerequisites

- A GitHub repository with GitHub Actions enabled.
- Prompt files committed under a predictable path such as `prompts/**/*.md`.
- Node.js only if you want to run the local `npx tokenometer` check.

The GitHub Action does not need provider API keys. It uses Tokenometer's offline
tokenizer path, which is designed for deterministic CI checks.

## Step 1: Add a Prompt File

Create `prompts/product-description.md`:

```markdown
# Product Description Prompt

Write a concise ecommerce product description using the product name, category,
price, and rating. Keep the output under 90 words and avoid unsupported claims.
```

In the demo repo, the file already exists at
[`prompts/product-description.md`](https://github.com/faraa2m/commerce-api-starter/blob/main/prompts/product-description.md).

## Step 2: Add the Workflow

Create `.github/workflows/prompt-cost.yml`:

```yaml
name: prompt-cost

on:
  pull_request:
    paths:
      - "prompts/**"
      - ".github/workflows/prompt-cost.yml"

permissions:
  contents: read
  pull-requests: write

jobs:
  tokenometer:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: faraa2m/tokenometer/packages/action@v1
        with:
          paths: prompts/**/*.md
          models: claude-sonnet-4-6,gpt-4o
          formats: markdown,json
          budget: "0.10"
          top-n-files: 5
```

The demo repo uses the same Action shape inside its CI workflow:
[`commerce-api-starter/.github/workflows/ci.yml`](https://github.com/faraa2m/commerce-api-starter/blob/main/.github/workflows/ci.yml).

## Step 3: Understand the Budget

`budget: "0.10"` means the Action fails when the total prompt-cost increase is
greater than 10 cents across the configured models and formats.

Use a tighter budget when:

- Prompts run on every request.
- The app has high request volume.
- A single prompt is copied into multiple agents or workflows.

Use a looser budget when:

- Prompts are used for batch jobs or admin-only workflows.
- You expect a one-time prompt expansion and want review visibility without
  blocking every edit.

If you only want the PR comment and never want the check to fail, remove the
`budget` input.

## Step 4: Open a Pull Request That Changes a Prompt

Edit `prompts/product-description.md`, then open a PR. Tokenometer compares the
pull request branch against the base branch and posts a sticky PR comment with:

- Total prompt-cost delta.
- Per-model cost delta.
- Top changed prompt files.
- A pass/fail result based on the configured budget.

That turns prompt expansion into a reviewable change instead of a surprise in a
provider invoice.

## Step 5: Reproduce the Measurement Locally

Before pushing, run:

```bash
npx tokenometer prompts/product-description.md \
  --model claude-sonnet-4-6,gpt-4o \
  --format markdown,json
```

For multi-file prompt directories, run:

```bash
npx tokenometer prompts/*.md \
  --model claude-sonnet-4-6,gpt-4o \
  --format markdown,json \
  --by-file
```

The local CLI and GitHub Action share the same Tokenometer core, so the counts,
model prices, and approximate/exact flags stay aligned across developer
machines and CI.

## Production Notes

Keep empirical provider calls out of PR CI. The Action intentionally does not
use real provider `countTokens` APIs because that would require secrets on every
pull request. If you need exact provider counts for Claude, Gemini, or Cohere,
run empirical mode locally:

```bash
ANTHROPIC_API_KEY=... npx tokenometer prompts/product-description.md --empirical
```

Use GitHub branch protection to require the `prompt-cost` check once the budget
is tuned. That makes prompt-cost regressions visible before merge.

## Copy-Paste Checklist

- [ ] Add prompt files under `prompts/`.
- [ ] Add `.github/workflows/prompt-cost.yml`.
- [ ] Set `paths` to the prompt files your app actually uses.
- [ ] Pick the models your app sends prompts to.
- [ ] Pick the formats your team wants to compare.
- [ ] Start with a small `budget`, then tune after a few real PRs.
- [ ] Require the check in branch protection after the signal is stable.

## Related Links

- [Tokenometer README](https://github.com/faraa2m/tokenometer#readme)
- [Tokenometer GitHub Action README](https://github.com/faraa2m/tokenometer/tree/main/packages/action#readme)
- [Tokenometer adoption playbooks](https://github.com/faraa2m/tokenometer/blob/main/docs/ADOPTION.md)
- [Commerce API Starter demo](https://github.com/faraa2m/commerce-api-starter)
- [Live Tokenometer playground](https://tokenometer.dev)
