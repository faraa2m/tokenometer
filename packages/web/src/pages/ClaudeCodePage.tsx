import { CodeBlock } from '../components/CodeBlock.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

const CLAUDE_INSTALL = [
  'mkdir -p ~/.claude/skills/tokenometer',
  'cp packages/claude-code-skill/SKILL.md ~/.claude/skills/tokenometer/',
].join('\n');

const CODEX_INSTRUCTIONS = `# Tokenometer cost checks

When a prompt, agent instruction, system message, or LLM-facing template changes,
measure it before finalizing:

    npx tokenometer <file> --model claude-opus-4-7,gpt-4o --format json,markdown

Report tokens, USD input cost, tokenizer, and rates_version. Use --empirical
only when the user has provided provider keys and explicitly wants live counts.`;

const SKILL_PREVIEW = `---
name: tokenometer
description: Measure prompt token cost across Claude, GPT-4o, and Gemini.
  Useful before committing prompt changes or when you ask "how much
  will this cost?" — empirical with BYO-key, offline otherwise.
tools: Bash
---

# tokenometer

When the user asks how much a prompt costs, what tokenizer to use, or
whether a change is cheaper, run:

    npx tokenometer measure <file-or-prompt>

For a folder, point it at the path; tokenometer respects
\`.tokenometer.yml\` budgets and \`paths:\`. Add \`--empirical\` and the
provider env vars to hit countTokens directly (Anthropic / OpenAI /
Google). Always cite the rates_version in your reply.
`;

const AGENT_SURFACES = [
  {
    name: 'Claude Code',
    summary: 'Install the packaged SKILL.md so Claude Code can discover tokenometer automatically.',
  },
  {
    name: 'Codex',
    summary:
      'Add the same cost-check rule to AGENTS.md so Codex measures prompt changes on demand.',
  },
  {
    name: 'Other agents',
    summary: 'Use the MCP server or paste the instruction block into your agent memory.',
  },
];

export const ClaudeCodePage = () => {
  usePageTitle('agents', 'tokenometer for claude code and codex');
  return (
    <section className="space-y-10 py-9 sm:py-12">
      <div className="grid grid-cols-12 gap-x-6 gap-y-6 border-b border-[var(--tk-rule)] pb-9">
        <div className="col-span-12 lg:col-span-7">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-blue)]">
            ›agent instructions
          </p>
          <h1 className="tk-display mt-3 max-w-4xl text-5xl font-semibold leading-[0.96] tracking-normal sm:text-6xl">
            Give Claude Code and Codex a real cost meter.
          </h1>
          <p className="mt-5 max-w-3xl text-[14px] leading-7 text-[var(--tk-dim)]">
            Tokenometer gives coding agents a repeatable way to answer cost-shaped questions: "what
            does this prompt cost", "did this change increase tokens", and "which model is cheaper
            for this payload". The Claude Code skill is packaged; Codex can use the same rule from
            AGENTS.md.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-5">
          <div className="tk-panel rounded-md p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-blue)]">
              agent surfaces
            </p>
            <div className="mt-4 space-y-3">
              {AGENT_SURFACES.map((surface, index) => (
                <div className="grid grid-cols-[auto_1fr] gap-x-3" key={surface.name}>
                  <span className="text-[10px] tabular-nums text-[var(--tk-blue)]">
                    0{index + 1}
                  </span>
                  <p className="text-[12.5px] leading-6">
                    <span className="font-bold text-[var(--tk-fg)]">{surface.name}</span>{' '}
                    <span className="text-[var(--tk-dim)]">{surface.summary}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-x-6 gap-y-6">
        <div className="col-span-12 md:col-span-5 space-y-4">
          <div className="tk-panel rounded-md p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-blue)]">
              claude code
            </p>
            <p className="mt-2 text-[12.5px] leading-6 text-[var(--tk-dim)]">
              Install the skill into <code className="text-[var(--tk-fg)]">~/.claude/skills</code>{' '}
              and restart Claude Code.
            </p>
            <CodeBlock code={CLAUDE_INSTALL} filename="bash" language="bash" />
          </div>

          <div className="tk-panel rounded-md p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-blue)]">codex</p>
            <p className="mt-2 text-[12.5px] leading-6 text-[var(--tk-dim)]">
              Paste this into a repo-level <code className="text-[var(--tk-fg)]">AGENTS.md</code>{' '}
              when you want Codex to check prompt-cost changes.
            </p>
            <CodeBlock code={CODEX_INSTRUCTIONS} filename="AGENTS.md" language="markdown" />
          </div>
        </div>

        <div className="col-span-12 md:col-span-7">
          <div className="tk-soft-panel rounded p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
              SKILL.md preview
            </p>
            <CodeBlock code={SKILL_PREVIEW} filename="SKILL.md" language="markdown" />
          </div>
        </div>
      </div>
    </section>
  );
};
