# Tokenometer Claude Code skill

> Give Claude Code real token-cost awareness.

This package ships a [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skill
(`tokenometer-cost-check`) that teaches Claude Code agents to invoke the
`tokenometer` CLI for empirical prompt-cost measurement. With it
installed, Claude Code can answer "what does this prompt cost?" with a
real number sourced from provider `countTokens` APIs and the
[`tokenlens`](https://www.npmjs.com/package/tokenlens) pricing registry,
instead of guessing from `tiktoken`.

## Install

One-shot copy:

```bash
cp -R packages/claude-code-skill ~/.claude/skills/tokenometer
```

Or, for a one-file install:

```bash
mkdir -p ~/.claude/skills/tokenometer \
  && cp packages/claude-code-skill/SKILL.md ~/.claude/skills/tokenometer/
```

Or use the included installer:

```bash
./packages/claude-code-skill/install.sh
```

That writes `~/.claude/skills/tokenometer/SKILL.md`. Restart Claude Code
(or open a new session) and the `tokenometer-cost-check` skill becomes
discoverable.

## What's it do

The skill registers trigger phrases like "what does this prompt cost",
"is this cheaper as JSON or YAML", and "did my change increase prompt
cost". When matched, Claude Code knows to shell out to
`npx tokenometer …` instead of guessing — then surfaces real token
counts and USD cost across Claude / GPT-4o / Gemini, with an
honesty flag for approximate vs exact counts.

See [`SKILL.md`](./SKILL.md) for the full skill content (trigger
phrases, invocation patterns, output handling, and the empirical
findings the skill is allowed to cite).

## Skill registry

We'll submit this to the community skills registry once one stabilizes;
track issue [#TBD]. Until then, install via the copy / installer
commands above.

## License

MIT
