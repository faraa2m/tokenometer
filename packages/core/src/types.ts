export type Provider = 'anthropic' | 'cohere' | 'google' | 'mistral' | 'openai';

export type Format = 'json' | 'markdown' | 'text' | 'xml' | 'yaml';

export interface ModelDescriptor {
  id: string;
  provider: Provider;
  contextWindow?: number;
  maxOutputTokens?: number;
  modalities?: readonly string[];
  pricingSource?: 'local' | 'tokenlens';
  releaseDate?: string;
  sourceUrl?: string;
  status?: 'stable' | 'preview' | 'deprecated' | 'retired' | 'limited' | 'specialized';
  supportsTextCostEstimate?: boolean;
  supportsTokenCounting?: boolean;
  unsupportedReason?: string;
}

export interface RateEntry {
  inputPer1k: number;
  cachedInputPer1k?: number;
  outputPer1k: number;
}

// Forward-declare the LatencyResult shape here so `TokenizeResult` can
// reference it without creating a circular import. The canonical definition
// lives in `latency.ts` and is re-exported from `index.ts`.
export interface LatencyTrial {
  ttftMs: number;
  totalMs: number;
  outputTokens: number;
  tokensPerSec: number;
}

export interface LatencyStats {
  ttftMs: number;
  totalMs: number;
  tokensPerSec: number;
}

export interface LatencyResult {
  trials: LatencyTrial[];
  p50: LatencyStats;
  p95: LatencyStats;
  mean: LatencyStats;
}

export interface TokenizeResult {
  approximate: boolean;
  format: Format;
  inputCost: number;
  inputTokens: number;
  model: string;
  provider: Provider;
  tokenizer: TokenizerKind;
  // Populated only when the caller passed `--latency` (CLI) or invoked
  // `measureLatency` directly. Stays absent on plain offline / empirical
  // paths so SARIF and JSON consumers don't have to thread the field.
  latency?: LatencyResult;
}

export type TokenizerKind = 'cl100k_base' | 'heuristic' | 'mistral_v1_v3' | 'o200k_base';

export interface EmpiricalResult extends TokenizeResult {
  cachedInputTokens: number;
  empiricalInputCost: number;
}
