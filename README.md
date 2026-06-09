# Barista

> **Barista** is a **modular Discord bot** governed entirely from a **web dashboard**.
> Design and administer your servers (channels, roles, permissions), install features as
> **modules/plugins**, and enable or disable them **per server** or **globally** — without
> restarting the bot.

> ⚠️ **Status: early / foundational.** The project is in active bootstrap. APIs, schema and
> module contract may change until the first stable milestone.

> ℹ️ `Barista` is a **provisional codename**. The architecture does not depend on it, so the
> product name may change without affecting the data model or the module contract.

---

## Why Barista

Running a Discord server of any size means juggling the Discord app (channels, roles,
permissions, AutoMod) and several bots, each with its own limited web panel. Every bot solves
one slice, none integrate, and your configuration ends up scattered.

Barista unifies that into **one modular bot** driven from **one web dashboard**. The operator
designs and administers the server and turns capabilities on or off as **modules** — per
server or globally. The differentiator versus commercial bots: **the contract is yours** (you
can write your own modules) and everything lives in a single installation you control.

## Features

- **Full web control of administration** — create, edit, reorder and delete channels,
  categories and roles, and adjust permission overwrites, without opening the Discord app.
- **Real modularity** — adding a module never requires touching the core: implement the
  contract and drop it into the modules folder.
- **Per-server and global toggle** — enabling/disabling a module takes effect in seconds and
  **without restarting** the process.
- **Frictionless configuration** — each module's settings form is **auto-generated** from its
  schema; adding an option requires no UI work.
- **Secure by default** — no dashboard action runs without verifying that the user has
  permission over **that** server at **that** moment.

## Architecture at a glance

Barista is a **monorepo** with three applications and shared packages:

| Layer | Package | Notes |
|-------|---------|-------|
| Bot | `apps/bot` | Connects to the Discord Gateway (discord.js + Sapphire); runs modules. |
| Backend API | `apps/api` | Dashboard backend (Hono on Bun); OAuth2 via Discord. |
| Frontend | `apps/dashboard` | React + Vite single-page app. |
| Core | `packages/core` | Module contract, registry, and per-guild event router. |
| Data | `packages/db` | PostgreSQL + Drizzle ORM. Module config stored as JSONB. |
| Discord | `packages/discord` | REST/permissions/hierarchy layer with rate-limit handling. |
| Config | `packages/config` | Environment validation (fails fast on missing secrets). |

Two communication planes talk to Discord: the **REST API** (with the bot token) executes
actions and does not require the bot to be connected, while the **Gateway (WebSocket)**
receives real-time events. **Redis** carries internal pub/sub between the API and the bot,
which keeps the hot path off the database and makes toggles near-instant.

```
                ┌─────────────┐        ┌──────────────┐
  Operator ───▶ │  dashboard  │ ◀────▶ │     api      │ ───▶ Discord REST
  (browser)     │ React + Vite│  REST  │ Hono on Bun  │ ───▶ PostgreSQL
                └─────────────┘   +WS   └──────┬───────┘
                                               │ Redis pub/sub
                                        ┌──────┴───────┐
              Discord Gateway ────────▶ │     bot      │ ───▶ Discord REST
                                        │ discord.js   │ ───▶ PostgreSQL
                                        └──────────────┘
```

## Tech stack

- **Runtime / packaging:** Bun workspaces, Docker Compose.
- **Bot:** Node.js + discord.js on Sapphire.
- **API:** Hono on Bun, OAuth2 with Discord.
- **Frontend:** React + Vite.
- **Data:** PostgreSQL + Drizzle ORM.
- **Validation:** Zod (config schemas drive auto-generated UI).
- **Messaging/cache:** Redis pub/sub.
- **Testing:** Vitest (unit + integration), Playwright (end-to-end).
- **Language:** TypeScript in strict mode across the monorepo.

## Scope

**In scope (v1):** designing and operating Discord servers where the bot is already present —
channels, categories, roles, permission overwrites, module management, slash commands provided
by active modules, audit logging, and real-time dashboard updates.

**Out of scope (v1):** creating servers from scratch at scale (Discord API limitation),
selfbots/user-account automation (against Discord ToS), a public third-party plugin
marketplace, and multi-tenant single installations. These are deferred or explicitly excluded.

## Getting started

> The bootstrap toolchain (workspaces, database, and services) is being set up. Once the
> initial scaffold lands, this section will document `bun install`, environment configuration,
> and `docker compose up`.

Planned local stack: `apps/{bot, api, dashboard}` plus `postgres` and `redis` services, wired
through Docker Compose, with environment variables validated at startup.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for the development
workflow, coding conventions, and the project's hard rules (security boundaries, testing
expectations, commit format). All participation is governed by our
[Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Found a vulnerability? Please follow the responsible-disclosure process in
[SECURITY.md](SECURITY.md). Because the bot holds administrative permissions on third-party
servers, security reports are taken seriously and handled privately.

## License

Barista is licensed under the **GNU Affero General Public License v3.0**. See [LICENSE](LICENSE)
for the full text. In short: you may use, study, modify and redistribute the software, but if
you run a modified version as a network service, you must make the corresponding source
available to its users.
