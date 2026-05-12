import { z } from 'zod';

const FORMATS = ['json', 'yaml', 'xml', 'markdown', 'text'] as const;
const PROVIDERS = ['anthropic', 'cohere', 'google', 'mistral', 'openai'] as const;
const VISION_DETAIL = ['low', 'high', 'auto'] as const;

const MAX_TEXT_LEN = 1_000_000;

export const FormatEnum = z.enum(FORMATS);
export const ProviderEnum = z.enum(PROVIDERS);
export const VisionDetailEnum = z.enum(VISION_DETAIL);

export const EstimateCostInput = z.object({
  text: z.string().min(1).max(MAX_TEXT_LEN),
  model: z.string().min(1),
  format: FormatEnum.optional(),
  outputTokens: z.number().int().min(0).optional(),
});
export type EstimateCostInput = z.infer<typeof EstimateCostInput>;

export const EstimateCostMatrixInput = z.object({
  text: z.string().min(1).max(MAX_TEXT_LEN),
  models: z.array(z.string().min(1)).min(1),
  formats: z.array(FormatEnum).min(1).optional(),
});
export type EstimateCostMatrixInput = z.infer<typeof EstimateCostMatrixInput>;

export const CountTokensEmpiricalInput = z.object({
  text: z.string().min(1).max(MAX_TEXT_LEN),
  model: z.string().min(1),
  format: FormatEnum.optional(),
});
export type CountTokensEmpiricalInput = z.infer<typeof CountTokensEmpiricalInput>;

export const CountTokensEmpiricalMatrixInput = z.object({
  text: z.string().min(1).max(MAX_TEXT_LEN),
  models: z.array(z.string().min(1)).min(1),
  formats: z.array(FormatEnum).min(1).optional(),
});
export type CountTokensEmpiricalMatrixInput = z.infer<typeof CountTokensEmpiricalMatrixInput>;

export const GetModelInfoInput = z.object({
  model: z.string().min(1),
});
export type GetModelInfoInput = z.infer<typeof GetModelInfoInput>;

export const ListModelsInput = z.object({
  provider: ProviderEnum.optional(),
  // Reserved for future capability filters (e.g., 'vision', 'streaming').
  // Accepted but currently ignored to keep the schema forward-compatible.
  capability: z.string().min(1).optional(),
});
export type ListModelsInput = z.infer<typeof ListModelsInput>;

export const GetRatesVersionInput = z.object({}).strict();
export type GetRatesVersionInput = z.infer<typeof GetRatesVersionInput>;

const VisionImage = z.object({
  width: z.number().positive().finite(),
  height: z.number().positive().finite(),
  detail: VisionDetailEnum.optional(),
});

export const EstimateVisionCostInput = z.object({
  provider: ProviderEnum,
  images: z.array(VisionImage).min(1),
  // Optional model — when provided, per-image USD is computed from the model's
  // input-per-1k rate. Without it, only token counts come back.
  model: z.string().min(1).optional(),
});
export type EstimateVisionCostInput = z.infer<typeof EstimateVisionCostInput>;

export const BudgetCheckInput = z
  .object({
    text: z.string().min(1).max(MAX_TEXT_LEN),
    model: z.string().min(1),
    maxCostUsd: z.number().positive().finite().optional(),
    maxTokens: z.number().int().positive().optional(),
    format: FormatEnum.optional(),
  })
  .refine((v) => v.maxCostUsd !== undefined || v.maxTokens !== undefined, {
    message: 'budget_check requires at least one of maxCostUsd or maxTokens',
  });
export type BudgetCheckInput = z.infer<typeof BudgetCheckInput>;

export const MeasureLatencyInput = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1).max(MAX_TEXT_LEN),
  trials: z.number().int().min(1).max(10).optional(),
  maxTokens: z.number().int().min(1).max(4096).optional(),
});
export type MeasureLatencyInput = z.infer<typeof MeasureLatencyInput>;
