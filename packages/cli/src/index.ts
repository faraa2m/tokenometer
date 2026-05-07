#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { tokenizeMatrix } from '@tokenometer/core';
import { HELP_TEXT, parseArgs } from './args.js';
import { renderSummary, renderTable } from './render.js';

const VERSION = '0.0.1';

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

  if (parsed.empirical && !parsed.offline) {
    process.stderr.write(
      'Empirical mode is not yet implemented in v0.0.1. Falling back to estimated mode.\n',
    );
  }

  const results = tokenizeMatrix({
    formats: parsed.formats,
    modelIds: parsed.modelIds,
    prompt,
  });

  process.stdout.write(`${renderTable(results)}\n`);
  const summary = renderSummary(results);
  if (summary) process.stdout.write(`${summary}\n`);
  return 0;
};

const scriptUrl = `file://${process.argv[1]}`;
if (import.meta.url === scriptUrl) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err: unknown) => {
      process.stderr.write(`Unexpected error: ${(err as Error).stack ?? String(err)}\n`);
      process.exit(1);
    },
  );
}
