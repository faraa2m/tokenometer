export interface OpenAIVisionInput {
  width: number;
  height: number;
  /** OpenAI vision detail; defaults to 'high' if omitted. 'auto' resolves to 'high'. */
  detail?: 'low' | 'high' | 'auto';
}

const LOW_DETAIL_TOKENS = 85;
const HIGH_DETAIL_BASE = 85;
const HIGH_DETAIL_PER_TILE = 170;
const LONGEST_CAP = 2048;
const SHORTEST_CAP = 768;
const TILE_SIZE = 512;

/**
 * OpenAI vision token estimator.
 *
 * - 'low' detail: flat 85 tokens.
 * - 'high'/'auto' detail (default): resize so the longest side is at most 2048,
 *   then so the shortest side is at most 768; tile the result by 512×512;
 *   total = 85 + 170 * tiles.
 */
export const visionTokens = ({ width, height, detail = 'high' }: OpenAIVisionInput): number => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(
      `openaiVisionTokens: width and height must be positive finite numbers, got ${width}x${height}.`,
    );
  }
  if (detail === 'low') return LOW_DETAIL_TOKENS;

  let w = width;
  let h = height;

  // Step 1: cap the longest side at 2048, preserving aspect ratio.
  const longest = Math.max(w, h);
  if (longest > LONGEST_CAP) {
    const scale = LONGEST_CAP / longest;
    w = w * scale;
    h = h * scale;
  }

  // Step 2: scale so the shortest side is at most 768, preserving aspect ratio.
  const shortest = Math.min(w, h);
  if (shortest > SHORTEST_CAP) {
    const scale = SHORTEST_CAP / shortest;
    w = w * scale;
    h = h * scale;
  }

  const tilesX = Math.ceil(w / TILE_SIZE);
  const tilesY = Math.ceil(h / TILE_SIZE);
  const tiles = tilesX * tilesY;
  return HIGH_DETAIL_BASE + HIGH_DETAIL_PER_TILE * tiles;
};
