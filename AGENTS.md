# ShenZhi Harness collaboration rules

This file applies to the whole repository. A more specific `AGENTS.md` in a subdirectory also applies there.

## Working principles

- Before changing code, read the relevant source and the notes in `docs/engineering/` and `docs/harness/`. Prefer the existing structure, implementation, and names.
- Change only what the current task needs. Do not refactor unrelated areas, invent a parallel architecture, or reimplement a capability that already exists.
- Keep the workbench and Harness apart. `apps/szh-app` owns pages, interaction, and presentation. Tasks, solution registration, runs, artifacts, and model calls live in `apps/server`.
- Keep pages thin. The workbench reads and writes data through `src/lib/api/queries.ts`. Do not scatter requests inside components.
- Domain solutions live in `solutions/`. Specialist tools live in `plugins/`. Do not put one domain's message rules into the generic run service.
- Do not present a capability the API does not provide as if it were implemented. Mock data must carry the demo mark and stay separate from the real mapping in `harness.ts`.
- Organize code for the actual complexity. Do not add layers, files, or abstractions that have no responsibility of their own.
- Keep the lockfiles already in the repository. Add a dependency only when it is necessary.
- After a change, run the checks or tests that match the scope. If architecture, a public interface, or a key development practice changes, update the related docs.

If a task clearly conflicts with the current architecture, state the conflict and its effect before making a substantial change.

## Two backend paths

- `/api/tasks`: NOTAM parsing, general chat, and the legacy AIC archive view. The source of truth is the task snapshot.
- `/api/v1`: solution versions, runs, and artifacts. The source of truth is the version record and the run snapshot.
- Both paths share `apps/server/main.mjs`. Their queues and disk directories are independent. Changing one does not imply the other behaves the same way.

## Data and secrets

- The service is for a trusted local machine. Do not bind it to a public address, and do not add a remote entry before access control exists.
- Model keys, `var/` runtime data, authorized PDFs, model weights, and experiment archives stay out of the repository. The commit scope is the allowlist in the root `.gitignore`.
- A sandbox must use a new temporary directory. Do not pass a flag that recursively deletes an existing data directory.

## Agent and local tool conventions

- A personal fork and remotes such as `origin` or `upstream` belong in the local `.git/config`. Do not write them into agent rules or docs in the repository.
- Do not change `git remote`, and do not commit personal Cursor rules (`.cursor/`), unless the user explicitly asks.
- Git practice follows [docs/engineering/git-conventions.md](docs/engineering/git-conventions.md).
