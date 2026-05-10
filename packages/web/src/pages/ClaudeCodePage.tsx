import { CodeBlock } from '../components/CodeBlock.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

const INSTALL_LINE = 'claude install skill faraa2m/tokenometer';

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

export const ClaudeCodePage = () => {
  usePageTitle('claude code', 'tokenometer skill for claude code');
  return (
    <section className="space-y-8 py-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
          ›claude code · skill (wave 3)
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">claude code skill</h1>
        <p className="mt-2 max-w-3xl text-[12.5px] text-[var(--tk-dim)]">
          A drop-in{' '}
          <a
            href="https://docs.anthropic.com/en/docs/agents/skills"
            className="underline decoration-[var(--tk-amber-dim)] underline-offset-4"
          >
            Claude Code skill
          </a>{' '}
          that gives the agent a token-cost calculator. Triggered automatically when you ask "how
          much does this prompt cost" or "is this version cheaper". Currently in development as part
          of Wave 3.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-x-6 gap-y-6">
        <div className="col-span-12 md:col-span-5 space-y-4">
          <div className="border border-[var(--tk-rule)] bg-[var(--tk-cell)] p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">install</p>
            <CodeBlock code={INSTALL_LINE} filename="bash" language="bash" />
            <p className="mt-3 text-[10.5px] text-[var(--tk-dim)]">
              Once published, this drops a SKILL.md into your `~/.claude/skills/` directory.
            </p>
          </div>
          <div className="space-y-2 text-[12.5px]">
            <p className="text-[var(--tk-fg)]">What it does:</p>
            <ul className="space-y-1 text-[var(--tk-dim)]">
              <li>· runs `npx tokenometer measure` on demand</li>
              <li>· cites rates_version + tokenizer in every reply</li>
              <li>· offline by default; opts into empirical with your keys</li>
            </ul>
          </div>
        </div>
        <div className="col-span-12 md:col-span-7">
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
            SKILL.md preview
          </p>
          <CodeBlock code={SKILL_PREVIEW} filename="SKILL.md" language="markdown" />
        </div>
      </div>
    </section>
  );
};
