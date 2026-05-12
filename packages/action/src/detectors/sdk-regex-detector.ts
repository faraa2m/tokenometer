import { computeMatchId, findEnclosingFunction } from './extracted-prompt.js';
import type { ExtractedPrompt, Sdk } from './extracted-prompt.js';

export interface SdkPattern {
  sdk: Sdk;
  regex: RegExp;
  modelHintRegex?: RegExp;
}

export const SDK_PATTERNS: readonly SdkPattern[] = [
  {
    sdk: 'anthropic',
    regex: /\b(?:anthropic|client)\s*\.\s*messages\s*\.\s*create\s*\(\s*\{([\s\S]*?)\}\s*\)/g,
    modelHintRegex: /model\s*[:=]\s*['"]([^'"]+)['"]/,
  },
  {
    sdk: 'openai',
    regex:
      /\b(?:openai|client)\s*\.\s*chat\s*\.\s*completions\s*\.\s*create\s*\(\s*\{([\s\S]*?)\}\s*\)/g,
    modelHintRegex: /model\s*[:=]\s*['"]([^'"]+)['"]/,
  },
  {
    sdk: 'openai',
    regex: /\b(?:openai|client)\s*\.\s*responses\s*\.\s*create\s*\(\s*\{([\s\S]*?)\}\s*\)/g,
    modelHintRegex: /model\s*[:=]\s*['"]([^'"]+)['"]/,
  },
  {
    sdk: 'google',
    regex: /\bmodel\s*\.\s*generateContent\s*\(\s*\{([\s\S]*?)\}\s*\)/g,
  },
  {
    sdk: 'mistral',
    regex:
      /\b(?:mistralClient|mistral|client)\s*\.\s*chat(?:\s*\.\s*complete)?\s*\(\s*\{([\s\S]*?)\}\s*\)/g,
    modelHintRegex: /model\s*[:=]\s*['"]([^'"]+)['"]/,
  },
  {
    sdk: 'cohere',
    regex: /\b(?:cohere|cohereClient|client)\s*\.\s*chat\s*\(\s*\{([\s\S]*?)\}\s*\)/g,
    modelHintRegex: /model\s*[:=]\s*['"]([^'"]+)['"]/,
  },
];

const KEYS_FOR_PROMPT = ['system', 'prompt', 'content', 'text', 'contents'] as const;

const INTERP_PLACEHOLDER = '__INTERP__';

interface ExtractedValue {
  text: string;
  isLiteral: boolean;
}

const extractKeyLiteral = (body: string, key: string): ExtractedValue | null => {
  const keyRe = new RegExp(`\\b${key}\\s*[:=]\\s*`, 'g');
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex.exec loop
  while ((match = keyRe.exec(body)) !== null) {
    const start = match.index + match[0].length;
    const rest = body.slice(start);
    const literal = readStringLiteral(rest);
    if (literal) return { text: literal, isLiteral: true };
    const next = rest.trim();
    if (next.length === 0) continue;
    if (next.startsWith('[') || next.startsWith('{')) continue;
    return { text: '', isLiteral: false };
  }
  return null;
};

const readStringLiteral = (text: string): string | null => {
  let i = 0;
  while (i < text.length && /\s/.test(text[i] ?? '')) i++;
  const quote = text[i];
  if (quote !== '"' && quote !== "'" && quote !== '`') return null;
  let j = i + 1;
  let escaped = false;
  while (j < text.length) {
    const c = text[j];
    if (escaped) {
      escaped = false;
      j++;
      continue;
    }
    if (c === '\\') {
      escaped = true;
      j++;
      continue;
    }
    if (c === quote) {
      const raw = text.slice(i + 1, j);
      if (quote === '`') return raw.replace(/\$\{[^}]*\}/g, INTERP_PLACEHOLDER);
      return raw;
    }
    j++;
  }
  return null;
};

const extractMessagesContents = (body: string): { literals: string[]; nonLiteralCount: number } => {
  const literals: string[] = [];
  let nonLiteralCount = 0;
  const re = /\bmessages\s*[:=]\s*\[([\s\S]*?)\]/g;
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex.exec loop
  while ((match = re.exec(body)) !== null) {
    const arr = match[1] ?? '';
    const contentRe = /\bcontent\s*[:=]\s*/g;
    let cMatch: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex.exec loop
    while ((cMatch = contentRe.exec(arr)) !== null) {
      const after = arr.slice(cMatch.index + cMatch[0].length);
      const literal = readStringLiteral(after);
      if (literal !== null) literals.push(literal);
      else nonLiteralCount++;
    }
  }
  return { literals, nonLiteralCount };
};

const lineColForOffset = (content: string, offset: number): { line: number; col: number } => {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content[i] === '\n') {
      line++;
      lastNewline = i;
    }
  }
  return { line, col: offset - lastNewline };
};

export interface SdkRegexResult {
  prompts: ExtractedPrompt[];
  nonLiteralLocations: Array<{ file: string; line: number; sdk: Sdk }>;
}

export const detectSdkPrompts = (content: string, file: string): SdkRegexResult => {
  const lines = content.split('\n');
  const prompts: ExtractedPrompt[] = [];
  const nonLiteralLocations: Array<{ file: string; line: number; sdk: Sdk }> = [];

  for (const pattern of SDK_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex.exec loop
    while ((match = pattern.regex.exec(content)) !== null) {
      const body = match[1] ?? '';
      const { line, col } = lineColForOffset(content, match.index);
      const enclosing = findEnclosingFunction(lines, line);
      const matchId = computeMatchId(file, pattern.sdk, enclosing);

      const modelHint = pattern.modelHintRegex?.exec(body)?.[1];

      let foundLiteral = false;
      let sawNonLiteral = false;

      for (const key of KEYS_FOR_PROMPT) {
        const extracted = extractKeyLiteral(body, key);
        if (!extracted) continue;
        if (!extracted.isLiteral) {
          sawNonLiteral = true;
          continue;
        }
        foundLiteral = true;
        const entry: ExtractedPrompt = {
          file,
          line,
          col,
          text: extracted.text,
          source: 'sdk-regex',
          sdk: pattern.sdk,
          matchId,
        };
        if (modelHint !== undefined) entry.model = modelHint;
        prompts.push(entry);
      }

      const msgs = extractMessagesContents(body);
      for (const text of msgs.literals) {
        foundLiteral = true;
        const entry: ExtractedPrompt = {
          file,
          line,
          col,
          text,
          source: 'sdk-regex',
          sdk: pattern.sdk,
          matchId,
        };
        if (modelHint !== undefined) entry.model = modelHint;
        prompts.push(entry);
      }
      if (msgs.nonLiteralCount > 0) sawNonLiteral = true;

      if (!foundLiteral && sawNonLiteral) {
        nonLiteralLocations.push({ file, line, sdk: pattern.sdk });
      }
    }
  }
  return { prompts, nonLiteralLocations };
};
