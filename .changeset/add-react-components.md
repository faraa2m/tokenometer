---
'@tokenometer/react': minor
---

Initial release of `@tokenometer/react` — drop-in React hooks and components for LLM token cost dashboards. Includes `useTokenCount`, `useCostMatrix`, `useBudget`, `useDebouncedTokenCount`, `useModelList`, `usePricing` hooks plus `<TokenCounter>`, `<ModelCostMatrix>`, `<BudgetMeter>`, `<CostBreakdown>`, `<ModelSelector>`, `<LiveTokenizer>`, `<PricingTable>`, `<VisionCostEstimator>` components. Headless-first with opt-in `@tokenometer/react/styled` wrappers. SSR / RSC compatible via `"use client"` banner. Peer deps: react >=18, react-dom >=18, @tokenometer/core >=1.0.1.
