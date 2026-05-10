import { type Format, KNOWN_MODELS, getModel, tokenize } from '@tokenometer/core';
import * as vscode from 'vscode';
import {
  MAX_FILE_BYTES,
  debounce,
  formatStatusBarText,
  formatTooltipCost,
  isCostOverThreshold,
  isSupportedFile,
  shortenModelId,
} from './format';

const SUPPORTED_FORMATS: readonly Format[] = ['text', 'markdown', 'json', 'yaml', 'xml'];

const isFormat = (value: unknown): value is Format =>
  typeof value === 'string' && (SUPPORTED_FORMATS as readonly string[]).includes(value);

interface Settings {
  format: Format;
  modelId: string;
  warnOnCostAbove: number;
}

const readSettings = (): Settings => {
  const cfg = vscode.workspace.getConfiguration('tokenometer');
  const modelId = cfg.get<string>('model', 'claude-opus-4-7');
  const rawFormat = cfg.get<string>('format', 'text');
  const format: Format = isFormat(rawFormat) ? rawFormat : 'text';
  const warnOnCostAbove = cfg.get<number>('warnOnCostAbove', 0);
  return { format, modelId, warnOnCostAbove };
};

interface CurrentResult {
  approximate: boolean;
  cost: number;
  format: Format;
  modelId: string;
  tokens: number;
  tokenizer: string;
}

let lastResult: CurrentResult | null = null;

const updateStatusBar = (
  item: vscode.StatusBarItem,
  editor: vscode.TextEditor | undefined,
): void => {
  if (!editor) {
    lastResult = null;
    item.hide();
    return;
  }

  const doc = editor.document;
  if (!isSupportedFile(doc.languageId, doc.fileName)) {
    lastResult = null;
    item.hide();
    return;
  }

  // VS Code reports rough byte size via getText().length (chars). We want a
  // byte ceiling — encode just enough to know if we're over the limit without
  // paying the full encode cost on huge files.
  const text = doc.getText();
  // UTF-8 worst case is 4 bytes/char, but for an ASCII-heavy ceiling check
  // text.length is a good lower bound. Fall through to Buffer.byteLength only
  // when we're close.
  if (text.length > MAX_FILE_BYTES) {
    lastResult = null;
    item.text = '$(symbol-numeric) Tokenometer · —';
    item.tooltip = `File over ${MAX_FILE_BYTES.toLocaleString()} bytes — skipped to keep the editor responsive.`;
    item.backgroundColor = undefined;
    item.show();
    return;
  }
  if (Buffer.byteLength(text, 'utf8') > MAX_FILE_BYTES) {
    lastResult = null;
    item.text = '$(symbol-numeric) Tokenometer · —';
    item.tooltip = `File over ${MAX_FILE_BYTES.toLocaleString()} bytes — skipped to keep the editor responsive.`;
    item.backgroundColor = undefined;
    item.show();
    return;
  }

  const settings = readSettings();
  let result: CurrentResult;
  try {
    const tokenized = tokenize({
      format: settings.format,
      modelId: settings.modelId,
      prompt: text,
    });
    result = {
      approximate: tokenized.approximate,
      cost: tokenized.inputCost,
      format: tokenized.format,
      modelId: tokenized.model,
      tokens: tokenized.inputTokens,
      tokenizer: tokenized.tokenizer,
    };
  } catch (err) {
    // Almost certainly an unknown model id. Show a clear message and bail out.
    lastResult = null;
    item.text = '$(warning) Tokenometer · model?';
    item.tooltip = `${(err as Error).message}\n\nClick to switch model.`;
    item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    item.command = 'tokenometer.switchModel';
    item.show();
    return;
  }

  lastResult = result;

  item.text = formatStatusBarText({
    approximate: result.approximate,
    cost: result.cost,
    modelId: result.modelId,
    tokens: result.tokens,
  });

  const tooltip = new vscode.MarkdownString();
  tooltip.appendMarkdown('**Tokenometer**\n\n');
  tooltip.appendMarkdown(`Model: \`${result.modelId}\`\n\n`);
  tooltip.appendMarkdown(`Tokens: ${result.tokens.toLocaleString()}\n\n`);
  tooltip.appendMarkdown(`Cost (input): ${formatTooltipCost(result.cost)}\n\n`);
  tooltip.appendMarkdown(`Tokenizer: \`${result.tokenizer}\``);
  if (result.approximate) {
    tooltip.appendMarkdown(' (approximate)');
  }
  tooltip.appendMarkdown(`\n\nFormat: \`${result.format}\`\n\n`);
  tooltip.appendMarkdown('_Click to switch model._');
  item.tooltip = tooltip;

  item.command = 'tokenometer.switchModel';

  if (isCostOverThreshold(result.cost, settings.warnOnCostAbove)) {
    item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  } else {
    item.backgroundColor = undefined;
  }

  item.show();
};

const runSwitchModelCommand = async (): Promise<void> => {
  const cfg = vscode.workspace.getConfiguration('tokenometer');
  const current = cfg.get<string>('model', 'claude-opus-4-7');

  const items: vscode.QuickPickItem[] = KNOWN_MODELS.map((id) => {
    let providerHint = '';
    try {
      providerHint = getModel(id).provider;
    } catch {
      // Defensive — KNOWN_MODELS comes from getModel's registry, this shouldn't fire.
    }
    const description = providerHint
      ? `${providerHint}${id === current ? ' (current)' : ''}`
      : id === current
        ? '(current)'
        : '';
    const item: vscode.QuickPickItem = { label: id, description, picked: id === current };
    return item;
  });

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: `Pick a model (current: ${current})`,
    matchOnDescription: true,
  });
  if (!picked) return;

  // Save to workspace if there is one open; otherwise global. This matches the
  // "save here if relevant, else everywhere" expectation.
  const target = vscode.workspace.workspaceFolders?.length
    ? vscode.ConfigurationTarget.Workspace
    : vscode.ConfigurationTarget.Global;
  await cfg.update('model', picked.label, target);
};

const runShowInfoCommand = async (): Promise<void> => {
  if (!lastResult) {
    await vscode.window.showInformationMessage(
      'Tokenometer: no active prompt file. Open a .md / .txt / .json / .yaml / .xml file to see token counts.',
    );
    return;
  }

  const r = lastResult;
  const lines = [
    'Tokenometer details',
    '',
    `Model:      ${r.modelId} (${shortenModelId(r.modelId)})`,
    `Format:     ${r.format}`,
    `Tokenizer:  ${r.tokenizer}${r.approximate ? ' (approximate)' : ''}`,
    `Tokens:     ${r.tokens.toLocaleString()}`,
    `Cost (in):  ${formatTooltipCost(r.cost)}`,
  ];
  await vscode.window.showInformationMessage(lines.join('\n'), { modal: true });
};

export const activate = (context: vscode.ExtensionContext): void => {
  const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusItem.name = 'Tokenometer';
  context.subscriptions.push(statusItem);

  const refresh = (): void => updateStatusBar(statusItem, vscode.window.activeTextEditor);
  const debouncedRefresh = debounce(refresh, 200);

  // Initial paint.
  refresh();

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      refresh();
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      const active = vscode.window.activeTextEditor;
      if (active && event.document === active.document) {
        debouncedRefresh();
      }
    }),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      const active = vscode.window.activeTextEditor;
      if (active && doc === active.document) {
        refresh();
      }
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('tokenometer')) {
        refresh();
      }
    }),
    vscode.commands.registerCommand('tokenometer.switchModel', async () => {
      try {
        await runSwitchModelCommand();
      } catch (err) {
        await vscode.window.showErrorMessage(
          `Tokenometer: switch failed — ${(err as Error).message}`,
        );
      }
    }),
    vscode.commands.registerCommand('tokenometer.showInfo', async () => {
      try {
        await runShowInfoCommand();
      } catch (err) {
        await vscode.window.showErrorMessage(
          `Tokenometer: show-info failed — ${(err as Error).message}`,
        );
      }
    }),
    {
      dispose: () => {
        debouncedRefresh.cancel();
      },
    },
  );
};

export const deactivate = (): void => {
  // No global resources beyond context.subscriptions, which VS Code disposes for us.
};
