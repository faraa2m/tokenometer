#!/usr/bin/env node
// Weekly maintenance check:
//   1. Detect when a LOCAL_OVERRIDES entry has been picked up by tokenlens
//      upstream — once that happens, the local override should be deleted so
//      tokenometer tracks upstream changes automatically.
//   2. Detect upstream pricing/context drift on tokenlens-sourced models by
//      diffing the live registry against the checked-in snapshot.
//
// Exits non-zero on any finding so CI can open a tracking issue.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import anthropicProvider from '@tokenlens/models/anthropic';
import googleProvider from '@tokenlens/models/google';
import mistralProvider from '@tokenlens/models/mistral';
import openaiProvider from '@tokenlens/models/openai';
import { KNOWN_MODELS, getModel, getRate } from '../dist/rates.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(HERE, '..', 'src', '__snapshots__', 'registry.json');

const LOCAL_OVERRIDE_IDS = [
  'claude-fable-5',
  'claude-haiku-4-5',
  'claude-opus-4-7',
  'claude-opus-4-8',
  'claude-sonnet-4-6',
  'claude-sonnet-5',
  'command-a-03-2025',
  'command-r-08-2024',
  'command-r-plus-08-2024',
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5.4-nano',
  'gpt-5.5',
];

const PROVIDERS = {
  anthropic: anthropicProvider,
  google: googleProvider,
  mistral: mistralProvider,
  openai: openaiProvider,
};

const findUpstreamMatch = (overrideId) => {
  // Heuristic: match canonical Anthropic family ids like
  // "claude-opus-4-7-20260101" or "claude-opus-4-7" once tokenlens carries them.
  const matches = [];
  for (const [providerName, provider] of Object.entries(PROVIDERS)) {
    for (const upstreamId of Object.keys(provider.models ?? {})) {
      if (upstreamId === overrideId || upstreamId.startsWith(`${overrideId}-`)) {
        matches.push({ id: upstreamId, provider: providerName });
      }
    }
  }
  return matches;
};

const detectUpstreamLanding = () => {
  const findings = [];
  for (const id of LOCAL_OVERRIDE_IDS) {
    const matches = findUpstreamMatch(id);
    if (matches.length > 0) {
      findings.push({ kind: 'override-landed', id, matches });
    }
  }
  return findings;
};

const detectDrift = () => {
  let snapshot;
  try {
    snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
  } catch (err) {
    return [{ kind: 'snapshot-missing', message: err.message }];
  }

  const snapshotById = new Map(snapshot.models.map((m) => [m.id, m]));
  const findings = [];

  for (const id of KNOWN_MODELS) {
    const m = getModel(id);
    if (m.pricingSource !== 'tokenlens') continue;
    const stored = snapshotById.get(id);
    if (!stored) {
      findings.push({ kind: 'new-model', id });
      continue;
    }
    const r = getRate(id);
    const fields = {
      inputPer1k: r.inputPer1k,
      outputPer1k: r.outputPer1k,
      cachedInputPer1k: r.cachedInputPer1k ?? null,
      contextWindow: m.contextWindow ?? null,
      maxOutputTokens: m.maxOutputTokens ?? null,
    };
    for (const [k, v] of Object.entries(fields)) {
      if (stored[k] !== v) {
        findings.push({ kind: 'drift', id, field: k, stored: stored[k], current: v });
      }
    }
  }

  for (const stored of snapshot.models) {
    if (stored.pricingSource !== 'tokenlens') continue;
    if (!KNOWN_MODELS.includes(stored.id)) {
      findings.push({ kind: 'removed-model', id: stored.id });
    }
  }

  return findings;
};

const main = () => {
  const landed = detectUpstreamLanding();
  const drift = detectDrift();

  if (landed.length === 0 && drift.length === 0) {
    console.log(
      `OK — ${KNOWN_MODELS.length} models, ${LOCAL_OVERRIDE_IDS.length} overrides intact, snapshot in sync.`,
    );
    return 0;
  }

  if (landed.length > 0) {
    console.error('Upstream now ships these locally-overridden models:');
    for (const f of landed) {
      console.error(
        `  - ${f.id}: tokenlens has ${f.matches.map((m) => `${m.provider}:${m.id}`).join(', ')}`,
      );
      console.error(`    Action: delete LOCAL_OVERRIDES['${f.id}'] in packages/core/src/rates.ts.`);
    }
  }

  if (drift.length > 0) {
    console.error('\nRegistry drift vs snapshot:');
    for (const f of drift.slice(0, 30)) {
      if (f.kind === 'drift') {
        console.error(
          `  - ${f.id}.${f.field}: ${JSON.stringify(f.stored)} → ${JSON.stringify(f.current)}`,
        );
      } else {
        console.error(`  - ${f.kind}: ${f.id ?? f.message}`);
      }
    }
    if (drift.length > 30) console.error(`  ... and ${drift.length - 30} more`);
    console.error(
      '\nAction: review changes, then run `npm run snapshot:registry --workspace=@tokenometer/core` and commit the updated snapshot.',
    );
  }

  return 1;
};

process.exit(main());
