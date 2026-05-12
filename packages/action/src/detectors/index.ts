import { detectAnnotations } from './annotation-detector.js';
import type { ExtractedPrompt, Sdk } from './extracted-prompt.js';
import { detectSdkPrompts } from './sdk-regex-detector.js';

export type CodeDetectionMode = 'off' | 'annotations' | 'sdk-regex' | 'both';

export interface DetectResult {
  prompts: ExtractedPrompt[];
  nonLiteralLocations: Array<{ file: string; line: number; sdk: Sdk }>;
}

export const detectPrompts = (
  content: string,
  file: string,
  mode: CodeDetectionMode,
  marker: string,
): DetectResult => {
  if (mode === 'off') return { prompts: [], nonLiteralLocations: [] };

  const prompts: ExtractedPrompt[] = [];
  let nonLiteralLocations: Array<{ file: string; line: number; sdk: Sdk }> = [];

  if (mode === 'annotations' || mode === 'both') {
    prompts.push(...detectAnnotations(content, file, { marker }));
  }
  if (mode === 'sdk-regex' || mode === 'both') {
    const sdkResult = detectSdkPrompts(content, file);
    prompts.push(...sdkResult.prompts);
    nonLiteralLocations = sdkResult.nonLiteralLocations;
  }
  return { prompts, nonLiteralLocations };
};

const SKIP_GLOBS: readonly RegExp[] = [
  /(^|\/)node_modules\//,
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /(^|\/)\.next\//,
  /(^|\/)vendor\//,
  /\.min\.(js|ts)$/,
];

const MAX_FILE_BYTES = 200_000;
const MAX_AVG_LINE_LEN = 500;

export const shouldSkipFile = (path: string, content: string): boolean => {
  for (const re of SKIP_GLOBS) {
    if (re.test(path)) return true;
  }
  if (Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) return true;
  const lines = content.split('\n');
  if (lines.length === 0) return false;
  const avg = content.length / lines.length;
  if (avg > MAX_AVG_LINE_LEN) return true;
  return false;
};

export { detectAnnotations } from './annotation-detector.js';
export { detectSdkPrompts, SDK_PATTERNS } from './sdk-regex-detector.js';
export type { SdkPattern } from './sdk-regex-detector.js';
export type { ExtractedPrompt, Sdk } from './extracted-prompt.js';
export { computeMatchId, findEnclosingFunction } from './extracted-prompt.js';
