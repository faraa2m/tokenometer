import type { TokenizeResult } from './types.js';

/**
 * Per-file aggregate of matrix results, suitable for SARIF emission.
 * `path` is the source-relative URI that will land in the SARIF location.
 */
export interface TokenometerFileResult {
  path: string;
  results: readonly TokenizeResult[];
}

/**
 * Top-level result envelope passed to SARIF / future formatters.
 * Modeled as a discriminated wrapper so additional fields (e.g. budget verdicts,
 * empirical metadata) can be added without breaking existing callers.
 */
export interface TokenometerResult {
  files: readonly TokenometerFileResult[];
}

export interface ToSarifOptions {
  toolVersion?: string;
}

const formatCost = (usd: number): string => {
  if (usd >= 0.01) return `$${usd.toFixed(4)}`;
  if (usd >= 0.000001) return `$${usd.toFixed(6)}`;
  return `$${usd.toExponential(2)}`;
};

const SARIF_SCHEMA =
  'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/Schemata/sarif-schema-2.1.0.json';
const SARIF_VERSION = '2.1.0';
const TOOL_NAME = 'Tokenometer';
const TOOL_INFO_URI = 'https://github.com/faraa2m/tokenometer';
const RULE_ID = 'prompt-cost';

interface SarifLocation {
  physicalLocation: { artifactLocation: { uri: string } };
}

interface SarifResultEntry {
  ruleId: string;
  level: 'note';
  message: { text: string };
  locations: SarifLocation[];
}

interface SarifTool {
  driver: {
    name: string;
    version: string;
    informationUri: string;
    rules: { id: string; name: string; shortDescription: { text: string } }[];
  };
}

interface SarifRun {
  tool: SarifTool;
  results: SarifResultEntry[];
}

interface SarifLog {
  $schema: string;
  version: string;
  runs: SarifRun[];
}

export const toSarif = (result: TokenometerResult, opts?: ToSarifOptions): SarifLog => {
  const toolVersion = opts?.toolVersion ?? '0.0.0';
  const results: SarifResultEntry[] = [];
  for (const file of result.files) {
    for (const cell of file.results) {
      results.push({
        ruleId: RULE_ID,
        level: 'note',
        message: {
          text: `${cell.model} / ${cell.format}: ${cell.inputTokens.toLocaleString()} tokens · ${formatCost(cell.inputCost)}`,
        },
        locations: [{ physicalLocation: { artifactLocation: { uri: file.path } } }],
      });
    }
  }
  return {
    $schema: SARIF_SCHEMA,
    version: SARIF_VERSION,
    runs: [
      {
        tool: {
          driver: {
            name: TOOL_NAME,
            version: toolVersion,
            informationUri: TOOL_INFO_URI,
            rules: [
              {
                id: RULE_ID,
                name: 'prompt-cost',
                shortDescription: {
                  text: 'Estimated input-token cost for this prompt file.',
                },
              },
            ],
          },
        },
        results,
      },
    ],
  };
};
