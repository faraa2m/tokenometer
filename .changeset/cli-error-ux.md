---
"tokenometer": patch
"@tokenometer/core": patch
---

CLI error UX polish: known user errors (missing API key, unknown model, unknown format) now print a clean one-line `tokenometer: <message>` instead of dumping a Node stack trace under "Unexpected error:". Bad flag / format / output errors now print a short `Run 'tokenometer --help' for usage.` hint instead of dumping the full help body.

- New `UserFacingError` class in `@tokenometer/core` (exported); thrown by `getModel` / `getRate` for unknown ids and by empirical / latency `requireKey` for missing provider keys.
- CLI catches `UserFacingError` at both `main()` and the IIFE entry point, so programmatic callers also get a clean exit code (1) instead of a rejected promise.
- Existing exit-code semantics preserved: `2` for argv parse errors (bad flag / format / output), `1` for runtime user errors (unknown model, missing key, missing file, config error).
