---
"tokenometer": minor
"@tokenometer/core": minor
---

CLI gains:
- Auto provider detection when `--model` is omitted (picks based on which `*_API_KEY` env is set).
- `.tokenometer.yml` config loading (walk-up); `--no-config` and `--config <path>` overrides.
- `--by-file` per-file token/cost attribution table.
- `--output table|json|sarif` for machine-readable output.
- `--image <path>` (repeatable) for vision-token cost estimation across Claude / GPT-4o / Gemini.
