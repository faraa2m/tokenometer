#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KNOWN_MODELS, getModel, getRate } from '../dist/rates.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'src', '__snapshots__', 'registry.json');

const snapshot = {
  generatedAt: new Date().toISOString(),
  models: KNOWN_MODELS.map((id) => {
    const r = getRate(id);
    const m = getModel(id);
    return {
      id,
      provider: m.provider,
      pricingSource: m.pricingSource ?? null,
      contextWindow: m.contextWindow ?? null,
      maxOutputTokens: m.maxOutputTokens ?? null,
      inputPer1k: r.inputPer1k,
      outputPer1k: r.outputPer1k,
      cachedInputPer1k: r.cachedInputPer1k ?? null,
    };
  }),
};

writeFileSync(OUT, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`Wrote ${OUT} (${snapshot.models.length} models).`);
