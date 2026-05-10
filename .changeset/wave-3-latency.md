---
"tokenometer": minor
"@tokenometer/core": minor
---

Add `--latency` flag — measures real generation latency (TTFT + total ms +
tokens/sec, p50/p95/mean over n trials) alongside token cost. Implies
`--empirical`. Default trials = 3, configurable via `--latency-trials <n>`
(1-10). Bumps default `--max-spend` to $0.25 to cover the n × 200-token
generations. Supported providers: Anthropic, OpenAI, Google, Cohere,
Mistral (latter two are metered).
