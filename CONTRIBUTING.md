# Contributing to Barista

Thanks for your interest in contributing! This document describes how to set up the project,
the conventions we follow, and the rules that keep the codebase coherent and secure.

By participating, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

> **Status:** the project is in active bootstrap. Some tooling described here is being set up;
> if a command doesn't exist yet, check the latest `main`.

## Project layout

Barista is a **Bun-workspaces monorepo**:

```
barista/
├─ apps/        bot, api, dashboard      # runnable applications
└─ packages/    core, db, discord, config, ui   # shared libraries (@barista/*)
```

- `apps/bot` — Discord Gateway client (discord.js + Sapphire); runs modules.
- `apps/api` — dashboard backend (Hono on Bun); OAuth2 via Discord.
- `apps/dashboard` — React + Vite single-page app.
- `packages/core` — module contract, registry, and per-guild event router.
- `packages/db` — PostgreSQL + Drizzle ORM.
- `packages/discord` — REST/permissions/hierarchy layer with rate-limit handling.
- `packages/config` — environment validation (fails fast on missing secrets).

## Getting set up

1. Install [Bun](https://bun.sh).
2. Install dependencies: `bun install`.
3. Copy the example environment file and fill in your secrets (never commit real secrets).
4. Bring up local infrastructure (PostgreSQL + Redis) via `docker compose up`.
5. Run the checks: `bun run lint`, `bun run typecheck`, `bun run test`.

## Hard rules (non-negotiable)

These protect the security and integrity of the system. PRs that violate them will not be
merged.

1. **Database boundary.** `@barista/db` exposes two subpaths: `./schema` (types and table
   definitions — safe anywhere) and `./client` (the credentialed client — server only). The
   **`dashboard` must never import `@barista/db/client`.**
2. **Per-action authorization.** Every dashboard/API action that affects a server must verify
   that the user has permission over **that** server at **that** moment — not just that they
   have a valid session.
3. **Secrets stay on the server.** The bot token, OAuth secrets, and database credentials must
   never appear in the frontend bundle, in URLs, or in logs. All environment access goes
   through `@barista/config`.
4. **Strict TypeScript.** Strict mode is on across the repo. Avoid `any` (use `unknown` plus
   validation); prefer derived types (`$inferSelect`, `z.infer`) over hand-written duplicates.

## Coding conventions

- **Language:** identifiers in English; user-facing strings in the product's display language.
- **Formatting/linting:** run the configured formatter and linter before pushing. No
  `console.log` in committed code — use the structured logger.
- **Naming:** module ids in kebab-case (stable — they are database keys); commands are clear
  English verbs (`warn`, `rank`) with subcommands for grouping (`/schedule add`); REST
  endpoints are plural and versioned (`/api/v1/guilds/:id/channels`).
- **No leaking the codename into technical identifiers** (tables, module ids, event keys) —
  the product name is provisional.

## Writing a module

A module is a package `@barista/module-<id>` that default-exports an object implementing the
`BaristaModule` contract: a `manifest` (id, name, version, required bot permissions,
dependencies, category), a Zod `configSchema` (which drives the auto-generated settings form),
event handlers, slash commands with preconditions, and optional lifecycle hooks. Modules never
attach to raw discord.js listeners — the core router dispatches events and applies the
per-guild gate. Cover the core logic with tests and mock the Discord layer.

## Testing

We keep a test pyramid:

- **Unit (Vitest)** — registry, event router, per-guild gate, preconditions, schema
  validation, and utilities.
- **Integration (Vitest)** — persistence, pub/sub, and cache invalidation against ephemeral
  PostgreSQL/Redis.
- **End-to-end (Playwright)** — dashboard flows: login, server selection, module toggle, and
  the config form.

Tests must be **deterministic** and must **mock the Discord layer** — nothing should depend on
the real Discord network. The core and critical endpoints must have tests.

## Commits and branches

- **Conventional Commits** with an optional scope: `feat(core): …`, `fix(module-leveling): …`.
  Types: `feat | fix | docs | refactor | test | chore | build`.
- **Trunk-based, lightweight:** `main` stays deployable. Work on short branches `feat/…` or
  `fix/…` and open a pull request.
- Keep commits focused; explain the *why* in the body when it isn't obvious.

## Pull requests

1. Branch from `main`.
2. Make your change with tests; keep the diff focused.
3. Ensure `lint`, `typecheck`, and `test` pass locally.
4. Fill in the PR template, describing what changed and how you verified it.
5. A maintainer reviews; address feedback, then it's merged once CI is green.

## License

By contributing, you agree that your contributions will be licensed under the project's
[AGPL-3.0 license](LICENSE).
