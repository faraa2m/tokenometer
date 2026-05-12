import { type Format, tokenize } from '@tokenometer/core';
import type { ExtractedPrompt } from './detectors/extracted-prompt.js';

export interface CodePromptRow {
  location: string;
  model: string;
  baseTokens: number;
  headTokens: number;
  baseCost: number;
  headCost: number;
  costDelta: number;
}

const FALLBACK_MATCH_RATIO = 0.6;

const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const lenA = a.length;
  const lenB = b.length;
  let prev = new Array<number>(lenB + 1);
  let curr = new Array<number>(lenB + 1);
  for (let j = 0; j <= lenB; j++) prev[j] = j;
  for (let i = 1; i <= lenA; i++) {
    curr[0] = i;
    for (let j = 1; j <= lenB; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min((curr[j - 1] ?? 0) + 1, (prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[lenB] ?? 0;
};

const similarity = (a: string, b: string): number => {
  if (a.length === 0 && b.length === 0) return 1;
  const dist = levenshtein(a, b);
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - dist / max;
};

const pickModel = (prompt: ExtractedPrompt, defaultModels: readonly string[]): string => {
  if (prompt.model) return prompt.model;
  const first = defaultModels[0];
  if (!first) throw new Error('measureExtractedPrompts: defaultModels must have at least 1 entry');
  return first;
};

const measureCost = (
  text: string,
  modelId: string,
  format: Format,
): { tokens: number; cost: number } => {
  if (text.length === 0) return { tokens: 0, cost: 0 };
  try {
    const r = tokenize({ format, modelId, prompt: text });
    return { tokens: r.inputTokens, cost: r.inputCost };
  } catch {
    return { tokens: 0, cost: 0 };
  }
};

const formatLocation = (p: ExtractedPrompt): string => `${p.file}:${p.line}`;

interface MatchPair {
  base: ExtractedPrompt | null;
  head: ExtractedPrompt | null;
}

const pairPrompts = (
  base: readonly ExtractedPrompt[],
  head: readonly ExtractedPrompt[],
): MatchPair[] => {
  const pairs: MatchPair[] = [];
  const baseByMatchId = new Map<string, ExtractedPrompt[]>();
  for (const p of base) {
    const list = baseByMatchId.get(p.matchId) ?? [];
    list.push(p);
    baseByMatchId.set(p.matchId, list);
  }

  const headUnmatched: ExtractedPrompt[] = [];
  for (const h of head) {
    const candidates = baseByMatchId.get(h.matchId);
    if (candidates && candidates.length > 0) {
      const b = candidates.shift();
      if (b) {
        pairs.push({ base: b, head: h });
        continue;
      }
    }
    headUnmatched.push(h);
  }

  const baseUnmatched: ExtractedPrompt[] = [];
  for (const list of baseByMatchId.values()) baseUnmatched.push(...list);

  const headByFile = new Map<string, ExtractedPrompt[]>();
  for (const h of headUnmatched) {
    const list = headByFile.get(h.file) ?? [];
    list.push(h);
    headByFile.set(h.file, list);
  }

  for (const b of baseUnmatched) {
    const candidates = headByFile.get(b.file);
    if (!candidates || candidates.length === 0) {
      pairs.push({ base: b, head: null });
      continue;
    }
    let bestIdx = -1;
    let bestScore = FALLBACK_MATCH_RATIO;
    for (let i = 0; i < candidates.length; i++) {
      const h = candidates[i];
      if (!h) continue;
      const score = similarity(b.text, h.text);
      if (score >= bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      const h = candidates.splice(bestIdx, 1)[0];
      if (h) {
        pairs.push({ base: b, head: h });
        continue;
      }
    }
    pairs.push({ base: b, head: null });
  }

  for (const list of headByFile.values()) {
    for (const h of list) pairs.push({ base: null, head: h });
  }

  return pairs;
};

export const measureExtractedPrompts = (
  base: readonly ExtractedPrompt[],
  head: readonly ExtractedPrompt[],
  defaultModels: readonly string[],
  _formats: readonly Format[],
): CodePromptRow[] => {
  if (defaultModels.length === 0) return [];
  const format: Format = 'text';

  const pairs = pairPrompts(base, head);
  const rows: CodePromptRow[] = [];

  for (const pair of pairs) {
    const sample = pair.head ?? pair.base;
    if (!sample) continue;
    const model = pickModel(sample, defaultModels);
    const headMeasure = pair.head
      ? measureCost(pair.head.text, model, format)
      : { tokens: 0, cost: 0 };
    const baseMeasure = pair.base
      ? measureCost(pair.base.text, model, format)
      : { tokens: 0, cost: 0 };

    const location = formatLocation(sample);
    rows.push({
      location,
      model,
      baseTokens: baseMeasure.tokens,
      headTokens: headMeasure.tokens,
      baseCost: baseMeasure.cost,
      headCost: headMeasure.cost,
      costDelta: headMeasure.cost - baseMeasure.cost,
    });
  }

  return rows;
};
