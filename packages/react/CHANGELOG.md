# @tokenometer/react

## 2.0.0

### Major Changes

- [#41](https://github.com/faraa2m/tokenometer/pull/41) [`e0b86ff`](https://github.com/faraa2m/tokenometer/commit/e0b86ffe7e6c37cabbe56f02823f7c66f1a14ed8) Thanks [@faraa2m](https://github.com/faraa2m)! - Require Node.js 26 and run CI, release, registry, and automation workflows on Node 26.

### Patch Changes

- Updated dependencies [[`e0b86ff`](https://github.com/faraa2m/tokenometer/commit/e0b86ffe7e6c37cabbe56f02823f7c66f1a14ed8)]:
  - @tokenometer/core@2.0.0

## 1.0.0

### Minor Changes

- [#36](https://github.com/faraa2m/tokenometer/pull/36) [`595318a`](https://github.com/faraa2m/tokenometer/commit/595318aa92775a47f49e59f0df8a72592d8f0e04) Thanks [@faraa2m](https://github.com/faraa2m)! - Initial release of `@tokenometer/react` — drop-in React hooks and components for LLM token cost dashboards. Includes `useTokenCount`, `useCostMatrix`, `useBudget`, `useDebouncedTokenCount`, `useModelList`, `usePricing` hooks plus `<TokenCounter>`, `<ModelCostMatrix>`, `<BudgetMeter>`, `<CostBreakdown>`, `<ModelSelector>`, `<LiveTokenizer>`, `<PricingTable>`, `<VisionCostEstimator>` components. Headless-first with opt-in `@tokenometer/react/styled` wrappers. SSR / RSC compatible via `"use client"` banner. Peer deps: react >=18, react-dom >=18, @tokenometer/core >=1.0.1.

### Patch Changes

- Updated dependencies [[`c6249c0`](https://github.com/faraa2m/tokenometer/commit/c6249c05863795d39cf4b9773e5224b7916f0bbf)]:
  - @tokenometer/core@1.1.0
