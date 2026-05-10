import { KNOWN_MODELS, allFormats, isFormat } from '@tokenometer/core';
import type { Format } from '@tokenometer/core';

export type OutputFormat = 'table' | 'json' | 'sarif';

export interface ParsedArgs {
  byFile: boolean;
  configPath: string | null;
  empirical: boolean;
  formats: Format[];
  formatsSet: boolean;
  help: boolean;
  imagePaths: string[];
  inputPaths: string[];
  inputPathsSet: boolean;
  maxSpend: number;
  modelIds: string[];
  modelsSet: boolean;
  noConfig: boolean;
  offline: boolean;
  output: OutputFormat;
  version: boolean;
}

export const HELP_TEXT = `tokenometer — empirical token-cost benchmarking for LLM prompts

USAGE
  tokenometer <file> [options]
  echo "prompt" | tokenometer - [options]

OPTIONS
  --model <id[,id...]>     Comma-separated model ids. Default: claude-opus-4-7,
                           or auto-detected from *_API_KEY env when omitted.
                           Known: ${KNOWN_MODELS.join(', ')}
  --format <fmt[,fmt...]>  Comma-separated formats (default: all).
                           Known: ${allFormats().join(', ')}
  --output <fmt>           Output format: table (default), json, or sarif.
  --by-file                With multi-file input, append a per-file token/cost table.
  --image <path>           Path to an image to factor into vision-token cost.
                           Repeatable.
  --config <path>          Load this exact config file (skip walk-up).
  --no-config              Skip .tokenometer.yml loading entirely.
  --empirical              Run sample API calls and report real charges.
                           Requires the matching <PROVIDER>_API_KEY env var.
  --max-spend <usd>        Hard ceiling for empirical mode (default: 0.05).
  --offline                Force offline mode (overrides --empirical).
  -h, --help               Show this help.
  -v, --version            Show CLI version.

EXAMPLES
  tokenometer ./prompt.md
  tokenometer ./prompt.md --model claude-opus-4-7,gpt-4o --by-file
  tokenometer ./prompt.md --output sarif > tokenometer.sarif
  tokenometer ./prompt.md --image ./screenshot.png
  tokenometer ./prompt.md --format yaml,json --empirical --max-spend 0.01
`;

const DEFAULT_MODELS = ['claude-opus-4-7'];
const DEFAULT_MAX_SPEND_USD = 0.05;
const OUTPUT_FORMATS: readonly OutputFormat[] = ['table', 'json', 'sarif'];

const isOutputFormat = (value: string): value is OutputFormat =>
  (OUTPUT_FORMATS as readonly string[]).includes(value);

export const parseArgs = (argv: readonly string[]): ParsedArgs => {
  const result: ParsedArgs = {
    byFile: false,
    configPath: null,
    empirical: false,
    formats: [...allFormats()],
    formatsSet: false,
    help: false,
    imagePaths: [],
    inputPaths: [],
    inputPathsSet: false,
    maxSpend: DEFAULT_MAX_SPEND_USD,
    modelIds: [...DEFAULT_MODELS],
    modelsSet: false,
    noConfig: false,
    offline: false,
    output: 'table',
    version: false,
  };

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
    if (arg === '--by-file') {
      result.byFile = true;
      continue;
    }
    if (arg === '--no-config') {
      result.noConfig = true;
      continue;
    }
    if (arg === '--config') {
      const next = argv[++i];
      if (!next) throw new Error('--config requires a value');
      result.configPath = next;
      continue;
    }
    if (arg === '--output') {
      const next = argv[++i];
      if (!next) throw new Error('--output requires a value');
      if (!isOutputFormat(next)) {
        throw new Error(`Unknown --output "${next}". Known: ${OUTPUT_FORMATS.join(', ')}.`);
      }
      result.output = next;
      continue;
    }
    if (arg === '--image') {
      const next = argv[++i];
      if (!next) throw new Error('--image requires a value');
      result.imagePaths.push(next);
      continue;
    }
    if (arg === '--model') {
      const next = argv[++i];
      if (!next) throw new Error('--model requires a value');
      result.modelIds = next
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      result.modelsSet = true;
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
          throw new Error(`Unknown format "${fmt}". Known: ${allFormats().join(', ')}.`);
        }
      }
      result.formats = formats as Format[];
      result.formatsSet = true;
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
    result.inputPathsSet = true;
  }

  if (!result.modelsSet && result.modelIds.length === 0) {
    result.modelIds = [...DEFAULT_MODELS];
  }
  if (!result.formatsSet && result.formats.length === 0) {
    result.formats = [...allFormats()];
  }
  return result;
};
