---
"tokenometer": minor
"@tokenometer/core": minor
"@tokenometer/mcp": minor
---

Refresh provider model coverage and split the model registry into costable models and full catalog visibility.

Adds current priced OpenAI, Anthropic, and Cohere model IDs to the cost-estimation registry, exposes `MODEL_CATALOG`, `KNOWN_CATALOG_MODELS`, and `getCatalogModel()` for visible but unsupported provider models, and returns clearer errors when catalog-only models are used for text cost estimates.
