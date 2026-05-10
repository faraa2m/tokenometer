import { CodeBlock } from '../components/CodeBlock.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

const SAMPLE_OUTPUT = `prompt-cost.md  ·  41 tokens  ·  $0.000123
                ·  claude-sonnet-4-6 / text
                ·  rates_version 2026-05-08`;

export const EditorPage = () => {
  usePageTitle('vs code', 'tokenometer in your editor');
  return (
    <section className="space-y-8 py-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
          ›editor · vs code extension (wave 3)
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">vs code extension</h1>
        <p className="mt-2 max-w-3xl text-[12.5px] text-[var(--tk-dim)]">
          Real-time token cost in your status bar as you edit prompts. Same numbers as the
          calculator, same tokenizers, no telemetry. Currently in development as part of Wave 3.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-x-6 gap-y-6">
        <div className="col-span-12 md:col-span-7 space-y-4">
          <div className="border border-[var(--tk-rule)] bg-[var(--tk-cell)] p-4 text-[12.5px]">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
              status-bar preview
            </p>
            <pre className="mt-2 whitespace-pre-wrap text-[var(--tk-fg)]">{SAMPLE_OUTPUT}</pre>
          </div>
          <div className="space-y-2 text-[12.5px]">
            <p className="text-[var(--tk-fg)]">Planned features:</p>
            <ul className="space-y-1 text-[var(--tk-dim)]">
              <li>· live status-bar token count + cost for the active editor</li>
              <li>· hover provenance: tokenizer, model, rates_version</li>
              <li>· `tokenometer: measure file` command, posts results to a panel</li>
              <li>· honors workspace `.tokenometer.yml` for default model + format</li>
              <li>· no telemetry; offline by default</li>
            </ul>
          </div>
        </div>
        <div className="col-span-12 md:col-span-5">
          <div className="border border-[var(--tk-rule)] bg-[var(--tk-cell)] p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">install</p>
            <button
              type="button"
              disabled
              className="mt-3 inline-block cursor-not-allowed border border-[var(--tk-rule)] bg-[var(--tk-bg)] px-4 py-2 text-[12px] uppercase tracking-[0.18em] text-[var(--tk-dim)] opacity-70"
            >
              › marketplace · TODO
            </button>
            <p className="mt-3 text-[10.5px] text-[var(--tk-dim)]">
              Marketplace listing pending. Track progress on the{' '}
              <a
                href="https://github.com/faraa2m/tokenometer/issues"
                className="underline decoration-[var(--tk-amber-dim)] underline-offset-4"
              >
                issues board
              </a>
              .
            </p>
          </div>
          <div className="mt-4 border border-[var(--tk-rule)] bg-[var(--tk-cell)] p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
              build from source
            </p>
            <CodeBlock
              code={[
                'git clone https://github.com/faraa2m/tokenometer',
                'cd tokenometer/packages/vscode',
                'npm install && npm run package',
                '# .vsix lands in ./dist – install via VS Code Extensions tab',
              ].join('\n')}
              filename="bash"
              language="bash"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
