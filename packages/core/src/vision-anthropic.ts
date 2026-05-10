export interface AnthropicVisionInput {
  width: number;
  height: number;
  /** Anthropic's estimator does not branch on detail; accepted for API parity. */
  detail?: 'low' | 'high' | 'auto';
}

const MAX_TOKENS = 1600;

/**
 * Anthropic vision token estimator.
 *
 * Approximation per Anthropic guidance: tokens ≈ ceil((width * height) / 750),
 * capped at 1600 tokens per image.
 */
export const visionTokens = ({ width, height }: AnthropicVisionInput): number => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(
      `anthropicVisionTokens: width and height must be positive finite numbers, got ${width}x${height}.`,
    );
  }
  const raw = Math.ceil((width * height) / 750);
  return Math.min(raw, MAX_TOKENS);
};
