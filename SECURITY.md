# Security Policy

## Reporting

Use **GitHub Private Vulnerability Reporting (PVR)**. Open this repo's Security tab and click **Report a vulnerability**. Reports are private and visible only to maintainers.

Do not file public issues for vulnerabilities. Public reports will be closed and re-filed privately.

We do not list a contact email. PVR is the only intake channel — this avoids email scraping and keeps the audit trail in one place.

## Supported versions

| Version | Status |
|---|---|
| `1.x` (latest minor) | Supported. Security fixes backported. |
| `0.0.x` (pre-1.0) | Best-effort only. Upgrade to `1.x` for fixes. |

## Disclosure timeline

Default coordinated-disclosure window is 90 days from the first acknowledgement. We can extend by mutual agreement when a fix needs more runway, or shorten if the issue is being exploited.

Typical flow:

1. Report received via PVR. Acknowledged within 7 days.
2. Maintainers reproduce and assess severity.
3. Fix developed in a private fork.
4. Fix released; advisory published; reporter credited (unless they prefer not to be).

## Out of scope

- Issues in dependencies (file those upstream; we'll bump after they land).
- Self-inflicted misconfiguration (e.g., committing your own API keys to a repo).
- Findings against `https://tokenometer.vercel.app` that result from the playground being a public read-only demo.

## Recognition

Reporters who follow this process are credited in the published advisory and the release notes for the fix, unless they ask to remain anonymous.
