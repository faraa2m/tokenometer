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
import {
  type CodeDetectionMode,
  type ExtractedPrompt,
  detectPrompts,
  shouldSkipFile,
} from './detectors/index.js';
import { type CodePromptRow, measureExtractedPrompts } from './measure-code.js';
import { aggregatePerFileDiff, renderPerFileMarkdown } from './per-file-diff.js';
import { renderCodeSection } from './render-code-section.js';

type CommentMode = 'single' | 'split';

interface Inputs {
  baseRef: string;
  budget: number | null;
  codeDetection: CodeDetectionMode;
  codePaths: string[];
  commentMarker: string;
  commentMode: CommentMode;
  formats: Format[];
  githubToken: string;
  modelIds: string[];
  paths: string[];
  promptMarkerComment: string;
  topNFiles: number;
  topNPrompts: number;
}

const CODE_DETECTION_MODES = ['off', 'annotations', 'sdk-regex', 'both'] as const;

const isCodeDetectionMode = (s: string): s is CodeDetectionMode =>
  (CODE_DETECTION_MODES as readonly string[]).includes(s);

const isCommentMode = (s: string): s is CommentMode => s === 'single' || s === 'split';

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

  const codePaths = core
    .getInput('code-paths')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const codeDetectionRaw = (core.getInput('code-detection').trim() || 'off') as string;
  if (!isCodeDetectionMode(codeDetectionRaw)) {
    throw new Error(
      `code-detection must be one of ${CODE_DETECTION_MODES.join(', ')}, got "${codeDetectionRaw}"`,
    );
  }
  const codeDetection = codeDetectionRaw;
  const promptMarkerComment =
    core.getInput('prompt-marker-comment').trim() || '@tokenometer-prompt';
  const commentModeRaw = (core.getInput('comment-mode').trim() || 'single') as string;
  if (!isCommentMode(commentModeRaw)) {
    throw new Error(`comment-mode must be 'single' or 'split', got "${commentModeRaw}"`);
  }
  const commentMode = commentModeRaw;
  const topNPromptsRaw = core.getInput('top-n-prompts').trim();
  const topNPromptsParsed = topNPromptsRaw === '' ? 5 : Number.parseInt(topNPromptsRaw, 10);
  if (!Number.isFinite(topNPromptsParsed)) {
    throw new Error(`top-n-prompts must be an integer 1-20, got "${topNPromptsRaw}"`);
  }
  const topNPrompts = Math.max(1, Math.min(20, topNPromptsParsed));

  return {
    baseRef: core.getInput('base-ref').trim(),
    budget,
    codeDetection,
    codePaths,
    commentMarker: core.getInput('comment-marker'),
    commentMode,
    formats: formats as Format[],
    githubToken: core.getInput('github-token'),
    modelIds,
    paths,
    promptMarkerComment,
    topNFiles,
    topNPrompts,
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
  opts: { renderBudget?: boolean } = {},
): { body: string; totalDelta: number } => {
  const renderBudget = opts.renderBudget ?? true;
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

  if (budget !== null && renderBudget) {
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

const collectCodePrompts = async (
  baseRef: string,
  inputs: Inputs,
): Promise<{ rows: CodePromptRow[]; section: string; delta: number }> => {
  if (inputs.codeDetection === 'off') {
    return { rows: [], section: '', delta: 0 };
  }
  const changedCode = await matchPaths(baseRef, inputs.codePaths);
  core.info(
    `Changed code files (for inline-prompt scan): ${
      changedCode.length === 0 ? '(none)' : changedCode.join(', ')
    }`,
  );
  const baseExtracted: ExtractedPrompt[] = [];
  const headExtracted: ExtractedPrompt[] = [];
  for (const path of changedCode) {
    const headContent = await fs.readFile(resolve(path), 'utf8').catch(() => null);
    if (headContent !== null && !shouldSkipFile(path, headContent)) {
      const result = detectPrompts(
        headContent,
        path,
        inputs.codeDetection,
        inputs.promptMarkerComment,
      );
      headExtracted.push(...result.prompts);
      for (const loc of result.nonLiteralLocations) {
        core.warning(`prompt at ${loc.file}:${loc.line} (${loc.sdk}) is non-literal — skipping`);
      }
    }
    const baseContent = await readFileAt(baseRef, path);
    if (baseContent !== null && !shouldSkipFile(path, baseContent)) {
      const result = detectPrompts(
        baseContent,
        path,
        inputs.codeDetection,
        inputs.promptMarkerComment,
      );
      baseExtracted.push(...result.prompts);
    }
  }
  const rows = measureExtractedPrompts(
    baseExtracted,
    headExtracted,
    inputs.modelIds,
    inputs.formats,
  );
  const delta = rows.reduce((acc, r) => acc + r.costDelta, 0);
  const section = renderCodeSection(rows, inputs.topNPrompts);
  return { rows, section, delta };
};

const composeBudgetLine = (budget: number | null, totalDelta: number): string => {
  if (budget === null) return '';
  const ok = totalDelta <= budget;
  return `${ok ? '✅' : '❌'} Budget: ${formatCost(budget)} · Δ ${ok ? 'within' : 'exceeds'} budget.`;
};

const CODE_COMMENT_MARKER = '<!-- tokenometer-cost-diff-code -->';

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

    const codeResult = await collectCodePrompts(baseRef, inputs);

    const splitMode = inputs.commentMode === 'split' && inputs.codeDetection !== 'off';

    // When splitting, the main comment renders the budget against file-only
    // delta (existing semantics). When not splitting, suppress the per-renderer
    // budget line so we can render a single combined-total line at the end.
    const { body: fileBody, totalDelta: filesCostDelta } = renderMarkdown(
      inputs.commentMarker,
      results,
      inputs.modelIds,
      inputs.formats,
      inputs.budget,
      inputs.topNFiles,
      { renderBudget: splitMode },
    );

    const totalDelta = filesCostDelta + codeResult.delta;

    let mainBody = fileBody;
    if (!splitMode) {
      const trailer: string[] = [];
      if (codeResult.section) {
        trailer.push('');
        trailer.push(codeResult.section);
      }
      if (codeResult.rows.length > 0) {
        trailer.push('');
        trailer.push(
          `**Total Δ (files + code-embedded):** ${formatDelta(totalDelta)} (files ${formatDelta(filesCostDelta)}, code ${formatDelta(codeResult.delta)})`,
        );
      }
      const budgetLine = composeBudgetLine(inputs.budget, totalDelta);
      if (budgetLine) {
        trailer.push('');
        trailer.push(budgetLine);
      }
      mainBody = `${fileBody}${trailer.length > 0 ? `\n${trailer.join('\n')}` : ''}`;
    }

    const commentUrl = await upsertStickyComment(
      inputs.githubToken,
      inputs.commentMarker,
      mainBody,
    );

    if (splitMode && codeResult.section) {
      const codeBudgetLine = composeBudgetLine(inputs.budget, totalDelta);
      const codeBodyLines: string[] = [];
      codeBodyLines.push(CODE_COMMENT_MARKER);
      codeBodyLines.push('## tokenometer · code-embedded prompts');
      codeBodyLines.push('');
      codeBodyLines.push(codeResult.section);
      codeBodyLines.push('');
      codeBodyLines.push(
        `**Total Δ (files + code-embedded):** ${formatDelta(totalDelta)} (files ${formatDelta(filesCostDelta)}, code ${formatDelta(codeResult.delta)})`,
      );
      if (codeBudgetLine) {
        codeBodyLines.push('');
        codeBodyLines.push(codeBudgetLine);
      }
      await upsertStickyComment(inputs.githubToken, CODE_COMMENT_MARKER, codeBodyLines.join('\n'));
    }

    core.setOutput('cost-delta', filesCostDelta.toFixed(8));
    core.setOutput('code-cost-delta', codeResult.delta.toFixed(8));
    core.setOutput('total-cost-delta', totalDelta.toFixed(8));
    if (commentUrl) core.setOutput('comment-url', commentUrl);
    core.summary.addRaw(mainBody).write();

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
