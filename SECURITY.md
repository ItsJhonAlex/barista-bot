# Security Policy

Barista is a Discord bot that holds **administrative permissions on third-party servers** and
handles sensitive secrets (bot token, OAuth credentials). We take security seriously and
appreciate responsible disclosure.

## Supported versions

The project is in early development. Until the first stable release, only the latest `main`
branch is supported with security fixes.

| Version | Supported |
|---------|-----------|
| `main` (pre-release) | ✅ |
| older snapshots | ❌ |

## Reporting a vulnerability

**Please do not open public issues for security vulnerabilities.**

Report privately to **itsjhonalex@gmail.com**. Include, where possible:

- A clear description of the vulnerability and its impact.
- Steps to reproduce or a proof of concept.
- Affected component (`bot`, `api`, `dashboard`, or a shared package) and version/commit.
- Any suggested remediation.

You can expect:

- An acknowledgement of your report within a reasonable timeframe.
- An assessment and, if confirmed, a fix prioritized by severity.
- Credit for the discovery if you wish, once a fix is available.

## Disclosure

We follow **coordinated disclosure**: please give us a reasonable window to investigate and
release a fix before any public disclosure. We will keep you informed of progress.

## Scope and good practice

Because of the bot's privileged access, the following are treated as high-severity classes:

- Missing or bypassable per-action authorization (acting on a server without verifying the
  user's permission over that server at that moment).
- Exposure of secrets (bot token, OAuth secrets, database credentials) to the browser, URLs,
  or logs.
- Privilege escalation through the module system or command preconditions.
- Injection or unvalidated input reaching Discord actions or the database.

When testing, never target servers or accounts you do not own or have explicit permission to
test, and never use real user data.
