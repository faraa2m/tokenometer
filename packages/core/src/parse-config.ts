import { parse as yamlParse } from 'yaml';
import { KNOWN_MODELS } from './rates.js';

const ALLOWED_FORMATS = ['json', 'yaml', 'xml', 'markdown', 'text'] as const;

export type ConfigFormat = (typeof ALLOWED_FORMATS)[number];

export interface TokenometerConfig {
  models?: string[];
  formats?: ConfigFormat[];
  budgets?: { total?: number; 'per-file'?: number };
  paths?: string[];
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const ensureStringArray = (value: unknown, field: string): string[] => {
  if (!Array.isArray(value)) {
    throw new Error(`tokenometer config: "${field}" must be an array of strings.`);
  }
  return value.map((item, idx) => {
    if (typeof item !== 'string') {
      throw new Error(
        `tokenometer config: "${field}[${idx}]" must be a string, got ${typeof item}.`,
      );
    }
    return item;
  });
};

const validateModels = (value: unknown): string[] => {
  const ids = ensureStringArray(value, 'models');
  for (const id of ids) {
    if (!KNOWN_MODELS.includes(id)) {
      throw new Error(
        `tokenometer config: unknown model "${id}". Known: ${KNOWN_MODELS.join(', ')}.`,
      );
    }
  }
  return ids;
};

const validateFormats = (value: unknown): ConfigFormat[] => {
  const raw = ensureStringArray(value, 'formats');
  for (const fmt of raw) {
    if (!(ALLOWED_FORMATS as readonly string[]).includes(fmt)) {
      throw new Error(
        `tokenometer config: unknown format "${fmt}". Known: ${ALLOWED_FORMATS.join(', ')}.`,
      );
    }
  }
  return raw as ConfigFormat[];
};

const validateBudgets = (value: unknown): { total?: number; 'per-file'?: number } => {
  if (!isPlainObject(value)) {
    throw new Error('tokenometer config: "budgets" must be an object.');
  }
  const out: { total?: number; 'per-file'?: number } = {};
  for (const key of Object.keys(value)) {
    if (key !== 'total' && key !== 'per-file') {
      throw new Error(`tokenometer config: unknown budget key "${key}". Allowed: total, per-file.`);
    }
    const raw = value[key];
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) {
      throw new Error(
        `tokenometer config: "budgets.${key}" must be a non-negative number, got ${JSON.stringify(raw)}.`,
      );
    }
    if (key === 'total') out.total = raw;
    else out['per-file'] = raw;
  }
  return out;
};

const validatePaths = (value: unknown): string[] => ensureStringArray(value, 'paths');

const ALLOWED_KEYS = new Set(['models', 'formats', 'budgets', 'paths']);

export const parseConfig = (yamlText: string): TokenometerConfig => {
  const parsed = yamlText.trim() ? yamlParse(yamlText) : {};
  if (parsed === null || parsed === undefined) return {};
  if (!isPlainObject(parsed)) {
    throw new Error('tokenometer config: top-level must be a mapping.');
  }
  for (const key of Object.keys(parsed)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error(
        `tokenometer config: unknown top-level key "${key}". Allowed: ${[...ALLOWED_KEYS].join(', ')}.`,
      );
    }
  }
  const out: TokenometerConfig = {};
  if ('models' in parsed) out.models = validateModels(parsed.models);
  if ('formats' in parsed) out.formats = validateFormats(parsed.formats);
  if ('budgets' in parsed) out.budgets = validateBudgets(parsed.budgets);
  if ('paths' in parsed) out.paths = validatePaths(parsed.paths);
  return out;
};
