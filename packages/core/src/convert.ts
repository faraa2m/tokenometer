import { parse as yamlParse, stringify as yamlStringify } from 'yaml';
import type { Format } from './types.js';

const FORMATS: Format[] = ['json', 'markdown', 'text', 'xml', 'yaml'];

export const isFormat = (value: string): value is Format => (FORMATS as string[]).includes(value);

const escapeXml = (raw: string): string =>
  raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const sanitizeTag = (key: string): string => key.replace(/[^a-zA-Z0-9_-]/g, '_');

const toXml = (value: unknown, tag = 'root'): string => {
  const safeTag = sanitizeTag(tag);
  if (value === null || value === undefined) {
    return `<${safeTag}/>`;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toXml(item, 'item')).join('');
  }
  if (typeof value === 'object') {
    const inner = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => toXml(v, k))
      .join('');
    return `<${safeTag}>${inner}</${safeTag}>`;
  }
  return `<${safeTag}>${escapeXml(String(value))}</${safeTag}>`;
};

const toMarkdown = (value: unknown, depth = 1): string => {
  if (value === null || value === undefined) {
    return '_null_';
  }
  if (typeof value !== 'object') {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.every((v) => v !== null && typeof v === 'object' && !Array.isArray(v))) {
      const records = value as Array<Record<string, unknown>>;
      const headers = Array.from(new Set(records.flatMap((r) => Object.keys(r))));
      if (headers.length === 0) return '';
      const headerRow = `| ${headers.join(' | ')} |`;
      const sepRow = `| ${headers.map(() => '---').join(' | ')} |`;
      const dataRows = records.map(
        (r) => `| ${headers.map((h) => String(r[h] ?? '')).join(' | ')} |`,
      );
      return [headerRow, sepRow, ...dataRows].join('\n');
    }
    return value.map((v) => `- ${toMarkdown(v, depth + 1)}`).join('\n');
  }
  const heading = '#'.repeat(Math.min(depth, 6));
  return Object.entries(value as Record<string, unknown>)
    .map(([k, v]) =>
      typeof v === 'object' && v !== null
        ? `${heading} ${k}\n\n${toMarkdown(v, depth + 1)}`
        : `**${k}**: ${toMarkdown(v, depth + 1)}`,
    )
    .join('\n\n');
};

const toText = (value: unknown, prefix = ''): string => {
  if (value === null || value === undefined) {
    return `${prefix}null`;
  }
  if (typeof value !== 'object') {
    return `${prefix}${String(value)}`;
  }
  if (Array.isArray(value)) {
    return value.map((v, i) => toText(v, `${prefix}[${i}] `)).join('\n');
  }
  return Object.entries(value as Record<string, unknown>)
    .map(([k, v]) => toText(v, `${prefix}${k}: `))
    .join('\n');
};

const tryParseStructured = (raw: string): unknown => {
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {}
  }
  try {
    const parsed = yamlParse(trimmed);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {}
  return raw;
};

export const toFormat = (input: string, format: Format): string => {
  if (format === 'text') {
    const parsedForText = tryParseStructured(input);
    return typeof parsedForText === 'string' ? input : toText(parsedForText);
  }
  const parsed = tryParseStructured(input);
  if (typeof parsed === 'string') {
    if (format === 'markdown') return parsed;
    if (format === 'json') return JSON.stringify(parsed);
    if (format === 'yaml') return yamlStringify(parsed);
    return `<root>${escapeXml(parsed)}</root>`;
  }
  switch (format) {
    case 'json':
      return JSON.stringify(parsed);
    case 'yaml':
      return yamlStringify(parsed);
    case 'xml':
      return toXml(parsed);
    case 'markdown':
      return toMarkdown(parsed);
  }
};

export const allFormats = (): readonly Format[] => FORMATS;
