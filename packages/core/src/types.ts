export type Provider = 'anthropic' | 'openai' | 'google';

export type Format = 'json' | 'markdown' | 'text' | 'xml' | 'yaml';

export interface ModelDescriptor {
  id: string;
  provider: Provider;
  contextWindow?: number;
  maxOutputTokens?: number;
  pricingSource?: 'local' | 'tokenlens';
}

export interface RateEntry {
  inputPer1k: number;
  cachedInputPer1k?: number;
  outputPer1k: number;
}

export interface TokenizeResult {
  approximate: boolean;
  format: Format;
  inputCost: number;
  inputTokens: number;
  model: string;
  provider: Provider;
  tokenizer: TokenizerKind;
}

export type TokenizerKind = 'cl100k_base' | 'heuristic' | 'o200k_base';

export interface EmpiricalResult extends TokenizeResult {
  cachedInputTokens: number;
  empiricalInputCost: number;
}
