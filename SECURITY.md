# Security Policy

## Reporting a vulnerability

Please **do not** open public GitHub issues for security vulnerabilities.

Email the maintainer at **CONTACT@example.com** (replace with the published
contact address before release) with:

- a description of the issue and its impact,
- reproduction steps,
- browser and extension version.

We aim to acknowledge reports within **72 hours** and to provide a remediation
timeline within 14 days.

## Scope

In scope: the extension code in this repository (manifest v3 service worker,
content scripts, options/dashboard/onboarding pages).

Out of scope: third-party services the extension talks to only when you
configure them yourself (Volcengine Ark under your own API key), the Chrome Web
Store, and GitHub Pages hosting.

## Security-relevant design properties

- **Drafts only.** The extension never clicks a platform send button, never
  schedules messages, and takes no actions in user accounts.
- **No broad host access.** Content scripts are registered dynamically via
  `chrome.scripting` only on domains the user explicitly added through
  `optional_host_permissions`.
- **BYOK key is local.** The API key lives in `chrome.storage.local`; model
  requests are sent browser-to-provider and never through a server of ours.
- **PII masking.** Emails, phone numbers, card numbers and postal addresses are
  masked before model requests and restored locally on adopt.
- **Telemetry allowlist.** Only four event names with three enum fields can
  ever be sent (`src/core/telemetry.js`); message text is never included.
