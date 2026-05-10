---
"tokenometer": patch
"@tokenometer/core": patch
---

Fix CLI bin missing execute bit when published from CI. Root `npm run
build` runs `tsc -b` without recursing into workspace scripts, so the
chmod added in the CLI's build script never ran in CI. Added a `prepack`
hook in `packages/cli/package.json` that chmods `dist/index.js` right
before `npm publish` packs the tarball — runs regardless of how the
build was invoked.
