import { readFile } from 'node:fs/promises';
import { type TokenometerConfig, parseConfig } from '@tokenometer/core';
import type { ParsedArgs } from './args.js';

export interface ApplyConfigOptions {
  /** Pre-loaded config (already parsed). When omitted, applyConfig is a no-op. */
  config: TokenometerConfig | null;
}

/**
 * Apply config defaults to ParsedArgs.
 * User-passed flags ALWAYS win over config (we only fill in fields the user did not set).
 * Returns a new ParsedArgs (does not mutate the input).
 */
export const applyConfig = (args: ParsedArgs, opts: ApplyConfigOptions): ParsedArgs => {
  const cfg = opts.config;
  if (!cfg) return args;
  const next: ParsedArgs = { ...args, formats: [...args.formats], modelIds: [...args.modelIds] };
  // When the config provides a value AND the user didn't pass it on the CLI,
  // adopt the config value AND set the *Set flag so downstream auto-detect
  // doesn't overwrite the config-provided default.
  if (!args.modelsSet && cfg.models && cfg.models.length > 0) {
    next.modelIds = [...cfg.models];
    next.modelsSet = true;
  }
  if (!args.formatsSet && cfg.formats && cfg.formats.length > 0) {
    next.formats = [...cfg.formats];
    next.formatsSet = true;
  }
  if (!args.inputPathsSet && cfg.paths && cfg.paths.length > 0) {
    next.inputPaths = [...cfg.paths];
    next.inputPathsSet = true;
  }
  return next;
};

/**
 * Read a config from a user-specified path (used by `--config <path>`).
 * Throws on parse / validation failure with the offending path included.
 */
export const loadConfigFromPath = async (path: string): Promise<TokenometerConfig> => {
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read config "${path}": ${(err as Error).message}`);
  }
  try {
    return parseConfig(text);
  } catch (err) {
    throw new Error(`Invalid config at "${path}": ${(err as Error).message}`);
  }
};
