#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  type TokenometerFileResult,
  type TokenometerResult,
  getModel,
  getRate,
  loadConfig,
  measureLatency,
  toSarif,
  tokenizeMatrix,
  tokenizeMatrixEmpirical,
} from '@tokenometer/core';
import type {
  EmpiricalEnv,
  Format,
  LatencyResult,
  MeasureLatencyOptions,
  TokenizeResult,
} from '@tokenometer/core';
import { HELP_TEXT, type ParsedArgs, parseArgs } from './args.js';
import { autoDetectDefaultModel } from './auto-detect.js';
import { applyConfig, loadConfigFromPath } from './config-merge.js';
import { renderByFile, renderModelLimits, renderSummary, renderTable } from './render.js';
import {
  type ImageSizeReader,
  computeVisionTokens,
  defaultImageSizeReader,
  resolveImages,
} from './vision.js';

const VERSION = '0.0.2';

const readEnv = (): EmpiricalEnv => {
  const env: EmpiricalEnv = {};
  const {
    ANTHROPIC_API_KEY,
    COHERE_API_KEY,
    GEMINI_API_KEY,
    GOOGLE_API_KEY,
    MISTRAL_API_KEY,
    OPENAI_API_KEY,
  } = process.env;
  if (ANTHROPIC_API_KEY) env.anthropicApiKey = ANTHROPIC_API_KEY;
  if (COHERE_API_KEY) env.cohereApiKey = COHERE_API_KEY;
  const googleKey = GOOGLE_API_KEY ?? GEMINI_API_KEY;
  if (googleKey) env.googleApiKey = googleKey;
  if (MISTRAL_API_KEY) env.mistralApiKey = MISTRAL_API_KEY;
  if (OPENAI_API_KEY) env.openaiApiKey = OPENAI_API_KEY;
  return env;
};

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
};

const readJoinedPrompt = async (paths: readonly string[]): Promise<string> => {
  if (paths.length === 0 || paths[0] === '-') {
    return readStdin();
  }
  const contents = await Promise.all(paths.map((p) => readFile(p, 'utf8')));
  return contents.join('\n');
};

const readPerFilePrompts = async (
  paths: readonly string[],
): Promise<{ path: string; prompt: string }[]> => {
  if (paths.length === 0 || paths[0] === '-') {
    const prompt = await readStdin();
    return [{ path: '-', prompt }];
  }
  return Promise.all(
    paths.map(async (path) => {
      const prompt = await readFile(path, 'utf8');
      return { path, prompt };
    }),
  );
};

/** Test seam for `measureLatency`; production code uses the SDK-backed default. */
export type MeasureLatencyFn = (options: MeasureLatencyOptions) => Promise<LatencyResult>;

interface RunDeps {
  imageSizeReader?: ImageSizeReader;
  measureLatencyFn?: MeasureLatencyFn;
  stderr?: NodeJS.WriteStream;
  stdout?: NodeJS.WriteStream;
}

/**
 * For each cell, run a real streaming generation and attach the resulting
 * `LatencyResult` in-place. Skips cells whose provider doesn't yet support
 * the latency path (currently: none — all 5 do).
 */
const augmentWithLatency = async (
  cells: TokenizeResult[],
  prompt: string,
  parsed: ParsedArgs,
  measure: MeasureLatencyFn,
): Promise<void> => {
  // Sequential (not parallel) so we don't slam a single provider with N
  // concurrent metered requests; rate-limits are real.
  for (const cell of cells) {
    cell.latency = await measure({
      env: readEnv(),
      modelId: cell.model,
      prompt,
      trials: parsed.latencyTrials,
    });
  }
};

const buildPerFileResults = async (
  parsed: ParsedArgs,
  useEmpirical: boolean,
  measureLatencyFn: MeasureLatencyFn | undefined,
): Promise<TokenometerFileResult[]> => {
  const inputs = await readPerFilePrompts(parsed.inputPaths);
  const out: TokenometerFileResult[] = [];
  for (const { path, prompt } of inputs) {
    if (!prompt.trim()) continue;
    const cells: TokenizeResult[] = useEmpirical
      ? await tokenizeMatrixEmpirical({
          env: readEnv(),
          formats: parsed.formats,
          modelIds: parsed.modelIds,
          prompt,
        })
      : tokenizeMatrix({
          formats: parsed.formats,
          modelIds: parsed.modelIds,
          prompt,
        });
    if (parsed.latency) {
      await augmentWithLatency(cells, prompt, parsed, measureLatencyFn ?? measureLatency);
    }
    out.push({ path, results: cells });
  }
  return out;
};

const buildImageResults = async (
  parsed: ParsedArgs,
  reader: ImageSizeReader,
): Promise<TokenometerFileResult[]> => {
  if (parsed.imagePaths.length === 0) return [];
  const resolved = await resolveImages(parsed.imagePaths, reader);
  const results: TokenometerFileResult[] = [];
  for (const img of resolved) {
    const cells: TokenizeResult[] = parsed.modelIds.map((modelId) => {
      const tokens = computeVisionTokens(modelId, img.dim, img.path);
      return makeVisionCell(modelId, tokens);
    });
    results.push({ path: `${img.path} [vision]`, results: cells });
  }
  return results;
};

const makeVisionCell = (modelId: string, tokens: number): TokenizeResult => {
  // Vision tokens are formula-derived; we fold them under format='text' as a
  // neutral synthetic axis (vision is format-agnostic).
  const rate = getRate(modelId);
  const provider = getModel(modelId).provider;
  return {
    approximate: true,
    format: 'text' as Format,
    inputCost: (tokens / 1000) * rate.inputPer1k,
    inputTokens: tokens,
    model: modelId,
    provider,
    tokenizer: 'heuristic',
  };
};

export const main = async (argv: readonly string[], deps: RunDeps = {}): Promise<number> => {
  const stdout = deps.stdout ?? process.stdout;
  const stderr = deps.stderr ?? process.stderr;
  const reader = deps.imageSizeReader ?? defaultImageSizeReader;

  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(argv);
  } catch (err) {
    stderr.write(`${(err as Error).message}\n\n${HELP_TEXT}`);
    return 2;
  }

  if (parsed.help) {
    stdout.write(HELP_TEXT);
    return 0;
  }
  if (parsed.version) {
    stdout.write(`tokenometer ${VERSION}\n`);
    return 0;
  }

  // Apply config defaults (before auto-detect).
  if (!parsed.noConfig) {
    try {
      if (parsed.configPath) {
        const cfg = await loadConfigFromPath(parsed.configPath);
        parsed = applyConfig(parsed, { config: cfg });
      } else {
        const cfg = await loadConfig();
        parsed = applyConfig(parsed, { config: cfg });
      }
    } catch (err) {
      stderr.write(`${(err as Error).message}\n`);
      return 1;
    }
  }

  // Auto-detect default model when neither user nor config set --model.
  if (!parsed.modelsSet) {
    const detected = autoDetectDefaultModel();
    parsed.modelIds = [detected.modelId];
    if (detected.note) stderr.write(`${detected.note}\n`);
  }

  // Validate that we have at least one input source. (Prompt files may come
  // from positional args or config.paths; images are optional but if they're
  // the only input, that's a misuse.)
  if (parsed.inputPaths.length === 0 && parsed.imagePaths.length === 0) {
    stderr.write('No input files. Pass a path, "-" for stdin, or set paths in .tokenometer.yml.\n');
    return 1;
  }

  const useEmpirical = parsed.empirical && !parsed.offline;

  // For json/sarif output, we MUST have per-file results.
  // For table output, if --by-file or --image is on, we need per-file too.
  // Otherwise the existing joined-prompt path is used.
  if (parsed.output === 'json' || parsed.output === 'sarif') {
    const fileResults =
      parsed.inputPaths.length > 0
        ? await buildPerFileResults(parsed, useEmpirical, deps.measureLatencyFn)
        : [];
    const imageResults = await buildImageResults(parsed, reader);
    const result: TokenometerResult = { files: [...fileResults, ...imageResults] };
    if (result.files.length === 0) {
      stderr.write('Empty prompt — nothing to measure.\n');
      return 1;
    }
    if (parsed.output === 'json') {
      stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      const sarif = toSarif(result, { toolVersion: VERSION });
      stdout.write(`${JSON.stringify(sarif, null, 2)}\n`);
    }
    return 0;
  }

  // Table output path.
  let prompt = '';
  if (parsed.inputPaths.length > 0) {
    try {
      prompt = await readJoinedPrompt(parsed.inputPaths);
    } catch (err) {
      stderr.write(`Failed to read input: ${(err as Error).message}\n`);
      return 1;
    }
  }

  // Allow image-only invocation when there are no prompt files.
  if (parsed.inputPaths.length > 0 && !prompt.trim()) {
    stderr.write('Empty prompt — nothing to measure.\n');
    return 1;
  }

  let mainResults: TokenizeResult[] = [];
  if (parsed.inputPaths.length > 0) {
    mainResults = useEmpirical
      ? await tokenizeMatrixEmpirical({
          env: readEnv(),
          formats: parsed.formats,
          modelIds: parsed.modelIds,
          prompt,
        })
      : tokenizeMatrix({
          formats: parsed.formats,
          modelIds: parsed.modelIds,
          prompt,
        });
    if (parsed.latency) {
      await augmentWithLatency(
        mainResults,
        prompt,
        parsed,
        deps.measureLatencyFn ?? measureLatency,
      );
    }
  }

  // Compute image rows up front (needed for main table appendage and by-file).
  const imageFileResults = await buildImageResults(parsed, reader);
  const imageCells = imageFileResults.flatMap((f) => f.results);
  const allMainCells: TokenizeResult[] = [...mainResults, ...imageCells];

  stdout.write(`${renderTable(allMainCells)}\n`);
  const limits = renderModelLimits(allMainCells);
  if (limits) stdout.write(`${limits}\n`);
  const summary = renderSummary(allMainCells);
  if (summary) stdout.write(`${summary}\n`);

  // by-file table requires per-file results from prompt files plus image virtual files.
  if (parsed.byFile) {
    const perFile =
      parsed.inputPaths.length > 0
        ? await buildPerFileResults(parsed, useEmpirical, deps.measureLatencyFn)
        : [];
    const allFiles = [...perFile, ...imageFileResults];
    const byFile = renderByFile(allFiles);
    if (byFile) stdout.write(`${byFile}\n`);
  }

  if (useEmpirical) {
    stdout.write(
      '\n(empirical: Anthropic / Google counts via provider countTokens API; OpenAI via tiktoken o200k_base)\n',
    );
  }
  if (parsed.latency) {
    stdout.write(
      `(latency: ${parsed.latencyTrials} streaming generation${parsed.latencyTrials === 1 ? '' : 's'} per cell, max_tokens=200; p50/p95/mean over trials)\n`,
    );
  }
  return 0;
};

const isInvokedAsScript = (): boolean => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return pathToFileURL(realpathSync(entry)).href === import.meta.url;
  } catch {
    return false;
  }
};

if (isInvokedAsScript()) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err: unknown) => {
      process.stderr.write(`Unexpected error: ${(err as Error).stack ?? String(err)}\n`);
      process.exit(1);
    },
  );
}
