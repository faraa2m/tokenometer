#!/usr/bin/env node
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  KNOWN_MODELS,
  RATES_VERSION,
  allFormats,
  tokenize,
  tokenizeEmpirical,
} from '@tokenometer/core';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(HERE, 'prompts');
const RESULTS_PATH = join(HERE, 'results.json');
const EMPIRICAL_PATH = join(HERE, 'empirical.json');

const loadPrompts = async () => {
  const files = (await readdir(PROMPTS_DIR)).filter((f) => !f.startsWith('.')).sort();
  const out = {};
  for (const file of files) {
    out[file] = await readFile(join(PROMPTS_DIR, file), 'utf8');
  }
  return out;
};

const parseModelFilter = (args) => {
  const env = process.env.BENCH_MODELS;
  if (env)
    return new Set(
      env
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  const flagIdx = args.findIndex((a) => a === '--models' || a === '--filter');
  if (flagIdx === -1 || !args[flagIdx + 1]) return null;
  return new Set(
    args[flagIdx + 1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
};

const selectModels = (filter) => {
  const all = [...KNOWN_MODELS].sort();
  if (!filter) return all;
  const selected = all.filter((m) => filter.has(m));
  if (selected.length === 0) {
    throw new Error(
      `No matching models. Filter: ${[...filter].join(', ')}. Available: ${all.join(', ')}`,
    );
  }
  return selected;
};

const buildResults = (prompts, models) => {
  const formats = [...allFormats()];
  const entries = {};
  for (const [name, prompt] of Object.entries(prompts).sort()) {
    const byModel = {};
    for (const modelId of models) {
      const byFormat = {};
      for (const format of formats) {
        const r = tokenize({ format, modelId, prompt });
        byFormat[format] = {
          approximate: r.approximate,
          inputCost: Number(r.inputCost.toFixed(8)),
          inputTokens: r.inputTokens,
          tokenizer: r.tokenizer,
        };
      }
      byModel[modelId] = byFormat;
    }
    entries[name] = byModel;
  }
  return {
    generatedAt: new Date().toISOString(),
    formats,
    models,
    prompts: entries,
    ratesVersion: RATES_VERSION,
    schemaVersion: 1,
  };
};

const writeResults = async (results) => {
  const json = `${JSON.stringify(results, null, 2)}\n`;
  await writeFile(RESULTS_PATH, json, 'utf8');
  console.log(
    `Wrote ${RESULTS_PATH} (${Object.keys(results.prompts).length} prompts × ${results.models.length} models × ${results.formats.length} formats).`,
  );
};

const compareResults = async (results) => {
  const onDisk = JSON.parse(await readFile(RESULTS_PATH, 'utf8'));
  const drift = [];
  for (const [name, byModel] of Object.entries(results.prompts)) {
    const onDiskByModel = onDisk.prompts[name];
    if (!onDiskByModel) {
      drift.push({ kind: 'new-prompt', name });
      continue;
    }
    for (const [modelId, byFormat] of Object.entries(byModel)) {
      const onDiskByFormat = onDiskByModel[modelId];
      if (!onDiskByFormat) {
        drift.push({ kind: 'new-model', model: modelId, name });
        continue;
      }
      for (const [format, computed] of Object.entries(byFormat)) {
        const stored = onDiskByFormat[format];
        if (!stored) {
          drift.push({ format, kind: 'new-format', model: modelId, name });
          continue;
        }
        if (
          stored.inputTokens !== computed.inputTokens ||
          Math.abs(stored.inputCost - computed.inputCost) > 1e-9
        ) {
          drift.push({
            computed,
            format,
            kind: 'drift',
            model: modelId,
            name,
            stored,
          });
        }
      }
    }
  }
  return { drift, onDisk };
};

const readEnv = () => {
  const env = {};
  if (process.env.ANTHROPIC_API_KEY) env.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (googleKey) env.googleApiKey = googleKey;
  return env;
};

const runEmpiricalSweep = async (prompts, env, models) => {
  const formats = [...allFormats()];
  const empirical = {};
  let totalCalls = 0;
  for (const [name, prompt] of Object.entries(prompts).sort()) {
    process.stderr.write(`${name} ... `);
    const byModel = {};
    for (const modelId of models) {
      const byFormat = {};
      for (const format of formats) {
        try {
          const r = await tokenizeEmpirical({ env, format, modelId, prompt });
          byFormat[format] = {
            inputCost: Number(r.inputCost.toFixed(8)),
            inputTokens: r.inputTokens,
            tokenizer: r.tokenizer,
          };
          totalCalls++;
        } catch (err) {
          byFormat[format] = { error: err.message };
        }
      }
      byModel[modelId] = byFormat;
    }
    empirical[name] = byModel;
    process.stderr.write('done\n');
  }
  return {
    empirical,
    formats,
    generatedAt: new Date().toISOString(),
    models,
    schemaVersion: 1,
    totalCalls,
  };
};

const computeDeltas = (offlineResults, empiricalResults) => {
  const rows = [];
  for (const [name, byModel] of Object.entries(empiricalResults.empirical)) {
    for (const [modelId, byFormat] of Object.entries(byModel)) {
      for (const [format, emp] of Object.entries(byFormat)) {
        if (emp.error) continue;
        const off = offlineResults.prompts[name]?.[modelId]?.[format];
        if (!off) continue;
        const delta = (emp.inputTokens - off.inputTokens) / off.inputTokens;
        rows.push({
          delta,
          empirical: emp.inputTokens,
          format,
          model: modelId,
          offline: off.inputTokens,
          prompt: name,
        });
      }
    }
  }
  return rows;
};

const summarizeByProvider = (rows) => {
  const byProvider = { anthropic: [], google: [], openai: [] };
  for (const row of rows) {
    if (row.model.startsWith('claude')) byProvider.anthropic.push(row);
    else if (row.model.startsWith('gemini')) byProvider.google.push(row);
    else byProvider.openai.push(row);
  }
  const summary = {};
  for (const [provider, list] of Object.entries(byProvider)) {
    if (list.length === 0) continue;
    const deltas = list.map((r) => r.delta);
    const sum = deltas.reduce((a, b) => a + b, 0);
    const sorted = [...deltas].sort((a, b) => a - b);
    summary[provider] = {
      avgDelta: sum / deltas.length,
      maxDelta: sorted[sorted.length - 1],
      medianDelta: sorted[Math.floor(sorted.length / 2)],
      minDelta: sorted[0],
      n: list.length,
    };
  }
  return summary;
};

const main = async () => {
  const args = process.argv.slice(2);
  const isRegenerate = args.includes('--regenerate');
  const isEmpirical = args.includes('--empirical');
  const filter = parseModelFilter(args);
  const models = selectModels(filter);
  if (filter) {
    console.error(`Filter active — sweeping ${models.length}/${KNOWN_MODELS.length} models.`);
  }
  const prompts = await loadPrompts();

  if (isEmpirical) {
    const env = readEnv();
    if (!env.anthropicApiKey && !env.googleApiKey) {
      console.error(
        'Empirical sweep needs ANTHROPIC_API_KEY and/or GOOGLE_API_KEY (or GEMINI_API_KEY).',
      );
      console.error('OpenAI path is offline (tiktoken) and runs without keys.');
      return 1;
    }
    const empResults = await runEmpiricalSweep(prompts, env, models);
    await writeFile(EMPIRICAL_PATH, `${JSON.stringify(empResults, null, 2)}\n`, 'utf8');
    console.log(`\nWrote ${EMPIRICAL_PATH} (${empResults.totalCalls} successful calls).`);

    const offline = JSON.parse(await readFile(RESULTS_PATH, 'utf8'));
    const deltas = computeDeltas(offline, empResults);
    const summary = summarizeByProvider(deltas);

    console.log('\nProvider deltas (empirical vs offline tokens):');
    for (const [provider, s] of Object.entries(summary)) {
      const fmt = (n) => `${(n * 100).toFixed(1)}%`;
      console.log(
        `  ${provider.padEnd(10)} n=${s.n.toString().padStart(3)}  median ${fmt(s.medianDelta).padStart(8)}  avg ${fmt(s.avgDelta).padStart(8)}  range [${fmt(s.minDelta)}, ${fmt(s.maxDelta)}]`,
      );
    }
    return 0;
  }

  const results = buildResults(prompts, models);

  if (isRegenerate) {
    await writeResults(results);
    return 0;
  }

  try {
    await readFile(RESULTS_PATH, 'utf8');
  } catch {
    console.error(`No checked-in ${RESULTS_PATH}. Run \`npm run benchmarks:regenerate\` first.`);
    return 1;
  }

  const { drift } = await compareResults(results);
  if (drift.length === 0) {
    console.log(
      `OK — ${Object.keys(prompts).length} prompts × ${results.models.length} models × ${results.formats.length} formats match results.json.`,
    );
    return 0;
  }
  console.error(`Drift detected (${drift.length} cells):`);
  for (const d of drift.slice(0, 20)) {
    if (d.kind === 'drift') {
      console.error(
        `  ${d.name} / ${d.model} / ${d.format}: tokens ${d.stored.inputTokens} → ${d.computed.inputTokens}, cost ${d.stored.inputCost} → ${d.computed.inputCost}`,
      );
    } else {
      console.error(`  ${d.kind}: ${JSON.stringify(d)}`);
    }
  }
  if (drift.length > 20) console.error(`  ... and ${drift.length - 20} more`);
  console.error(
    '\nIf the change is intentional (rate change, new prompt, new model), run `npm run benchmarks:regenerate`.',
  );
  return 1;
};

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
