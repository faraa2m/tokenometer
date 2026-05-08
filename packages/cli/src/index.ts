#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { tokenizeMatrix, tokenizeMatrixEmpirical } from '@tokenometer/core';
import type { EmpiricalEnv } from '@tokenometer/core';
import { HELP_TEXT, parseArgs } from './args.js';
import { renderSummary, renderTable } from './render.js';

const VERSION = '0.0.2';

const readEnv = (): EmpiricalEnv => {
  const env: EmpiricalEnv = {};
  const { ANTHROPIC_API_KEY, GEMINI_API_KEY, GOOGLE_API_KEY } = process.env;
  if (ANTHROPIC_API_KEY) env.anthropicApiKey = ANTHROPIC_API_KEY;
  const googleKey = GOOGLE_API_KEY ?? GEMINI_API_KEY;
  if (googleKey) env.googleApiKey = googleKey;
  return env;
};

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
};

const readPrompt = async (paths: readonly string[]): Promise<string> => {
  if (paths.length === 0 || paths[0] === '-') {
    return readStdin();
  }
  const contents = await Promise.all(paths.map((p) => readFile(p, 'utf8')));
  return contents.join('\n');
};

export const main = async (argv: readonly string[]): Promise<number> => {
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n\n${HELP_TEXT}`);
    return 2;
  }

  if (parsed.help) {
    process.stdout.write(HELP_TEXT);
    return 0;
  }
  if (parsed.version) {
    process.stdout.write(`tokenometer ${VERSION}\n`);
    return 0;
  }

  let prompt: string;
  try {
    prompt = await readPrompt(parsed.inputPaths);
  } catch (err) {
    process.stderr.write(`Failed to read input: ${(err as Error).message}\n`);
    return 1;
  }

  if (!prompt.trim()) {
    process.stderr.write('Empty prompt — nothing to measure.\n');
    return 1;
  }

  const useEmpirical = parsed.empirical && !parsed.offline;
  const results = useEmpirical
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

  process.stdout.write(`${renderTable(results)}\n`);
  const summary = renderSummary(results);
  if (summary) process.stdout.write(`${summary}\n`);
  if (useEmpirical) {
    process.stdout.write(
      '\n(empirical: Anthropic / Google counts via provider countTokens API; OpenAI via tiktoken o200k_base)\n',
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
