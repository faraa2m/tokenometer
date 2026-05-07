import { isFormat, allFormats, KNOWN_MODELS } from '@tokenometer/core';
import type { Format } from '@tokenometer/core';

export interface ParsedArgs {
  empirical: boolean;
  formats: Format[];
  help: boolean;
  inputPaths: string[];
  maxSpend: number;
  modelIds: string[];
  offline: boolean;
  version: boolean;
}

export const HELP_TEXT = `tokenometer — empirical token-cost benchmarking for LLM prompts

USAGE
  tokenometer <file> [options]
  echo "prompt" | tokenometer - [options]

OPTIONS
  --model <id[,id...]>     Comma-separated model ids (default: claude-opus-4-7).
                           Known: ${KNOWN_MODELS.join(', ')}
  --format <fmt[,fmt...]>  Comma-separated formats (default: all).
                           Known: ${allFormats().join(', ')}
  --empirical              Run sample API calls and report real charges.
                           Requires the matching <PROVIDER>_API_KEY env var.
  --max-spend <usd>        Hard ceiling for empirical mode (default: 0.05).
  --offline                Force offline mode (overrides --empirical).
  -h, --help               Show this help.
  -v, --version            Show CLI version.

EXAMPLES
  tokenometer ./prompt.md
  tokenometer ./prompt.md --model claude-opus-4-7,gpt-4o
  tokenometer ./prompt.md --format yaml,json --empirical --max-spend 0.01
`;

const DEFAULT_MODELS = ['claude-opus-4-7'];
const DEFAULT_MAX_SPEND_USD = 0.05;

export const parseArgs = (argv: readonly string[]): ParsedArgs => {
  const result: ParsedArgs = {
    empirical: false,
    formats: [...allFormats()],
    help: false,
    inputPaths: [],
    maxSpend: DEFAULT_MAX_SPEND_USD,
    modelIds: [...DEFAULT_MODELS],
    offline: false,
    version: false,
  };

  let modelsSet = false;
  let formatsSet = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;
    if (arg === '-h' || arg === '--help') {
      result.help = true;
      continue;
    }
    if (arg === '-v' || arg === '--version') {
      result.version = true;
      continue;
    }
    if (arg === '--empirical') {
      result.empirical = true;
      continue;
    }
    if (arg === '--offline') {
      result.offline = true;
      continue;
    }
    if (arg === '--model') {
      const next = argv[++i];
      if (!next) throw new Error('--model requires a value');
      result.modelIds = next
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      modelsSet = true;
      continue;
    }
    if (arg === '--format') {
      const next = argv[++i];
      if (!next) throw new Error('--format requires a value');
      const formats = next
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const fmt of formats) {
        if (!isFormat(fmt)) {
          throw new Error(
            `Unknown format "${fmt}". Known: ${allFormats().join(', ')}.`,
          );
        }
      }
      result.formats = formats as Format[];
      formatsSet = true;
      continue;
    }
    if (arg === '--max-spend') {
      const next = argv[++i];
      if (!next) throw new Error('--max-spend requires a value');
      const parsed = Number.parseFloat(next);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`--max-spend must be a positive number, got "${next}".`);
      }
      result.maxSpend = parsed;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}`);
    }
    result.inputPaths.push(arg);
  }

  if (!modelsSet && result.modelIds.length === 0) {
    result.modelIds = [...DEFAULT_MODELS];
  }
  if (!formatsSet && result.formats.length === 0) {
    result.formats = [...allFormats()];
  }
  return result;
};
