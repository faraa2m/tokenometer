import { createHash } from 'node:crypto';

export type Sdk = 'openai' | 'anthropic' | 'google' | 'mistral' | 'cohere';

export interface ExtractedPrompt {
  file: string;
  line: number;
  col: number;
  model?: string;
  text: string;
  source: 'annotation' | 'sdk-regex';
  sdk?: Sdk;
  matchId: string;
}

export const computeMatchId = (
  file: string,
  sdk: Sdk | 'annotation',
  enclosingHint: string,
): string => {
  const hash = createHash('sha1');
  hash.update(file);
  hash.update('\0');
  hash.update(sdk);
  hash.update('\0');
  hash.update(enclosingHint);
  return hash.digest('hex');
};

const FN_PATTERNS: readonly RegExp[] = [
  /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
  /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s+)?\(/,
  /^\s*(\w+)\s*[:=]\s*(?:async\s+)?\([^)]*\)\s*=>/,
  /^\s*(?:async\s+)?def\s+(\w+)/,
  /^\s*class\s+(\w+)/,
];

export const findEnclosingFunction = (lines: readonly string[], line: number): string => {
  const start = Math.max(0, Math.min(line - 1, lines.length - 1));
  for (let i = start; i >= 0; i--) {
    const raw = lines[i];
    if (raw === undefined) continue;
    for (const pattern of FN_PATTERNS) {
      const match = pattern.exec(raw);
      if (match?.[1]) return match[1];
    }
  }
  return 'top-level';
};
