# @tokenometer/react

Internal React hooks and unstyled components for the Tokenometer web app,
built on top of [`@tokenometer/core`](https://www.npmjs.com/package/@tokenometer/core).
This workspace package is private and is not part of the public npm release
surface.

## Workspace Usage

`packages/web` consumes this package through npm workspaces. Do not install it
from npm; public users should use the hosted app at
[`tokenometer.dev`](https://tokenometer.dev) or the published `tokenometer`,
`@tokenometer/core`, and `@tokenometer/mcp` packages.

## Quickstart

### Token counter

```tsx
import { TokenCounter } from '@tokenometer/react';

export function Header() {
  return <TokenCounter prompt="Summarize this in three bullets." model="gpt-4o" />;
}
```

### Cost matrix across models and formats

```tsx
import { ModelCostMatrix } from '@tokenometer/react';

export function Compare({ prompt }: { prompt: string }) {
  return (
    <ModelCostMatrix
      prompt={prompt}
      models={['gpt-4o', 'claude-sonnet-4-6', 'gemini-1.5-pro']}
      formats={['text', 'json', 'markdown']}
    />
  );
}
```

### Live tokenizer textarea

```tsx
import { LiveTokenizer } from '@tokenometer/react';

export function Playground() {
  return <LiveTokenizer model="gpt-4o" defaultPrompt="hello" />;
}
```

## Hooks API

All hooks are tree-shakeable and exported from both the root entry and
`@tokenometer/react/hooks`.

| Hook | Signature | Notes |
| --- | --- | --- |
| `useTokenCount` | `({ prompt, model, format? }) => { tokens, cost, tokenizer, approximate, error? }` | Synchronous. Memoized on inputs. |
| `useTokenCountEmpirical` | `({ prompt, model, env, format? }) => { data?, error?, isLoading }` | Async; provider API keys via `env`. |
| `useCostMatrix` | `({ prompt, models, formats? }) => TokenizeResult[]` | Flat cartesian product. |
| `useBudget` | `({ usedUsd, budgetUsd, warnAt? }) => { percent, remaining, state, formatted }` | `state` is `'ok' \| 'warn' \| 'over'`. |
| `useDebouncedTokenCount` | `({ prompt, model, delayMs?, format? }) => UseTokenCountResult & { isPending }` | Debounces the prompt before tokenizing. |
| `useModelList` | `({ providers? }) => ModelDescriptor[]` | Reads `MODELS` from core. |
| `usePricing` | `({ models?, providers? }) => { model, rate }[]` | Projects `RATES` into rows. |

## Components API

| Component | Required props | Optional props |
| --- | --- | --- |
| `TokenCounter` | `prompt`, `model` | `format`, `className`, `render` |
| `ModelCostMatrix` | `prompt`, `models` | `formats`, `className` |
| `BudgetMeter` | `usedUsd`, `budgetUsd` | `warnAt`, `label`, `className` |
| `CostBreakdown` | `items` | `showTotal`, `className` |
| `ModelSelector` | `value`, `onChange` | `providers`, `id`, `placeholder`, `className` |
| `LiveTokenizer` | `model` | `defaultPrompt`, `debounceMs`, `placeholder`, `onChange`, `className` |
| `PricingTable` | — | `models`, `providers`, `currency`, `className` |
| `VisionCostEstimator` | `provider`, `images` | `model`, `className` |

Every component accepts `className` and forwards a ref to its root element.
Components emit `data-tk="<name>"` attributes so consumers can target them
with their own CSS without ID gymnastics.

## Headless pattern

Every component is built on top of a hook. If you want full control over
the markup, skip the components and call the hook directly:

```tsx
import { useTokenCount, formatUsd } from '@tokenometer/react';

export function CustomBadge({ prompt, model }: { prompt: string; model: string }) {
  const { tokens, cost, approximate } = useTokenCount({ prompt, model });
  return (
    <div className="my-badge">
      <strong>{tokens}</strong> tokens · {formatUsd(cost)}
      {approximate ? <em>(approx.)</em> : null}
    </div>
  );
}
```

## Styled variants

If you want batteries-included visuals without writing CSS, import from
`@tokenometer/react/styled`:

```tsx
import { StyledTokenCounter, StyledPricingTable } from '@tokenometer/react/styled';
```

Styled wrappers apply minimal inline styles using CSS custom properties
(`--tk-bg`, `--tk-fg`, `--tk-border`, `--tk-warn`, `--tk-danger`,
`--tk-spacing`, `--tk-radius`, `--tk-font`). Override any of them on
`:root` or a parent element to theme.

## SSR and React Server Components

The build emits a `"use client";` banner so the package works inside React
Server Components without wrapping every import in `'use client'`. Hooks
that touch DOM APIs (debounce timers, `useState`) are intentionally lazy:
they only run on the client. Server-rendered output is deterministic and
matches the first client render for synchronous hooks.

## Micro-frontend notes

The package is ESM-first with a CommonJS fallback and ships separate
entry points for hooks, components, and styled wrappers. Federated builds
can import only what they use:

```ts
import { useTokenCount } from '@tokenometer/react/hooks';
import { TokenCounter } from '@tokenometer/react/components';
```

`sideEffects: false` keeps bundlers happy with tree-shaking. React,
react-dom and `@tokenometer/core` are peer dependencies, so federated
hosts can dedupe them.

## License

MIT.
