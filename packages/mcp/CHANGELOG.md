# @tokenometer/mcp

## 2.2.0

### Minor Changes

- [#75](https://github.com/faraa2m/tokenometer/pull/75) [`1443819`](https://github.com/faraa2m/tokenometer/commit/144381963ae62c57047d398c15984b781b8c3ecb) Thanks [@faraa2m](https://github.com/faraa2m)! - Refresh provider model coverage and split the model registry into costable models and full catalog visibility.

  Adds current priced OpenAI, Anthropic, and Cohere model IDs to the cost-estimation registry, exposes `MODEL_CATALOG`, `KNOWN_CATALOG_MODELS`, and `getCatalogModel()` for visible but unsupported provider models, and returns clearer errors when catalog-only models are used for text cost estimates.

### Patch Changes

- Updated dependencies [[`1443819`](https://github.com/faraa2m/tokenometer/commit/144381963ae62c57047d398c15984b781b8c3ecb)]:
  - @tokenometer/core@2.2.0

## 2.1.0

### Patch Changes

- Updated dependencies [[`db7f9a7`](https://github.com/faraa2m/tokenometer/commit/db7f9a75a537e6cf5bd8bcb5dbbc1ca11029ed11)]:
  - @tokenometer/core@2.1.0

## 2.0.4

### Patch Changes

- Updated dependencies [[`c63b83e`](https://github.com/faraa2m/tokenometer/commit/c63b83eea9f9be7485019ce6322d3ce38cfd0cf5)]:
  - @tokenometer/core@2.0.4

## 2.0.3

### Patch Changes

- [`df44a7d`](https://github.com/faraa2m/tokenometer/commit/df44a7dcd23b4ded764077af3cb68eac9ca536b1) Thanks [@faraa2m](https://github.com/faraa2m)! - Publish `@tokenometer/react` as part of the Tokenometer release pipeline so every documented public package ships together.

- Updated dependencies [[`df44a7d`](https://github.com/faraa2m/tokenometer/commit/df44a7dcd23b4ded764077af3cb68eac9ca536b1)]:
  - @tokenometer/core@2.0.3

## 2.0.2

### Patch Changes

- Updated dependencies [[`39e9281`](https://github.com/faraa2m/tokenometer/commit/39e9281c17f787c7810a9921bcbc177909efe989)]:
  - @tokenometer/core@2.0.2

## 2.0.1

### Patch Changes

- [#44](https://github.com/faraa2m/tokenometer/pull/44) [`3cfc93f`](https://github.com/faraa2m/tokenometer/commit/3cfc93f4a593b2c80744ea5e4d67ad47b0c8fb56) Thanks [@faraa2m](https://github.com/faraa2m)! - Refresh the repository status documentation for the v2 release line.

- Updated dependencies [[`3cfc93f`](https://github.com/faraa2m/tokenometer/commit/3cfc93f4a593b2c80744ea5e4d67ad47b0c8fb56)]:
  - @tokenometer/core@2.0.1

## 2.0.0

### Major Changes

- [#41](https://github.com/faraa2m/tokenometer/pull/41) [`e0b86ff`](https://github.com/faraa2m/tokenometer/commit/e0b86ffe7e6c37cabbe56f02823f7c66f1a14ed8) Thanks [@faraa2m](https://github.com/faraa2m)! - Require Node.js 26 and run CI, release, registry, and automation workflows on Node 26.

### Patch Changes

- Updated dependencies [[`e0b86ff`](https://github.com/faraa2m/tokenometer/commit/e0b86ffe7e6c37cabbe56f02823f7c66f1a14ed8)]:
  - @tokenometer/core@2.0.0

## 1.1.0

### Minor Changes

- [#36](https://github.com/faraa2m/tokenometer/pull/36) [`c6249c0`](https://github.com/faraa2m/tokenometer/commit/c6249c05863795d39cf4b9773e5224b7916f0bbf) Thanks [@faraa2m](https://github.com/faraa2m)! - Add `@tokenometer/mcp` — Model Context Protocol server wrapping `@tokenometer/core`. Exposes 10 tools (cost estimation, token counting, model info, vision cost, budget check, latency benchmarking) over stdio so any MCP client (Claude Desktop, Cursor, Zed) can call tokenometer natively. Run with `npx -y @tokenometer/mcp`.

### Patch Changes

- Updated dependencies [[`c6249c0`](https://github.com/faraa2m/tokenometer/commit/c6249c05863795d39cf4b9773e5224b7916f0bbf)]:
  - @tokenometer/core@1.1.0
