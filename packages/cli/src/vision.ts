import { readFile } from 'node:fs/promises';
import {
  anthropicVisionTokens,
  getModel,
  googleVisionTokens,
  openaiVisionTokens,
} from '@tokenometer/core';
import type { Provider } from '@tokenometer/core';
import { imageSize } from 'image-size';

/**
 * Reads an image from disk and returns its width/height. Wrapped so tests
 * can mock by reading a deterministic dimension out of a synthetic file.
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

export type ImageSizeReader = (path: string) => Promise<ImageDimensions>;

export const defaultImageSizeReader: ImageSizeReader = async (path) => {
  const bytes = await readFile(path);
  const dim = imageSize(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  if (!dim.width || !dim.height) {
    throw new Error(`Could not read image dimensions from "${path}".`);
  }
  return { height: dim.height, width: dim.width };
};

/**
 * Compute vision tokens for one image × one model. Dispatch by the model's
 * registered provider. Throws a clear error when a provider doesn't support
 * vision (we'll need this when Mistral / Cohere lands).
 */
export const computeVisionTokens = (
  modelId: string,
  dim: ImageDimensions,
  imagePath: string,
): number => {
  const model = getModel(modelId);
  const provider: Provider = model.provider;
  switch (provider) {
    case 'anthropic':
      return anthropicVisionTokens(dim);
    case 'openai':
      return openaiVisionTokens(dim);
    case 'google':
      return googleVisionTokens(dim);
    default: {
      // Exhaustiveness — once we add Mistral / Cohere this surfaces a clear error.
      const exhaustiveCheck: never = provider;
      throw new Error(
        `Vision tokens are not supported for provider "${exhaustiveCheck}" (model "${modelId}", image "${imagePath}").`,
      );
    }
  }
};

export interface ResolvedImage {
  path: string;
  dim: ImageDimensions;
}

/**
 * Resolve all `--image` paths to dimensions in parallel. Reuses the file IO
 * once per image (we still re-dispatch per model since the formula differs).
 */
export const resolveImages = async (
  paths: readonly string[],
  reader: ImageSizeReader = defaultImageSizeReader,
): Promise<ResolvedImage[]> =>
  Promise.all(
    paths.map(async (path) => {
      const dim = await reader(path);
      return { dim, path };
    }),
  );
