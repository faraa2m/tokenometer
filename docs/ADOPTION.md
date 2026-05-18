# Tokenometer Adoption Playbooks

Tokenometer is useful when token cost needs to be visible before prompts reach
production. Pick the surface that matches the workflow: CLI for local checks,
GitHub Action for PR guardrails, VS Code/Cursor for editor feedback, MCP for
agent clients, and the library packages for app code.

## GitHub Actions: Block Prompt-Cost Regressions

```yaml
name: prompt-cost

on:
  pull_request:
    paths:
      - "prompts/**"
      - "src/**/*.prompt.*"

jobs:
  tokenometer:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: faraa2m/tokenometer/packages/action@v1
        with:
          paths: prompts/**/*.md,src/**/*.prompt.ts
          models: claude-sonnet-4-6,gpt-4o,gemini-2.5-pro
          formats: markdown,json,yaml
          budget: "0.25"
          top-n-files: 10
```

Use this when prompt changes are reviewed like source code. The action posts a
sticky PR comment with per-file deltas and fails the check when the total
increase crosses the configured budget.

## VS Code and Cursor

```text
ext install faraa2m.tokenometer-vscode
```

Recommended team defaults:

```json
{
  "tokenometer.model": "claude-sonnet-4-6",
  "tokenometer.format": "markdown",
  "tokenometer.warnOnCostAbove": 0.05
}
```

This gives prompt authors live token and USD feedback before CI runs.

## MCP Clients

```json
{
  "mcpServers": {
    "tokenometer": {
      "command": "npx",
      "args": ["@tokenometer/mcp"]
    }
  }
}
```

Use the MCP server when Claude Code, Cursor, or another agent client needs a
real cost estimate instead of guessing from a rough token heuristic.

## LangChain

```ts
import { tokenize } from "@tokenometer/core";

export async function pricePrompt(prompt: string) {
  return tokenize({
    prompt,
    modelId: "gpt-4o",
    format: "text",
  });
}
```

Call this before a chain step that expands context, retrieves documents, or
generates long summaries. Store the result next to trace metadata so cost can be
reviewed with latency and quality.

## Vercel AI SDK

```ts
import { tokenize } from "@tokenometer/core";

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const cost = tokenize({
    prompt,
    modelId: "gpt-4o",
    format: "text",
  });

  if (cost.inputCost > 0.1) {
    return Response.json({ error: "Prompt exceeds cost budget" }, { status: 400 });
  }

  // Continue with streamText/generateText after the budget gate.
}
```

Use this pattern for user-generated prompts where a single request can become a
large bill.

## OpenAI and Anthropic SDK Guardrails

```ts
import { tokenize } from "@tokenometer/core";

const prompt = "Summarize the attached support ticket history.";
const cost = await tokenize({ prompt, modelId: "claude-sonnet-4-6", format: "text" });

if (cost.inputCost > 0.05) {
  throw new Error(`Prompt budget exceeded: $${cost.inputCost.toFixed(4)}`);
}
```

Put the check immediately before the provider call. For production systems,
record the estimate, selected model, prompt hash, and request id in logs.

## Case Study: PR Cost Regression

A team keeps support-agent prompts in `prompts/support/*.md`. A pull request
adds several examples to improve tone, but the prompt cost doubles for every
support ticket. Tokenometer catches the delta in CI before merge:

1. The GitHub Action compares the PR branch against the base branch.
2. The sticky comment shows which prompt file caused the increase.
3. The check fails because the configured `budget` is exceeded.
4. The author moves rare examples into retrieval data instead of the base
   prompt, preserving quality without permanently increasing every call.

This is the core operating model: prompt cost becomes a reviewable code change.
