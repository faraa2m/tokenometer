---
"tokenometer": minor
"@tokenometer/core": minor
---

Unified release pipeline (Phase I): one merge of the Version Packages PR
publishes tokenometer + @tokenometer/core to npm with provenance, creates
the GitHub Release (which republishes the Action to GitHub Marketplace),
publishes the VS Code extension to VS Code Marketplace + Open VSX, runs
a post-publish smoke test, verifies the Marketplace listing, and triggers
the Vercel deploy hook. Local `npm run smoke` runs the full sweep (lint,
typecheck, test, build, benchmarks, CLI smoke).
