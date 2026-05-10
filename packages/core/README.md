# @tokenometer/core

[![npm @tokenometer/core](https://img.shields.io/npm/v/@tokenometer/core.svg?label=@tokenometer/core)](https://www.npmjs.com/package/@tokenometer/core)
[![License: MIT](https://img.shields.io/github/license/faraa2m/tokenometer.svg)](https://github.com/faraa2m/tokenometer/blob/main/LICENSE)

> Core library powering [tokenometer](https://www.npmjs.com/package/tokenometer): tokenizer dispatch, format converters, versioned cost rate matrix, and an empirical-mode `countTokens` adapter for Anthropic, OpenAI, and Google.

See the [root README](https://github.com/faraa2m/tokenometer#readme) for findings, methodology, and the full project overview.

[**Live playground**](https://tokenometer.vercel.app) · [Source](https://github.com/faraa2m/tokenometer) · MIT

If you just want a CLI, `npm install -g tokenometer`. This package is for programmatic use.

## API

```ts
import {
  tokenize,
  tokenizeMatrix,
  tokenizeEmpirical,
  tokenizeMatrixEmpirical,
  countTokens,
  toFormat,
  isFormat,
  allFormats,
  KNOWN_MODELS,
  RATES,
  RATES_VERSION,
  getModel,
  getRate,
} from '@tokenometer/core';
```

### Offline (deterministic, no API key)

```ts
const result = tokenize({
  prompt: '{"hello": "world"}',
  format: 'yaml',
  modelId: 'claude-opus-4-7',
});
// {
//   model: 'claude-opus-4-7',
//   provider: 'anthropic',
//   format: 'yaml',
//   tokenizer: 'cl100k_base',
//   inputTokens: 12,
//   inputCost: 0.00018,
//   approximate: true   // ← Anthropic does not publish a public Claude 3+ tokenizer
// }
```

### Empirical (real provider counts, free)

```ts
const result = await tokenizeEmpirical({
  prompt: '{"hello": "world"}',
  format: 'yaml',
  modelId: 'claude-opus-4-7',
  env: { anthropicApiKey: process.env.ANTHROPIC_API_KEY! },
});
// approximate: false  ← uses Anthropic's messages.countTokens
```

### Rate table

`RATES` is a `Record<modelId, { inputPer1k, outputPer1k, cachedInputPer1k? }>`. `RATES_VERSION` ships as a date string so consumers can pin or audit.

## License

MIT
