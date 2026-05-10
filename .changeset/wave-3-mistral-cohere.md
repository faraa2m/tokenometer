---
"tokenometer": minor
"@tokenometer/core": minor
---

Add Mistral and Cohere providers.

- Mistral: `mistral-tokenizer-js` for SentencePiece family (Mistral 7B,
  Mixtral, Mistral Large 2407, Codestral); `chars/4` heuristic for Tekken
  models (NeMo, Pixtral, Mistral Small 2409+, Devstral, Mistral Medium
  2505+, Magistral, Ministral). All marked `approximate: true`. Empirical
  mode unsupported (Mistral has no public token-count API).
- Cohere: offline heuristic `chars/4` (Cohere SDK is REST-only; no offline
  tokenizer ships in JS). Empirical via `POST /v1/tokenize` when
  `COHERE_API_KEY` is set.

Pricing for Mistral auto-sourced from `@tokenlens/models/mistral`. Cohere
pricing comes from `LOCAL_OVERRIDES` (`command-r`, `command-r-plus`)
because `@tokenlens/models` does not yet ship a Cohere catalog at v1.3.0.
