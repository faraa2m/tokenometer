import { computeMatchId, findEnclosingFunction } from './extracted-prompt.js';
import type { ExtractedPrompt } from './extracted-prompt.js';

const INTERP_PLACEHOLDER = '__INTERP__';

interface AnnotationHit {
  line: number;
  col: number;
  model?: string;
}

const parseAnnotationMeta = (rest: string): { model?: string } => {
  const out: { model?: string } = {};
  const modelMatch = /\bmodel\s*[:=]\s*"?'?([\w.\-:/]+)/.exec(rest);
  if (modelMatch?.[1]) out.model = modelMatch[1];
  return out;
};

const findAnnotations = (lines: readonly string[], marker: string): AnnotationHit[] => {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${escaped}([^\\n\\r]*)`);
  const hits: AnnotationHit[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;
    const idx = raw.indexOf(marker);
    if (idx < 0) continue;
    const prefix = raw.slice(0, idx);
    const looksLikeComment =
      /(\/\/|#|\*|"""|''')/.test(prefix) || /^\s*\*/.test(raw) || /^\s*#/.test(raw);
    if (!looksLikeComment) continue;
    const match = re.exec(raw);
    if (!match) continue;
    const meta = parseAnnotationMeta(match[1] ?? '');
    const hit: AnnotationHit = { line: i + 1, col: idx + 1 };
    if (meta.model !== undefined) hit.model = meta.model;
    hits.push(hit);
  }
  return hits;
};

const stripCommentLine = (line: string): string =>
  line
    .replace(/\/\/.*$/, '')
    .replace(/\/\*.*?\*\//g, '')
    .replace(/^\s*\*.*$/, '')
    .replace(/#.*$/, '');

interface ExtractedLiteral {
  line: number;
  col: number;
  text: string;
}

const findNextLiteral = (lines: readonly string[], startLine: number): ExtractedLiteral | null => {
  const windowEnd = Math.min(lines.length, startLine + 16);
  for (let i = startLine; i < windowEnd; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;
    const stripped = stripCommentLine(raw);

    const tripleMatch = /(?:f|F|r|R|rb|br|b|B)?("""|''')/.exec(stripped);
    if (tripleMatch) {
      const quote = tripleMatch[1] as string;
      const startCol = raw.indexOf(quote);
      const startQuoteIdx = stripped.indexOf(quote);
      const afterQuote = stripped.slice(startQuoteIdx + 3);
      const closingIdx = afterQuote.indexOf(quote);
      if (closingIdx >= 0) {
        const text = afterQuote.slice(0, closingIdx).replace(/\{[^}]*\}/g, INTERP_PLACEHOLDER);
        return { line: i + 1, col: startCol + 1, text };
      }
      const buf: string[] = [afterQuote];
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j];
        if (next === undefined) continue;
        const closeIdx = next.indexOf(quote);
        if (closeIdx >= 0) {
          buf.push(next.slice(0, closeIdx));
          const text = buf.join('\n').replace(/\{[^}]*\}/g, INTERP_PLACEHOLDER);
          return { line: i + 1, col: startCol + 1, text };
        }
        buf.push(next);
      }
      return null;
    }

    const backtickIdx = stripped.indexOf('`');
    if (backtickIdx >= 0) {
      const fromBacktick = stripped.slice(backtickIdx + 1);
      const closeIdx = fromBacktick.indexOf('`');
      if (closeIdx >= 0) {
        const text = fromBacktick.slice(0, closeIdx).replace(/\$\{[^}]*\}/g, INTERP_PLACEHOLDER);
        return { line: i + 1, col: backtickIdx + 1, text };
      }
      const buf: string[] = [fromBacktick];
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j];
        if (next === undefined) continue;
        const ci = next.indexOf('`');
        if (ci >= 0) {
          buf.push(next.slice(0, ci));
          const text = buf.join('\n').replace(/\$\{[^}]*\}/g, INTERP_PLACEHOLDER);
          return { line: i + 1, col: backtickIdx + 1, text };
        }
        buf.push(next);
      }
      return null;
    }

    const literal = scanSingleQuotedLiteral(stripped);
    if (literal) {
      const colOffset = raw.indexOf(literal.raw);
      const col = colOffset >= 0 ? colOffset + 1 : 1;
      const text = literal.isFString
        ? literal.text.replace(/\{[^}]*\}/g, INTERP_PLACEHOLDER)
        : literal.text;
      return { line: i + 1, col, text };
    }
  }
  return null;
};

interface ScannedLiteral {
  raw: string;
  text: string;
  isFString: boolean;
}

const scanSingleQuotedLiteral = (line: string): ScannedLiteral | null => {
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch !== '"' && ch !== "'") continue;
    const prev = i > 0 ? line[i - 1] : '';
    const isFString = prev === 'f' || prev === 'F';
    let j = i + 1;
    let escaped = false;
    while (j < line.length) {
      const c = line[j];
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
      if (c === ch) {
        const text = line.slice(i + 1, j);
        const raw = line.slice(i, j + 1);
        return { raw, text, isFString };
      }
      j++;
    }
  }
  return null;
};

export interface AnnotationDetectorOptions {
  marker: string;
}

export const detectAnnotations = (
  content: string,
  file: string,
  options: AnnotationDetectorOptions,
): ExtractedPrompt[] => {
  const lines = content.split('\n');
  const hits = findAnnotations(lines, options.marker);
  const out: ExtractedPrompt[] = [];
  for (const hit of hits) {
    const literal = findNextLiteral(lines, hit.line);
    if (!literal) continue;
    const enclosing = findEnclosingFunction(lines, literal.line);
    const matchId = computeMatchId(file, 'annotation', enclosing);
    const entry: ExtractedPrompt = {
      file,
      line: literal.line,
      col: literal.col,
      text: literal.text,
      source: 'annotation',
      matchId,
    };
    if (hit.model !== undefined) entry.model = hit.model;
    out.push(entry);
  }
  return out;
};
