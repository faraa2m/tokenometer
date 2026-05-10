---
"tokenometer": patch
"@tokenometer/core": patch
---

Fix `tokenometer --version` always printing `0.0.2` regardless of the
installed version. The CLI had a hardcoded `const VERSION = '0.0.2'`
left over from initial scaffolding. Now reads the version from the
package's own `package.json` at runtime via `import.meta.url`.

Also hardens the smoke-test job: switches from `npx --yes tokenometer@<v>`
(which hit `sh: 1: tokenometer: not found` flakiness on Linux runners
even when the published bin had the execute bit) to `npm install
--no-save` + direct `node node_modules/tokenometer/dist/index.js`.
Adds a 6-attempt × 30s retry loop to absorb npm registry CDN
propagation lag right after publish.
