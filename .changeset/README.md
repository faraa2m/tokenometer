# Changesets

Tokenometer uses [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs.

## How to add one

When opening a PR that warrants a release entry, run:

```bash
npx changeset
```

You'll be prompted to:
1. Pick which packages changed (`tokenometer` and `@tokenometer/core` are version-fixed — bumping one bumps both).
2. Pick the bump type:
   - `patch` — bug fix, internal refactor, doc fix
   - `minor` — new flag, new provider, new format, new output type
   - `major` — breaking CLI flag rename, breaking API change, dropped provider
3. Write a one-line summary (this becomes the CHANGELOG entry).

The command writes a `<random>.md` file in this directory. Commit it in the same PR.

## What happens on merge to main

The `release` GitHub Actions workflow runs automatically:

1. If any changeset files are present in `.changeset/`, the workflow opens (or updates) a **Version Packages** PR.
   - That PR bumps `package.json` versions for `tokenometer` and `@tokenometer/core` (fixed group).
   - It auto-generates `CHANGELOG.md` entries from the changeset summaries.
   - It deletes the consumed `.changeset/<random>.md` files.
2. When the Version Packages PR is merged, the workflow publishes the bumped versions to npm with provenance.
3. A GitHub Release is created on the new tag — this is what the GitHub Marketplace listens to for the Action.

## Ignored packages

`@tokenometer/web` and `@tokenometer/action` are listed under `ignore` in `config.json`. They aren't published to npm directly:

- `@tokenometer/web` is the playground — deployed to Vercel, not versioned on npm.
- `@tokenometer/action` ships as a JavaScript Action via the repo tag. Its release is driven by the GitHub Release event, not npm.

If you change either, you don't need a changeset. If your change *also* touches `@tokenometer/core` or the CLI, do add a changeset for those.

## Why fixed-group?

`tokenometer` (the CLI) depends on `@tokenometer/core` directly. Letting them drift confused users who'd `npm install tokenometer@latest @tokenometer/core@latest` and end up on incompatible majors. Fixing the group means one version number tracks both.
