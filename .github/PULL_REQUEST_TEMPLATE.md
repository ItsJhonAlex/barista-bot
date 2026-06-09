# Description

<!-- What does this PR change and why? Link any related issue: Closes #123 -->

## Type of change

- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `docs` — documentation only
- [ ] `refactor` — no behavior change
- [ ] `test` — tests only
- [ ] `chore` / `build` — tooling, deps, CI

## How was this verified?

<!-- Commands run and their outcome. Don't assume green — paste/confirm results. -->

- [ ] `lint`
- [ ] `typecheck`
- [ ] `test`

## Checklist

- [ ] Follows the conventions in [CONTRIBUTING.md](../CONTRIBUTING.md).
- [ ] Commit messages follow Conventional Commits (`type(scope): …`).
- [ ] The `dashboard` does not import `@barista/db/client` (server-only boundary).
- [ ] Server-affecting actions verify per-action authorization.
- [ ] No secrets in the frontend bundle, URLs, or logs.
- [ ] Tests added/updated for the core logic and critical endpoints touched.
- [ ] The Discord layer is mocked in tests (no real network).
