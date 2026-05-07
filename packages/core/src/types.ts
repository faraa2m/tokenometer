export type Provider = 'anthropic' | 'openai' | 'google';

export type Format = 'json' | 'markdown' | 'text' | 'xml' | 'yaml';

export interface ModelDescriptor {
  id: string;
  provider: Provider;
}

export interface RateEntry {
  inputPer1k: number;
  cachedInputPer1k?: number;
  outputPer1k: number;
}

export interface TokenizeResult {
  format: Format;
  inputCost: number;
  inputTokens: number;
  model: string;
  provider: Provider;
}

export interface EmpiricalResult extends TokenizeResult {
  cachedInputTokens: number;
  empiricalInputCost: number;
}
