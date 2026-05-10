# Mistral Integration Decision Memo

**Date:** 2026-05-09
**Status:** Draft — awaiting engineering decision before Phase H impl

---

## Summary (TL;DR)

Add Mistral via **Path A** (`mistral-tokenizer-js` as offline path with `approximate: true`) for the immediate v1.0.0 PR, with explicit Tekken-tokenizer-gap documentation and a deferred upgrade to **Path D** (hybrid + `@huggingface/tokenizers`) once that library matures past v0.1.x.

Key facts:

- `mistral-tokenizer-js` is the only zero-dependency, fully bundled JS tokenizer available today. It accurately covers the V1/V2/V3 SentencePiece family (Mistral 7B, Mixtral 8x7B/8x22B, Mistral Large 2407, Mistral Small 2402, Codestral 22B). It does **not** cover **Tekken** (NeMo, Mistral Small 3.1+, Pixtral, Devstral, Mistral Medium 2505+, Magistral, Ministral). Last published 2022/early 2023, effectively unmaintained.
- `@huggingface/tokenizers` (v0.1.3, May 2026) is a pure-JS library that loads any `tokenizer.json` from HF Hub at runtime, including Tekken. The library itself is 8.8 kB gzipped; a Tekken `tokenizer.json` is ~17 MB downloaded on first use. Brand-new (≤2 weeks old at time of research) — too immature to take as a dependency right now.
- Mistral does **not** expose a public free `/v1/tokenize` endpoint. The only public option is reading `usage.prompt_tokens` from a metered chat completion call. Not viable as a default empirical path.
- `@tokenlens/models/mistral` (v1.3.0, already installed) covers 19 models with full pricing — the cost layer is one-line work.

The Tekken gap is the only meaningful tradeoff. Recommendation: classify Tekken-family models with a `'heuristic'` tokenizer kind (same fallback as Google) and mark `approximate: true`. Don't apply SentencePiece tokenization to Tekken models — it would be systematically wrong, not just noisy.

---

## Background

Tokenometer is a TypeScript / Node ≥20 monorepo. Tokenization runs in two modes:

- **Offline (default).** `gpt-tokenizer` `o200k_base` for OpenAI (exact), `cl100k_base` as a proxy for Anthropic (`approximate: true`), `chars/4` heuristic for Google (`approximate: true`).
- **Empirical (`--empirical`).** Calls Anthropic `messages.countTokens` (free), Google `model.countTokens` (free), tiktoken for OpenAI.

Pricing comes entirely from `@tokenlens/models` (registry layer in `packages/core/src/rates.ts`). The honesty contract: `approximate: boolean` on `TokenizeResult` is set whenever the offline path is a proxy.

Adding Mistral requires three things:
1. `'mistral'` added to the `Provider` union (`packages/core/src/types.ts`).
2. `@tokenlens/models/mistral` wired into `CATALOG` and `PROVIDERS` in `rates.ts`.
3. Tokenizer dispatch for `'mistral'` in `packages/core/src/tokenize.ts`.

Step 3 is the hard part.

---

## Research Findings

### 1. `mistral-tokenizer-js` (npm)

| Field | Value |
|---|---|
| Version | 1.0.0 (single release) |
| Last publish | ~October 2022 / early 2023 |
| Weekly downloads | ~1,800/week, declining |
| Bundle size | 670 kB pre-gzip, zero deps |
| Repo stars | 20 (imoneoi/mistral-tokenizer) |
| Performance | ~1 ms/sentence, ~20 ms/2k tokens |
| Maintenance | Effectively abandoned |

**Accuracy claims:** Author says "compatible with Mistral 7B and finetunes… mostly likely compatible with new Mistral models." No formal benchmarks. The README's caveat — "If you are unsure, try it and see if the token IDs are the same" — is the only guidance.

**Model coverage:**

| Model family | Tokenizer | mistral-tokenizer-js |
|---|---|---|
| Mistral 7B (v0.1, v0.2, v0.3) | SentencePiece V1 | Yes |
| Mixtral 8x7B, 8x22B | SentencePiece V2 | Yes |
| Mistral Large 2402 / 2407 | SentencePiece V3 | Yes |
| Mistral Small 2402 | SentencePiece V3 | Yes |
| Codestral 22B (2405) | SentencePiece V3 | Yes |
| Mistral NeMo 2407 | **Tekken** (tiktoken-style, 128k) | **No** |
| Mistral Small 3.1 / 2409+ | **Tekken** | **No** |
| Pixtral 12B / Pixtral Large | **Tekken** | **No** |
| Devstral Small / Medium | **Tekken** | **No** |
| Mistral Medium 2505 / 2508 | **Tekken** (presumed) | **No** |
| Magistral Small / Medium | Unknown (likely Tekken) | Unverified |

The split point is **Mistral NeMo (July 2024)** when Tekken (a tiktoken-based BPE with 128k vocab) was introduced. Vocabulary differs ~32k vs 128k — applying SentencePiece to Tekken models would yield systematically wrong counts (not just rounding noise).

### 2. `@huggingface/tokenizers`

| Field | Value |
|---|---|
| Version | 0.1.3 (May 2026) |
| Library size | 8.8 kB gzipped, zero deps |
| Model file size (Tekken) | ~17 MB tokenizer.json |
| Model file size (SentencePiece) | ~2-4 MB |
| Maturity | Very new (~2 weeks old at research time) |

How it works: pure JS, accepts a pre-fetched `tokenizer.json` and `tokenizer_config.json`. Mistral support exists via Xenova/mistral-tokenizer-v1/v2/v3 HF Hub repos and the Tekken `tokenizer.json` for newer models. Cold start is fast (no WASM); memory ≈ vocabulary size in JS objects (~5-15 MB for 128k vocab).

**Risk:** v0.1.3 has not accumulated real-world validation. Premature to ship as a default dependency. Path D upgrade revisit when v1.0.

### 3. Official Mistral Tokenize Endpoint

**Not available as of May 2026.**

The Mistral REST API (`docs.mistral.ai/api`) lists Chat, FIM, Embeddings, Classifiers, Files, Models, Batch, OCR, Audio, Beta. **No tokenize / count endpoint.**

The `mistral-common` Python library ships an experimental `POST /v1/tokenize/request` REST server, but it requires self-hosting Python — not a public hosted Mistral endpoint. Not viable for a Node CLI.

The only public method is reading back `usage.prompt_tokens` from a chat completion. Metered. Conflicts with `--max-spend` semantics. Not viable as a default.

### 4. `@tokenlens/models/mistral`

Installed locally at `node_modules/@tokenlens/models/dist/providers/mistral.js`. Lists 19 models with full `cost.input`, `cost.output`, `limit.context`, `limit.output`. The integration with `rates.ts` is one-line work — same shape as the existing OpenAI/Anthropic/Google entries.

Models covered: pixtral-large-latest, open-mixtral-8x7b, codestral-latest, devstral-small-2505, devstral-medium-2507, mistral-medium-2505, devstral-small-2507, ministral-8b-latest, magistral-medium-latest, pixtral-12b, open-mistral-7b, magistral-small, mistral-medium-2508, open-mixtral-8x22b, mistral-medium-latest, mistral-small-latest, mistral-large-latest, mistral-nemo, ministral-3b-latest.

The catalog has no `tokenizer` field — the SentencePiece/Tekken classification must be hardcoded.

### 5. Other Options

- **`mistral-tokenizer-ts`** (v2.2.1, June 2025, 9 stars, ~1,400 weekly downloads). TypeScript fork. Better-maintained than v1 but also missing Tekken. Drop-in replacement worth a quick A/B test before shipping.
- **`@lordluceus/mistral-tokenizer`** — fork of v1, very low usage, no Tekken. Skip.
- **`kitoken`** (49 stars, Rust → WASM, December 2024, npm bindings). Supports SentencePiece, tiktoken, HF Tokenizers, **and Tekken**. Could be a viable Tekken path. Risks: minimal community validation, WASM binary weight, platform-specific build artifacts. Defer.
- **OpenAI `tiktoken`** — only OpenAI encodings. Not applicable.
- **`mistral-common` Python** — not JS. Skip.

---

## Decision

**Path A for the immediate PR** with explicit Tekken-gap handling:

1. Add `'mistral'` to `Provider` union in `types.ts`.
2. Add `mistral: mistralProvider` to `CATALOG` in `rates.ts` and `'mistral'` to `PROVIDERS`.
3. Add a constant `TEKKEN_MODELS` listing the model IDs that use Tekken. Update as Mistral releases new models.
4. In `tokenize.ts` `countTokens()`, add `case 'mistral':`:
   - If model in known SentencePiece set → load `mistral-tokenizer-js`, return `{ approximate: true, tokenizer: 'mistral_v1_v3' }`.
   - If model in `TEKKEN_MODELS` → fall back to `chars/4` heuristic (same as Google), return `{ approximate: true, tokenizer: 'heuristic' }`. Do **not** apply SentencePiece — its counts are systematically wrong for Tekken.
5. Empirical mode for Mistral: throw a clear error: "Mistral does not expose a public token-count API; offline mode only. To get exact counts, use a chat completion call manually and read back `usage.prompt_tokens`."
6. Add `mistral-tokenizer-js` as a `dependency` of `@tokenometer/core`.
7. README methodology table: add a row per Mistral provider with the exactness tier disclosed.

**Future Path D** (deferred, tracked as a follow-up issue): once `@huggingface/tokenizers` reaches v1.0+, add an opt-in `--exact` flag that lazy-loads the model's `tokenizer.json` (cached at `~/.cache/tokenometer/`). Behind that flag, Tekken models become exact.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `mistral-tokenizer-js` abandoned; SentencePiece changes upstream | Low | Medium | Vocabulary stable; pin model ID list |
| Tekken classification wrong for an edge model | Medium | High | Exhaustive list + default-to-heuristic on unknown |
| `@huggingface/tokenizers` v0.1.x API breaks before we adopt | Medium | Low | Don't depend on it yet |
| 670 kB bundle weight is "noticeable" | Low | Low | Comparable to existing gpt-tokenizer data |
| Mistral ships a JS SDK with built-in tokenizer | Low | Positive | Replace this whole path; no harm |

---

## Open Questions

1. Definitive SentencePiece-vs-Tekken classification per model ID. Cross-check with Mistral HuggingFace `tokenizer_config.json` `tokenizer_class` field for each one.
2. Is `mistral-tokenizer-ts` (v2.2.1, more recent) worth picking over `mistral-tokenizer-js`? One-hour A/B test before shipping.
3. Mistral empirical mode via metered chat completion — implement under `--empirical` with a hard `--max-spend` warning, or refuse entirely? Recommend: refuse for now, add later if requested.
4. `@huggingface/tokenizers` cache layer — does the library support a `cacheDir` arg, or does the CLI manage it? Investigation deferred to Path D revisit.

---

## References

- npm: mistral-tokenizer-js — https://www.npmjs.com/package/mistral-tokenizer-js
- GitHub: imoneoi/mistral-tokenizer — https://github.com/imoneoi/mistral-tokenizer
- npm: mistral-tokenizer-ts — https://www.npmjs.com/package/mistral-tokenizer-ts
- npm: @huggingface/tokenizers — https://www.npmjs.com/package/@huggingface/tokenizers
- HF blog: Transformers.js v4 — https://huggingface.co/blog/transformersjs-v4
- HF docs: tokenizers API — https://huggingface.co/docs/transformers.js/en/api/tokenizers
- HF: Xenova/mistral-tokenizer-v3 — https://huggingface.co/Xenova/mistral-tokenizer-v3
- Mistral API spec — https://docs.mistral.ai/api
- Mistral tokenization guide — https://docs.mistral.ai/guides/tokenization
- Mistral-common experimental REST — https://mistralai.github.io/mistral-common/usage/experimental/
- Mistral NeMo / Tekken announcement — https://mistral.ai/news/mistral-nemo
- GitHub: Systemcluster/kitoken — https://github.com/Systemcluster/kitoken
