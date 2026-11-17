# ShenZhi Harness

> ShenZhi Harness is an agent framework for researching domain-specific tasks. It registers a domain solution as a versioned research unit, runs it on this machine, and keeps the artifacts. Two specialist paths remain: NOTAM review and AIC archives.
>
> This repository is that system. `apps/server` is the Harness HTTP service. `apps/szh-app` is the Electron + React workbench. Both HTTP surfaces share one process and keep separate state.

---

## Quick start

Requires Node.js 22.19 or newer, and npm. Start Harness from the repository root:

```bash
npm ci
npm start          # default http://127.0.0.1:4782
```

Confirm the service with `GET /api/health`. By default it reads and writes a local `var/` directory and restores or marks interrupted records on startup. Listing status and registered solutions does not need model credentials. Real chat and NOTAM reasoning need a model configured from [.env.example](.env.example). Do not commit `.env` or any API key.

Workbench (optional; browse solutions, runs, and artifacts):

```bash
cd apps/szh-app
npm ci
npm run dev:desktop    # Vite hot reload + Electron
# or build, then start:
npm run build && npm start
```

On Windows, `Start-SZH-Next.cmd` in the repository root installs dependencies, starts Harness, and opens the workbench. `rebuild` forces a rebuild. `mock` uses the demo data source.

> New contributors: start with [ONBOARDING.md](ONBOARDING.md). Collaboration rules are in [AGENTS.md](AGENTS.md).

The workbench connects to `http://127.0.0.1:4782` by default. The desktop app uses hash routes, for example `#/solutions`.

---

## Architecture

```
Workbench apps/szh-app (Electron renderer)
  │  HTTP only. It never calls the model directly.
  ▼
127.0.0.1:4782 ──── apps/server/main.mjs
  │
  ├── /api/tasks          legacy tasks: NOTAM parsing, general chat, AIC archive view
  │     └── DSH SDK → model service / specialist plugins / document index
  │
  └── /api/v1             solution registry, runs, artifacts
        └── SolutionRegistry + RunService
              └── local executor (text self-test or AIC Python subprocess)
  │
  ▼
var/   tasks, runs, conversations, dsh, solution-versions, solution-runs
```

| Entry | Location | Role |
|------|------|------|
| Harness | `apps/server` | Node HTTP. Legacy tasks and versioned runs |
| Workbench | `apps/szh-app` | Electron + React. Solutions, runs, artifacts, chat |
| Legacy preview | `apps/client` | Older web preview and static assets, kept for regression |
| Domain solutions | `solutions/` | NOTAM, AIC, and their manifests |

Opening the service root in a browser redirects to the legacy web preview, which depends on frontend build output from the full project. The new workbench talks to the JSON API directly. Architecture and data directories: [docs/engineering/architecture.md](docs/engineering/architecture.md). Client fields: [docs/harness/client-contract.md](docs/harness/client-contract.md).

---

## Local runtime boundary

The service is for a trusted local machine. It has no user authentication or access control. It listens on `127.0.0.1` only.

1. Put model credentials in the root `.env`, or point `SZH_MODEL_ENV_FILE` at a private file. Precedence is process environment, then root `.env`, then the private file. If no private file is set, it looks for `.config/szh/model.env` under the user directory, then the older `.config/autoresearch/glm.env`.
2. Copy `.env.example` only to prepare the model settings. Port and AIC options are read from the process environment. Copying the example does not activate them. Leave `SZH_MODEL_API_KEY` empty in any file that might be shared.
3. Solutions are published with the maintainer CLI. `POST /api/v1/solutions/import` always returns 403. An existing version cannot be overwritten.
4. `var/` holds tasks, runs, and artifacts and is not part of the repository. Sandbox runs use a new temporary directory. Do not pass `--fresh` against the project directory. Personal chats and run records stay in that data directory and are not part of this source tree.

| Variable | Purpose |
|------|------|
| `SZH_MODEL_PROVIDER`, `SZH_MODEL`, `SZH_MODEL_BASE_URL`, `SZH_MODEL_API_KEY`, `SZH_MODEL_REASONING_EFFORT` | DSH model route, credentials, and reasoning effort |
| `AUTORESEARCH_MODEL`, `AUTORESEARCH_MODEL_BASE_URL`, `AUTORESEARCH_MODEL_API_KEY` | Compatibility fallback for older configuration |
| `SZH_PORT` | HTTP listen port, default 4782 |
| `SZH_HARNESS_URL` | Harness URL used by the workbench, default `http://127.0.0.1:4782` |
| `SZH_DATA` | Workbench data source: `harness` or `mock` |
| `SZH_AIC_MATERIALS` | Legacy AIC archive directory. Obtain it under a separate authorization |
| `SZH_AIC_PYTHON`, `SZH_AIC_PACKAGE` | Python interpreter and controlled package directory for the AIC adapter. Set both |
| `SZH_AIC_MODEL_PACKAGE_URL` | Optional delivery link for an older archive result |
| `SZH_SERVICE_URL` | Service URL used by the legacy material-evaluation script |

---

## Workbench routes

| Route | Page | Implementation |
|------|------|----------|
| `#/` | Home | [HomePage.tsx](apps/szh-app/src/features/home/HomePage.tsx) |
| `#/plan` | Research plan | [PlanPage.tsx](apps/szh-app/src/features/home/PlanPage.tsx) |
| `#/solutions` | Solution library | [ExplorerPage.tsx](apps/szh-app/src/features/solutions/ExplorerPage.tsx) |
| `#/solutions/:id` | Solution workspace (overview / run / records / develop) | [WorkspacePage.tsx](apps/szh-app/src/features/solutions/WorkspacePage.tsx) |
| `#/runs` | Run list | [RunPages.tsx](apps/szh-app/src/features/runs/RunPages.tsx) |
| `#/runs/:id` | Run page | [RunPages.tsx](apps/szh-app/src/features/runs/RunPages.tsx) |
| `#/artifacts` | Artifact list | [ArtifactPages.tsx](apps/szh-app/src/features/artifacts/ArtifactPages.tsx) |
| `#/artifacts/:runId/:artifactId` | Artifact viewer | [ArtifactPages.tsx](apps/szh-app/src/features/artifacts/ArtifactPages.tsx) |
| `#/conversations` | AI chat | [ConversationsPage.tsx](apps/szh-app/src/features/assistant/ConversationsPage.tsx) |
| `#/settings` | Connection and data source | [SettingsPage.tsx](apps/szh-app/src/features/settings/SettingsPage.tsx) |

`#/solutions/:id/run` redirects to the workspace run tab. Pages read and write data only through `src/lib/api/queries.ts`. The demo data source computes in the browser. Those records are marked Demo and are not written to Harness.

HTTP paths, error codes, and request bodies: [docs/harness/api.md](docs/harness/api.md).

---

## Register, test, and integrate

```bash
node scripts/import-solution.mjs solutions/aic-flowproxy/manifest-v01.json
npm test
```

The import command writes `var/solution-versions` by default. A second argument selects another registry directory. Registration only validates the definition. It does not mean the model environment can run. In the default test suite, four legacy AIC archive tests skip when the authorized samples are absent. With the materials available, set `SZH_AIC_MATERIALS` and run `node --test tests/aic-entry.test.mjs`. Tests use a stand-in model or a fixed archive and do not need live credentials.

```bash
node apps/szh-app/scripts/harness-sandbox.mjs --port 4790 --dir <a new temporary directory>
```

The sandbox starts the real HTTP routes and a local text word-frequency self-test. You can create a run, cancel it, and download files. Use a dedicated temporary directory. Without credentials, run only this self-test to check the basic path.

`npm run check` verifies archive PDFs, citations, and sample consistency. First obtain the PDFs from the publisher URLs listed in `knowledge/sources.json` and place them at each `local_path`. `npm run samples:load` and `npm run evaluate:materials` are historical tools from the full delivery project and need authorized materials in an isolated environment.

---

## Stack

| Area | Technology | Status |
|------|------|------|
| Harness | Node.js ≥ 22.19, native HTTP (`apps/server/main.mjs`) | In use |
| Model execution | DSH SDK (`@deepseek-ai/dsh`) | In use. Without credentials, only queries and the self-test are available |
| Solution validation | AJV 8 | In use |
| Workbench | Electron + React 19 + TypeScript + Vite | In use |
| Server data | TanStack Query v5 | In use |
| Routing | React Router 7 (HashRouter) | In use |
| Icons | Lucide React | In use |
| Domain execution | Local Python subprocess (AIC adapter, configured separately) | Depends on the environment |
| Auth / remote scheduling / run event stream | — | Not provided |

Capability map: [docs/engineering/status.md](docs/engineering/status.md). Release gates: [docs/engineering/tech-debt.md](docs/engineering/tech-debt.md).

## Layout

```
szh-harness/
├── apps/
│   ├── server/            # Harness: tasks, registry, runs, artifacts
│   ├── szh-app/           # Electron workbench. features/ holds pages, lib/api holds data access
│   └── client/            # Legacy web preview, kept for regression
├── solutions/             # Domain solutions: aviation-notam, aic-flowproxy
├── plugins/               # Specialist tools (NOTAM schema)
├── knowledge/             # Document index and citations
├── contracts/             # Interface samples and domain agreements
├── evaluation/            # NOTAM / report regression samples
├── scripts/               # Import, checks, evaluation, runtime entry
├── tests/                 # Harness regression
├── docs/
│   ├── engineering/       # Architecture, capability status, tech debt, Git conventions
│   └── harness/           # HTTP API and client contract
├── AGENTS.md
├── ONBOARDING.md
└── README.md
```

## Development conventions

### Names

| Target | Convention | Example |
|------|------|------|
| Harness modules | kebab-case | `solution-runs.mjs`, `dsh-runner.mjs` |
| Workbench files | PascalCase components; feature folders are a word or kebab-case | `SolutionCard.tsx`, `features/runs/` |
| Functions / variables | camelCase | `createRun` |
| Types / interfaces | PascalCase | `Run`, `SolutionVersion` |
| Environment variables | `SZH_` prefix | `SZH_PORT`, `SZH_HARNESS_URL` |
| Solution ids | kebab-case | `aviation-notam`, `aic-flowproxy` |

### Boundaries

```
Pages and interaction   apps/szh-app/src/features     data access only through lib/api/queries.ts
Data adapters           apps/szh-app/src/lib/api      harness.ts for HTTP, mock.ts for the demo
HTTP and validation     apps/server/main.mjs          routes, bodies, error envelope
Task path               tasks.mjs / dsh-runner.mjs    NOTAM, chat, legacy AIC archive
Solution path           solution-registry.mjs         versions cannot be overwritten
Run path                solution-runs.mjs             run queue, executor, artifacts
Domain definitions      solutions/ and plugins/       manifests, rules, and tools
```

The workbench does not run specialist models and does not call DSH directly. When adding a backend field, check [docs/harness/api.md](docs/harness/api.md) first, then update the mapping in `harness.ts`.

### State and style

- Server state uses TanStack Query. Local component state uses `useState`. Cross-page UI state stays in `src/app/ui-state.tsx`.
- Raw colors belong only in `apps/szh-app/src/styles/tokens.css`. Components use existing tokens.
- Mock and Harness must stay distinguishable. Demo records keep the Demo mark. A derived timeline is not a real execution log.

---

## Known limits

- A run currently has status and timestamps only. There are no stages, percentages, or a log stream. The execution log is an artifact after success.
- A cancel request is not persisted. After a refresh, the server status is the source of truth.
- The client cannot probe whether the execution environment is ready before submit. Environment problems are returned when the run is created.
- Registration uses strict JSON Schema and rejects unregistered annotations such as `x-advanced`.
- General remote scheduling, pause, asset upload, artifact lifecycle, and multi-user permissions are not provided.

Details and verification notes: [capability status](docs/engineering/status.md) and [tech debt](docs/engineering/tech-debt.md).
