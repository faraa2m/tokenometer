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
  latency: boolean;
  latencyTrials: number;
  maxSpend: number;
  /** True iff the user passed `--max-spend` explicitly (not the default). */
  maxSpendSet: boolean;
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
  --latency                Measure real generation latency (TTFT, total ms,
                           tokens/sec) per (model × format) cell. Implies
                           --empirical and bumps the default --max-spend
                           ceiling to $0.25 (each trial is a metered
                           ~200-token chat completion). Anthropic, OpenAI,
                           Google, Cohere, Mistral are supported.
  --latency-trials <n>     Trials per cell for --latency (1-10, default 3).
                           Each trial requests max_tokens=200 to keep cost
                           predictable while giving enough output to
                           stabilize tokens/sec.
  --max-spend <usd>        Hard ceiling for empirical mode (default: 0.05;
                           with --latency, default 0.25).
  --offline                Force offline mode (overrides --empirical).
  -h, --help               Show this help.
  -v, --version            Show CLI version.

EXAMPLES
  tokenometer ./prompt.md
  tokenometer ./prompt.md --model claude-opus-4-7,gpt-4o --by-file
  tokenometer ./prompt.md --output sarif > tokenometer.sarif
  tokenometer ./prompt.md --image ./screenshot.png
  tokenometer ./prompt.md --format yaml,json --empirical --max-spend 0.01
  tokenometer ./prompt.md --latency --model gpt-4o,claude-opus-4-7
`;

const DEFAULT_MODELS = ['claude-opus-4-7'];
const DEFAULT_MAX_SPEND_USD = 0.05;
export const DEFAULT_LATENCY_MAX_SPEND_USD = 0.25;
export const DEFAULT_LATENCY_TRIALS = 3;
const MIN_LATENCY_TRIALS = 1;
const MAX_LATENCY_TRIALS = 10;
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
    latency: false,
    latencyTrials: DEFAULT_LATENCY_TRIALS,
    maxSpend: DEFAULT_MAX_SPEND_USD,
    maxSpendSet: false,
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
    if (arg === '--latency') {
      result.latency = true;
      // --latency implies --empirical (offline mode can't measure real latency).
      result.empirical = true;
      continue;
    }
    if (arg === '--latency-trials') {
      const next = argv[++i];
      if (!next) throw new Error('--latency-trials requires a value');
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed) || parsed < MIN_LATENCY_TRIALS || parsed > MAX_LATENCY_TRIALS) {
        throw new Error(
          `--latency-trials must be an integer between ${MIN_LATENCY_TRIALS} and ${MAX_LATENCY_TRIALS}, got "${next}".`,
        );
      }
      result.latencyTrials = parsed;
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
      result.maxSpendSet = true;
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
  // `--latency` makes the default `--max-spend` ceiling more generous since
  // each trial is a metered ~200-token chat completion. Only bump if the
  // user did not explicitly set --max-spend (theirs always wins).
  if (result.latency && !result.maxSpendSet) {
    result.maxSpend = DEFAULT_LATENCY_MAX_SPEND_USD;
  }
  return result;
};
