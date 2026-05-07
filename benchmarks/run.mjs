#!/usr/bin/env node
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KNOWN_MODELS, RATES_VERSION, allFormats, tokenize } from '@tokenometer/core';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(HERE, 'prompts');
const RESULTS_PATH = join(HERE, 'results.json');

const loadPrompts = async () => {
  const files = (await readdir(PROMPTS_DIR)).filter((f) => !f.startsWith('.')).sort();
  const out = {};
  for (const file of files) {
    out[file] = await readFile(join(PROMPTS_DIR, file), 'utf8');
  }
  return out;
};

const buildResults = (prompts) => {
  const formats = [...allFormats()];
  const models = [...KNOWN_MODELS].sort();
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

const main = async () => {
  const args = process.argv.slice(2);
  const mode = args.includes('--regenerate') ? 'regenerate' : 'check';
  const prompts = await loadPrompts();
  const results = buildResults(prompts);

  if (mode === 'regenerate') {
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
