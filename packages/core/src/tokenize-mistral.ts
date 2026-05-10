// Mistral tokenizer dispatch.
//
// Mistral has shipped two tokenizer families:
//
//   1. SentencePiece (V1/V2/V3) — the "classic" Mistral family. Covered by
//      `mistral-tokenizer-js` (mistralTokenizer.encode → number[]). Models:
//      Mistral 7B (v0.1/v0.2/v0.3), Mixtral 8x7B / 8x22B,
//      Mistral Large 2407, Mistral Small 2402, Codestral 22B.
//
//   2. Tekken — a tiktoken-style 128k BPE introduced with Mistral NeMo
//      (Jul 2024). Used by NeMo, Pixtral, Mistral Small 2409+, Devstral,
//      Mistral Medium 2505+, Magistral, Ministral. NOT covered by
//      `mistral-tokenizer-js`. Applying SentencePiece to Tekken models would
//      give systematically wrong counts (different vocab, ~32k vs ~128k), so
//      we fall back to the same `chars/4` heuristic used for Google.
//
// Both paths set `approximate: true` because:
//   - Mistral does not publish an offline reference tokenizer for newer
//     models, and even the SentencePiece path is "compatible with most"
//     per the upstream README — no formal validation guarantee.
//   - Mistral has no public free /v1/tokenize endpoint as of May 2026, so
//     there's no empirical anchor available either.
//
// Future upgrade path (Path D in the research memo): once
// `@huggingface/tokenizers` reaches v1.0, lazy-load `tokenizer.json` per
// model for exact counts behind an opt-in flag.

import mistralTokenizer from 'mistral-tokenizer-js';
import type { TokenizerKind } from './types.js';

/**
 * Mistral model IDs that use the Tekken tokenizer (post-NeMo families).
 *
 * Cross-reference list curated from the integration memo. Update as Mistral
 * releases new model IDs; default-on-unknown is heuristic too, so this set
 * is allowlist-style for SentencePiece, not the other way around.
 */
const TEKKEN_MODELS: ReadonlySet<string> = new Set([
  'mistral-nemo',
  'pixtral-12b',
  'pixtral-large-latest',
  'mistral-small-latest',
  'devstral-small-2505',
  'devstral-small-2507',
  'devstral-medium-2507',
  'mistral-medium-2505',
  'mistral-medium-2508',
  'mistral-medium-latest',
  'magistral-small',
  'magistral-medium-latest',
  'ministral-3b-latest',
  'ministral-8b-latest',
]);

export const isTekken = (modelId: string): boolean => TEKKEN_MODELS.has(modelId);

const MISTRAL_HEURISTIC_CHARS_PER_TOKEN = 4;

const heuristicCount = (text: string): number =>
  Math.ceil(text.length / MISTRAL_HEURISTIC_CHARS_PER_TOKEN);

export interface MistralCountResult {
  approximate: true;
  tokens: number;
  tokenizer: 'heuristic' | 'mistral_v1_v3';
}

/**
 * Count tokens for a Mistral model. Always `approximate: true` (see file
 * header). For SentencePiece models, returns the `mistral-tokenizer-js`
 * count (BOS token included, matching the library's default). For Tekken
 * models (and any unknown ID — defensive), returns a `chars/4` heuristic.
 */
export const mistralCount = (text: string, modelId: string): MistralCountResult => {
  if (isTekken(modelId)) {
    return { approximate: true, tokens: heuristicCount(text), tokenizer: 'heuristic' };
  }
  // SentencePiece path. `encode()` returns number[] including the BOS token
  // by default — this matches what Mistral's chat completions endpoint
  // would actually charge for, so we do not strip it.
  const ids = mistralTokenizer.encode(text);
  const tokenizer: TokenizerKind = 'mistral_v1_v3';
  return { approximate: true, tokens: ids.length, tokenizer };
};
