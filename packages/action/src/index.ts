import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import * as core from '@actions/core';
import { exec } from '@actions/exec';
import * as github from '@actions/github';
import {
  type Format,
  KNOWN_MODELS,
  allFormats,
  getModel,
  isFormat,
  tokenize,
} from '@tokenometer/core';
import { minimatch } from 'minimatch';
import { aggregatePerFileDiff, renderPerFileMarkdown } from './per-file-diff.js';

interface Inputs {
  baseRef: string;
  budget: number | null;
  commentMarker: string;
  formats: Format[];
  githubToken: string;
  modelIds: string[];
  paths: string[];
  topNFiles: number;
}

interface FileCost {
  cost: number;
  model: string;
  format: Format;
  tokens: number;
}

interface FileResult {
  base: FileCost[] | null;
  head: FileCost[];
  path: string;
}

const readInputs = (): Inputs => {
  const paths = core
    .getInput('paths')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const modelIds = core
    .getInput('models')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const id of modelIds) {
    if (!KNOWN_MODELS.includes(id)) {
      throw new Error(`Unknown model "${id}". Known: ${KNOWN_MODELS.join(', ')}`);
    }
  }
  const formats = core
    .getInput('formats')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const f of formats) {
    if (!isFormat(f)) {
      throw new Error(`Unknown format "${f}". Known: ${allFormats().join(', ')}`);
    }
  }
  const budgetRaw = core.getInput('budget').trim();
  const budget = budgetRaw === '' ? null : Number.parseFloat(budgetRaw);
  if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
    throw new Error(`budget must be a non-negative number, got "${budgetRaw}"`);
  }
  const topNRaw = core.getInput('top-n-files').trim();
  const topNParsed = topNRaw === '' ? 5 : Number.parseInt(topNRaw, 10);
  if (!Number.isFinite(topNParsed)) {
    throw new Error(`top-n-files must be an integer 1-20, got "${topNRaw}"`);
  }
  const topNFiles = Math.max(1, Math.min(20, topNParsed));
  return {
    baseRef: core.getInput('base-ref').trim(),
    budget,
    commentMarker: core.getInput('comment-marker'),
    formats: formats as Format[],
    githubToken: core.getInput('github-token'),
    modelIds,
    paths,
    topNFiles,
  };
};

const resolveBaseRef = async (input: string): Promise<string> => {
  if (input) return input;
  const ctx = github.context;
  if (ctx.payload.pull_request) {
    return `origin/${ctx.payload.pull_request.base.ref}`;
  }
  return 'HEAD~1';
};

const captureExec = async (
  cmd: string,
  args: string[],
  options: { cwd?: string; ignoreErr?: boolean } = {},
): Promise<{ code: number; stderr: string; stdout: string }> => {
  let stdout = '';
  let stderr = '';
  const code = await exec(cmd, args, {
    ...(options.cwd !== undefined ? { cwd: options.cwd } : {}),
    ignoreReturnCode: true,
    listeners: {
      stderr: (data: Buffer) => {
        stderr += data.toString();
      },
      stdout: (data: Buffer) => {
        stdout += data.toString();
      },
    },
    silent: true,
  });
  if (code !== 0 && !options.ignoreErr) {
    throw new Error(`\`${cmd} ${args.join(' ')}\` exited ${code}\n${stderr || stdout}`);
  }
  return { code, stderr, stdout };
};

const matchPaths = async (base: string, patterns: readonly string[]): Promise<string[]> => {
  await captureExec('git', ['fetch', 'origin', base.replace(/^origin\//, ''), '--depth=2'], {
    ignoreErr: true,
  });
  const { stdout } = await captureExec('git', ['diff', '--name-only', `${base}...HEAD`]);
  const changed = stdout
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  return changed.filter((file) => patterns.some((p) => minimatch(file, p, { matchBase: true })));
};

const readFileAt = async (ref: string, path: string): Promise<string | null> => {
  const { code, stdout } = await captureExec('git', ['show', `${ref}:${path}`], {
    ignoreErr: true,
  });
  return code === 0 ? stdout : null;
};

const measure = (
  prompt: string,
  modelIds: readonly string[],
  formats: readonly Format[],
): FileCost[] => {
  const out: FileCost[] = [];
  for (const modelId of modelIds) {
    for (const format of formats) {
      const r = tokenize({ format, modelId, prompt });
      out.push({ cost: r.inputCost, format, model: modelId, tokens: r.inputTokens });
    }
  }
  return out;
};

const sumCost = (cells: readonly FileCost[]): number => cells.reduce((acc, c) => acc + c.cost, 0);

const formatTokenCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${n}`;
};

const formatCost = (usd: number): string => {
  if (Math.abs(usd) >= 0.01) return `$${usd.toFixed(4)}`;
  if (Math.abs(usd) >= 0.000001) return `$${usd.toFixed(6)}`;
  return `$${usd.toExponential(2)}`;
};

const formatDelta = (delta: number): string => {
  if (delta === 0) return '±$0.000000';
  const sign = delta > 0 ? '+' : '−';
  return `${sign}${formatCost(Math.abs(delta))}`;
};

const renderMarkdown = (
  marker: string,
  results: FileResult[],
  models: readonly string[],
  formats: readonly Format[],
  budget: number | null,
  topNFiles: number,
): { body: string; totalDelta: number } => {
  const totalHead = results.reduce((acc, r) => acc + sumCost(r.head), 0);
  const totalBase = results.reduce((acc, r) => acc + (r.base ? sumCost(r.base) : 0), 0);
  const totalDelta = totalHead - totalBase;

  const lines: string[] = [];
  lines.push(marker);
  lines.push('## tokenometer · prompt cost diff');
  lines.push('');
  lines.push(`Models: \`${models.join('`, `')}\`. Formats: \`${formats.join('`, `')}\`.`);

  const modelLimits = models
    .map((id) => {
      const m = getModel(id);
      if (!m.contextWindow && !m.maxOutputTokens) return null;
      const ctx = m.contextWindow ? `ctx ${formatTokenCount(m.contextWindow)}` : '';
      const out = m.maxOutputTokens ? `out ${formatTokenCount(m.maxOutputTokens)}` : '';
      return `\`${id}\` (${[ctx, out].filter(Boolean).join(' · ')})`;
    })
    .filter((s): s is string => s !== null);
  if (modelLimits.length > 0) {
    lines.push('');
    lines.push(`Limits: ${modelLimits.join(' · ')}`);
  }
  lines.push('');

  if (results.length === 0) {
    lines.push('No matching prompt files changed in this PR.');
  } else {
    lines.push('| File | Tokens (head) | Cost (head) | Δ Cost |');
    lines.push('|---|---:|---:|---:|');
    for (const r of results) {
      const totalTokens = r.head.reduce((a, b) => a + b.tokens, 0);
      const headCost = sumCost(r.head);
      const baseCost = r.base ? sumCost(r.base) : 0;
      const delta = headCost - baseCost;
      lines.push(
        `| \`${r.path}\` | ${totalTokens.toLocaleString()} | ${formatCost(headCost)} | ${r.base ? formatDelta(delta) : '— (new)'} |`,
      );
    }
    lines.push('');
    lines.push(
      `**Total cost (head):** ${formatCost(totalHead)} · **Δ vs base:** ${formatDelta(totalDelta)}`,
    );

    const perFile = aggregatePerFileDiff(
      results.map((r) => ({ base: r.base, head: r.head, path: r.path })),
      { topN: topNFiles },
    );
    const perFileMd = renderPerFileMarkdown(perFile);
    if (perFileMd) {
      lines.push('');
      lines.push(perFileMd);
    }
  }

  if (budget !== null) {
    const ok = totalDelta <= budget;
    lines.push('');
    lines.push(
      `${ok ? '✅' : '❌'} Budget: ${formatCost(budget)} · Δ ${ok ? 'within' : 'exceeds'} budget.`,
    );
  }

  lines.push('');
  lines.push(
    '<sub>Powered by <a href="https://github.com/faraa2m/tokenometer">tokenometer</a>. countTokens-grade empirical numbers in the CLI: <code>npx tokenometer prompt.md --empirical</code>.</sub>',
  );

  return { body: lines.join('\n'), totalDelta };
};

const upsertStickyComment = async (
  token: string,
  marker: string,
  body: string,
): Promise<string | null> => {
  const ctx = github.context;
  if (!ctx.payload.pull_request) {
    core.info('Not a pull request — skipping comment.');
    return null;
  }
  const octokit = github.getOctokit(token);
  const owner = ctx.repo.owner;
  const repo = ctx.repo.repo;
  const issueNumber = ctx.payload.pull_request.number;

  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    issue_number: issueNumber,
    owner,
    repo,
  });
  const existing = comments.find((c) => (c.body ?? '').includes(marker));
  if (existing) {
    const updated = await octokit.rest.issues.updateComment({
      body,
      comment_id: existing.id,
      owner,
      repo,
    });
    return updated.data.html_url;
  }
  const created = await octokit.rest.issues.createComment({
    body,
    issue_number: issueNumber,
    owner,
    repo,
  });
  return created.data.html_url;
};

const run = async (): Promise<void> => {
  try {
    const inputs = readInputs();
    const baseRef = await resolveBaseRef(inputs.baseRef);
    core.info(`Base ref: ${baseRef}`);

    const changed = await matchPaths(baseRef, inputs.paths);
    core.info(`Changed prompt files: ${changed.length === 0 ? '(none)' : changed.join(', ')}`);

    const results: FileResult[] = [];
    for (const path of changed) {
      const headContent = await fs.readFile(resolve(path), 'utf8').catch(() => null);
      if (headContent === null) {
        core.warning(`Could not read head ${path} — skipping.`);
        continue;
      }
      const baseContent = await readFileAt(baseRef, path);
      results.push({
        base: baseContent === null ? null : measure(baseContent, inputs.modelIds, inputs.formats),
        head: measure(headContent, inputs.modelIds, inputs.formats),
        path,
      });
    }

    const { body, totalDelta } = renderMarkdown(
      inputs.commentMarker,
      results,
      inputs.modelIds,
      inputs.formats,
      inputs.budget,
      inputs.topNFiles,
    );

    const commentUrl = await upsertStickyComment(inputs.githubToken, inputs.commentMarker, body);

    core.setOutput('cost-delta', totalDelta.toFixed(8));
    if (commentUrl) core.setOutput('comment-url', commentUrl);
    core.summary.addRaw(body).write();

    if (inputs.budget !== null && totalDelta > inputs.budget) {
      core.setFailed(
        `Cost delta ${formatCost(totalDelta)} exceeds budget ${formatCost(inputs.budget)}`,
      );
    }
  } catch (err) {
    core.setFailed((err as Error).message);
  }
};

void run();
