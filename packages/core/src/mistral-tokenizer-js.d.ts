// Ambient module declaration for `mistral-tokenizer-js` (no types ship upstream).
//
// The package is a single file at `node_modules/mistral-tokenizer-js/mistral-tokenizer.js`
// with `export default mistralTokenizer` where `mistralTokenizer` is an object
// exposing `encode(text, addBos?, addPrecedingSpace?)` → `number[]` and
// `decode(ids, addBos?, addPrecedingSpace?)` → `string`.
//
// We only use `.encode(text)` from `tokenize-mistral.ts`. The signature below
// mirrors the upstream README; defaults add the BOS token and a leading space.

declare module 'mistral-tokenizer-js' {
  interface MistralTokenizer {
    encode(text: string, addBos?: boolean, addPrecedingSpace?: boolean): number[];
    decode(ids: readonly number[], addBos?: boolean, addPrecedingSpace?: boolean): string;
  }

  const mistralTokenizer: MistralTokenizer;
  export default mistralTokenizer;
}
