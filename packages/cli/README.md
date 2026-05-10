# tokenometer

[![npm tokenometer](https://img.shields.io/npm/v/tokenometer.svg?label=tokenometer)](https://www.npmjs.com/package/tokenometer)
[![License: MIT](https://img.shields.io/github/license/faraa2m/tokenometer.svg)](https://github.com/faraa2m/tokenometer/blob/main/LICENSE)

> Empirical token-cost benchmarking for LLM prompts. Tells you what your prompt actually costs across Claude, GPT-4o, and Gemini, in every format.

See the [root README](https://github.com/faraa2m/tokenometer#readme) for findings, methodology, and the full project overview.

[**Live playground: tokenometer.vercel.app**](https://tokenometer.vercel.app) · [Source](https://github.com/faraa2m/tokenometer) · MIT

```bash
npx tokenometer ./prompt.md --model claude-opus-4-7,gpt-4o
```

```
model            format    tokens  est. cost  tokenizer
---------------  --------  ------  ---------  --------------
claude-opus-4-7  json         ~78  $0.001170  cl100k_base
claude-opus-4-7  yaml         ~84  $0.001260  cl100k_base
gpt-4o           json          77  $0.000192  o200k_base
gpt-4o           yaml          83  $0.000208  o200k_base

Cheapest: gpt-4o as json ($0.000192)
Priciest: claude-opus-4-7 as yaml ($0.001260, 6.74x more)
```

A leading `~` marks an approximate count (offline mode for Claude / Gemini, since neither vendor publishes a public tokenizer).

## Empirical mode

For exact, vendor-billed counts on Claude and Gemini, set the right env var and pass `--empirical`. The tool calls the providers' free `countTokens` endpoints — no charge.

```bash
ANTHROPIC_API_KEY=… GOOGLE_API_KEY=… \
  npx tokenometer ./prompt.md --empirical
```

## Why not just `tiktoken`?

`tiktoken`'s `cl100k_base` (the encoding most "Claude tokenizer" libraries fall back on) **under-counts Opus 4.7 by a median of +62%** across a 10-prompt benchmark. Sonnet 4.6 and Haiku 4.5 are closer (~17%). Format choice is a wash. Model choice swings cost by 12×. See [README](https://github.com/faraa2m/tokenometer#findings-anthropic-n150-cells-across-10-prompt-shapes) for the dataset findings.

## Flags

```
tokenometer <file> [options]
echo "prompt" | tokenometer - [options]

--model <id[,id…]>     Default: claude-opus-4-7
--format <fmt[,fmt…]>  Default: all (json,yaml,xml,markdown,text)
--empirical            Use provider countTokens APIs (free, exact)
--max-spend <usd>      Hard ceiling for empirical mode (default 0.05)
--offline              Force offline (overrides --empirical)
-h, --help
-v, --version
```

## License

MIT
