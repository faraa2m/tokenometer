---
'@tokenometer/mcp': minor
'@tokenometer/core': minor
'tokenometer': minor
---

Add `@tokenometer/mcp` — Model Context Protocol server wrapping `@tokenometer/core`. Exposes 10 tools (cost estimation, token counting, model info, vision cost, budget check, latency benchmarking) over stdio so any MCP client (Claude Desktop, Cursor, Zed) can call tokenometer natively. Run with `npx -y @tokenometer/mcp`.
