---
"tokenometer": patch
"@tokenometer/core": patch
---

Fix `tokenometer` CLI not invokable via `npx` on Linux. The published
`dist/index.js` had no execute bit, so `npx --yes tokenometer@<v>` on
Linux runners failed with `sh: 1: tokenometer: not found`. Build script
now chmods +x after tsc emit.
