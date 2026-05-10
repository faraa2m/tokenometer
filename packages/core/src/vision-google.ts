export interface GoogleVisionInput {
  width: number;
  height: number;
  /** Google's estimator does not branch on detail; accepted for API parity. */
  detail?: 'low' | 'high' | 'auto';
}

const SMALL_THRESHOLD = 384;
const SMALL_TOKENS = 258;
const TILE_SIZE = 768;

/**
 * Google (Gemini) vision token estimator.
 *
 * Per Google guidance:
 * - Images ≤ 384×384 cost a flat 258 tokens.
 * - Larger images: 258 * ceil(width/768) * ceil(height/768), with a floor of 1 tile per axis.
 */
export const visionTokens = ({ width, height }: GoogleVisionInput): number => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(
      `googleVisionTokens: width and height must be positive finite numbers, got ${width}x${height}.`,
    );
  }
  if (width <= SMALL_THRESHOLD && height <= SMALL_THRESHOLD) return SMALL_TOKENS;
  const tilesX = Math.max(1, Math.ceil(width / TILE_SIZE));
  const tilesY = Math.max(1, Math.ceil(height / TILE_SIZE));
  return SMALL_TOKENS * tilesX * tilesY;
};
