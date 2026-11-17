# ShenZhi Harness collaboration rules

This file applies to `apps/server/`. Also follow the repository [AGENTS.md](../../AGENTS.md).

## Backend constraints

- `main.mjs` owns routes, reading the request body, the error envelope, and the legacy preview allowlist. Put business rules in the matching module. Do not pile them into route branches.
- `/api/tasks` and `/api/v1` are two paths. Do not mix the task queue with the run queue, or the task directory with `solution-runs`.
- Manifest checks live in `solution-registry.mjs`. Execution, cancel, and artifact registration live in `solution-runs.mjs`.
- NOTAM mode selection, structured checks, and source-text review stay in the existing `notam-*.mjs`, `parsing.mjs`, and `report-parsing.mjs`. Do not copy message rules into the generic run.
- External models and specialist compute enter through the existing DSH call or a configured executor. If a key or runtime is missing, return a clear error. Do not substitute demo data.
- Read configuration from the existing environment variables and `.env`. Do not write secrets into source. When adding a setting, update `.env.example` and the variable table in the root README.
- There is no auth middleware. Do not add a listen mode that is reachable from another machine before access control exists.
- After a change, run `npm test` from the repository root, or `node --test tests/<name>.test.mjs` for the change.

If the interface shape, state machine, or on-disk layout changes, state the effect on `apps/szh-app` first and update `docs/harness/`.
