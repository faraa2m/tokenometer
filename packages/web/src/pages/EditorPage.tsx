import { CodeBlock } from '../components/CodeBlock.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

const MARKETPLACE_URL =
  'https://marketplace.visualstudio.com/items?itemName=faraa2m.tokenometer-vscode';
const OPEN_VSX_URL = 'https://open-vsx.org/extension/faraa2m/tokenometer-vscode';

const SAMPLE_OUTPUT = `prompt-cost.md  ·  41 tokens  ·  $0.000123
                ·  claude-sonnet-4-6 / text
                ·  rates_version 2026-05-08`;

const FEATURES = [
  'live status-bar token count and USD cost for the active editor',
  'hover provenance for tokenizer, model, format, and rates version',
  'workspace .tokenometer.yml defaults for model, format, and budget',
  'offline estimates by default with no telemetry and no key persistence',
];

export const EditorPage = () => {
  usePageTitle('vs code', 'tokenometer in your editor');
  return (
    <section className="space-y-10 py-9 sm:py-12">
      <div className="grid grid-cols-12 gap-x-6 gap-y-6 border-b border-[var(--tk-rule)] pb-9">
        <div className="col-span-12 lg:col-span-7">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-blue)]">
            ›editor integration
          </p>
          <h1 className="tk-display mt-3 max-w-3xl text-5xl font-semibold leading-[0.96] tracking-normal sm:text-6xl">
            Token cost beside the file you are editing.
          </h1>
          <p className="mt-5 max-w-3xl text-[14px] leading-7 text-[var(--tk-dim)]">
            The Tokenometer extension brings the same offline calculator numbers into VS Code,
            Cursor, and VSCodium. It stays local by default, uses the same tokenizer/rate data as
            the CLI, and keeps prompt cost visible before a change ships.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-5">
          <div className="tk-panel rounded-md p-4">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--tk-rule)] pb-3">
              <span className="text-[10px] uppercase tracking-[0.24em] text-[var(--tk-dim)]">
                status bar
              </span>
              <span className="rounded-full border border-[var(--tk-rule)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[var(--tk-green)]">
                shipped
              </span>
            </div>
            <pre className="whitespace-pre-wrap text-[12.5px] leading-7 text-[var(--tk-fg)]">
              {SAMPLE_OUTPUT}
            </pre>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-x-6 gap-y-6">
        <div className="col-span-12 md:col-span-7">
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature, index) => (
              <div className="tk-soft-panel rounded p-4" key={feature}>
                <p className="mb-3 text-[10px] tabular-nums text-[var(--tk-blue)]">0{index + 1}</p>
                <p className="text-[12.5px] leading-6 text-[var(--tk-fg)]">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 md:col-span-5 space-y-4">
          <div className="tk-panel rounded-md p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-blue)]">install</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={MARKETPLACE_URL}
                rel="noopener noreferrer"
                target="_blank"
                className="rounded-full border border-[var(--tk-amber)] bg-[var(--tk-amber)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--tk-bg)] hover:bg-transparent hover:text-[var(--tk-amber)]"
              >
                VS Code Marketplace
              </a>
              <a
                href={OPEN_VSX_URL}
                rel="noopener noreferrer"
                target="_blank"
                className="rounded-full border border-[var(--tk-rule)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--tk-fg)] hover:border-[var(--tk-amber)] hover:text-[var(--tk-amber)]"
              >
                Open VSX
              </a>
            </div>
            <CodeBlock
              code="ext install faraa2m.tokenometer-vscode"
              filename="command palette"
              language="bash"
            />
            <p className="mt-3 text-[10.5px] leading-5 text-[var(--tk-dim)]">
              Use Marketplace for VS Code. Use Open VSX for Cursor, VSCodium, and compatible
              editors.
            </p>
          </div>

          <div className="tk-soft-panel rounded p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
              build from source
            </p>
            <CodeBlock
              code={[
                'git clone https://github.com/faraa2m/tokenometer',
                'cd tokenometer/packages/vscode',
                'npm install && npm run package',
                '# install the .vsix from ./dist',
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
