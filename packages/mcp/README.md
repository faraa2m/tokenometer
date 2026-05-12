# @tokenometer/mcp

[![npm @tokenometer/mcp](https://img.shields.io/npm/v/@tokenometer/mcp.svg?label=%40tokenometer%2Fmcp)](https://www.npmjs.com/package/@tokenometer/mcp)
[![License: MIT](https://img.shields.io/github/license/faraa2m/tokenometer.svg)](https://github.com/faraa2m/tokenometer/blob/main/LICENSE)

> Model Context Protocol (MCP) server that wraps [`@tokenometer/core`](https://www.npmjs.com/package/@tokenometer/core). Lets AI agents — Claude Desktop, Cursor, or anything else that speaks MCP — estimate LLM token cost, run empirical token counts, check budgets, and measure real generation latency *before* dispatching a request.

The server exposes 10 tools over stdio. It runs as a child process started by your MCP host (Claude Desktop, Cursor, etc.); the host calls `tools/list` to discover the schema and `tools/call` to invoke a tool. Cost estimation is offline by default; empirical and latency modes hit each provider's API (free `countTokens` for empirical, real metered streaming for latency).

## What it is

Tokenometer's core library knows how to:

- Estimate token cost across **63 models / 5 providers** (Anthropic, OpenAI, Google, Mistral, Cohere) using each provider's tokenizer.
- Call provider `countTokens` endpoints (Anthropic, Google, OpenAI, Cohere) for exact counts.
- Measure real streaming TTFT / tokens-per-sec latency.
- Compute vision-token cost for image inputs.

This package surfaces all of that as MCP tools so an agent can self-monitor spend, A/B model choices, or fail fast on a budget violation without leaving its tool-use loop.

## Install

`npx` runs the published bin directly — no global install needed:

```bash
npx -y @tokenometer/mcp
```

The first time `npx` fetches it; later invocations reuse the cache.

## Claude Desktop

Add this block to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "tokenometer": {
      "command": "npx",
      "args": ["-y", "@tokenometer/mcp"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

Restart Claude Desktop. Tokenometer tools will appear in the tools picker.

## Cursor

Add the same block to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "tokenometer": {
      "command": "npx",
      "args": ["-y", "@tokenometer/mcp"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

Restart Cursor. The tools become available to the agent loop automatically.

## Tool reference

| Tool | Purpose | Needs API key? |
|---|---|---|
| `estimate_cost` | Estimate token cost for one (text, model) using the offline tokenizer. Optional `outputTokens` adds the completion cost. | No |
| `estimate_cost_matrix` | Same as above, but for the cross-product of `models x formats`. Includes cheapest / most expensive cells. | No |
| `count_tokens_empirical` | Exact token count via the provider's `countTokens` API (free, no completion charge). | Anthropic / Google / Cohere only; OpenAI uses local tiktoken |
| `count_tokens_empirical_matrix` | Empirical count across many models; per-cell errors stay inline so one missing key doesn't abort the matrix. | Per-cell |
| `get_model_info` | Provider, context window, max output tokens, USD per 1k input / output, and the rates dataset version. | No |
| `list_models` | Every registered model; optional `provider` filter. | No |
| `get_rates_version` | The `RATES_VERSION` date stamp from the bundled rates registry. | No |
| `estimate_vision_cost` | Per-image vision tokens for Anthropic / OpenAI / Google. Optional `model` adds per-image USD. | No |
| `budget_check` | Pre-flight: does this prompt fit a `maxCostUsd` or `maxTokens` ceiling on this model? Returns pass/fail plus headroom. | No |
| `measure_latency` | Real metered streaming generations (default 3 trials) per provider; reports TTFT, total ms, tokens/sec as p50 / p95 / mean. **Each trial is a paid chat completion.** | Yes (per provider) |

### Environment variables

| Variable | Used by |
|---|---|
| `ANTHROPIC_API_KEY` | empirical + latency on Anthropic |
| `OPENAI_API_KEY` | latency on OpenAI (empirical uses local tiktoken) |
| `GOOGLE_API_KEY` or `GEMINI_API_KEY` | empirical + latency on Google |
| `MISTRAL_API_KEY` | latency on Mistral (empirical is unsupported by upstream) |
| `COHERE_API_KEY` | empirical + latency on Cohere |

Missing keys surface a structured error: `{ "code": "key_missing", "required": "ANTHROPIC_API_KEY", "docs": "..." }`. Tools that don't need keys never fail on missing env.

### Error shape

All tool errors return `isError: true` with a single JSON-encoded text content block:

```json
{ "code": "user_error", "message": "Unknown model \"fake\". Known models: ..." }
```

Stable error codes:

- `user_error` — a `UserFacingError` from `@tokenometer/core` (unknown model, bad format, etc.).
- `key_missing` — the required provider env var is not set.
- `invalid_args` — input failed zod validation (includes `issues` array).
- `unknown_tool` — the requested tool name is not registered.
- `unsupported_provider` — vision tokens on Mistral / Cohere.
- `provider_error` — empirical call to a provider failed (rate limit, network, etc.).
- `internal` — anything else; check the `message` field.

## Limitations

- **Request / response only.** No `prompts`, `resources`, or `roots` capabilities — this server is purely a tool surface. The MCP host drives every invocation.
- **Vision uses bundled math.** Vision-token counts come from the providers' published formulas, not a live API call. Numbers match the providers' documented behavior; they don't account for unannounced changes.
- **Mistral empirical is unsupported.** Mistral does not expose a public token-count endpoint; offline mode (`mistral-tokenizer-js` for V1/V2/V3, chars-over-4 for Tekken) is the only option.
- **Latency is metered.** Every `measure_latency` trial sends a real `max_tokens=200` chat completion. Default trials = 3; bound to 1..10. Budget accordingly.
- **stdio transport only.** Streamable HTTP is on the MCP SDK; this server ships with stdio because that's what Claude Desktop and Cursor use today.

## Verifying the install

After the host has started the server you should see this on stderr in the host's log:

```
tokenometer-mcp ready
```

Calling `tools/list` should return 10 tools. The smallest smoke test is `estimate_cost` with `text: "hello"` and `model: "gpt-4o"` — it runs offline and returns a token count within milliseconds.

## License

MIT
