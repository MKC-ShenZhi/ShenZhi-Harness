# ShenZhi workbench

Desktop client for ShenZhi Harness (Electron + React + TypeScript): solution library, solution workspace (overview / run / records / develop), run page, artifact viewer, AI side panel, and chat. The client talks to Harness (`apps/server`) over HTTP only. It does not run a specialist model itself.

Project overview: [README](../../README.md). Collaboration rules: [AGENTS.md](AGENTS.md).

## Requirements

- Node.js 22.19 or newer (verified on 24.22.1), and npm.
- Windows 10/11 (primary verified platform). macOS and Linux can build. They are not systematically verified.

## Start

```sh
# 1. Backend (repository root)
npm ci
npm start                      # Harness, default http://127.0.0.1:4782

# 2. Client (apps/szh-app)
cd apps/szh-app
npm ci
npm run build && npm start     # build, then start Electron
# or development (Vite hot reload + Electron):
npm run dev:desktop
```

On Windows, double-click `Start-SZH-Next.cmd` in the repository root. It installs dependencies, starts Harness if it is not running, builds once, and opens the client. `rebuild` forces a rebuild. `mock` starts with the demo data source.

| Variable | Effect |
|---|---|
| `SZH_HARNESS_URL` | Harness URL, default `http://127.0.0.1:4782` |
| `SZH_DATA` | `mock` or `harness`, the data source at startup (also switchable in Settings) |

### When nothing is published

A new Harness data directory has an empty solution registry. You can:

- Use an isolated sandbox (preferred; it does not write the project `var/`): `node scripts/harness-sandbox.mjs --port 4790 --dir <a new temporary directory>`, then start the client with `SZH_HARNESS_URL=http://127.0.0.1:4790`. The sandbox publishes a text word-frequency self-test (real execution; JSON, CSV, PNG, and a log) and an AIC solution (a run fails honestly when PyTorch is not configured).
- Or switch to the demo data source in Settings. Demo data is computed in the browser. Every record is marked Demo.

## Common commands

```sh
npm run typecheck   # TypeScript check (renderer + electron)
npm test            # Vitest unit tests
npm run build       # write dist/ and dist-electron/
npm run capture -- --data harness --harness http://127.0.0.1:4790   # capture Electron pages by route
```

## Code layout

```text
electron/        main process (window, downloads, capture mode) and preload (a small bridge)
src/app/         routing and cross-page UI state
src/lib/api/     DataSource interface; harness.ts (real backend) and mock.ts (demo); queries.ts (all read and write hooks)
src/components/  design system (ui/) and domain components
src/features/    pages: home, solutions, runs, artifacts, assistant, settings
src/styles/      tokens.css is the only place that may contain raw color values
```

Pages reach data only through the hooks in `lib/api/queries.ts`. When adding a backend field, update the contract (`contracts/openapi/`) first, then the mapping in `harness.ts`.

## Known limits

These are capabilities the backend does not provide yet. The client degrades explicitly and does not show invented data:

- **During a run:** Harness reports status and timestamps only. There is no live log, stage, or progress. The status record on the run page is assembled from timestamps. The execution log is an artifact after success. A failed run has no log.
- **Cancel:** The backend does not persist “cancelling”. The client keeps that state on this page until a terminal status. After refresh it shows the backend status.
- **Solution readiness:** The client cannot know whether the execution environment is available before submit. “Environment unavailable” arrives only when the run is created.
- **Forms:** Harness rejects UI annotations such as `x-advanced` at registration, so real solution parameters are flat. File inputs, arrays, and nested objects are not supported.
- **AI assistant:** Which chat belongs to which page is stored only on this machine. Page facts are attached as text on the first message. The model cannot read artifact file contents. A reply can take several minutes. A finished chat can be deleted from the chat list. Personal chats are local data and are not part of the source tree.
- **Lists:** The run list is read in full each time. A large history gets slow.
- **Security:** Harness has no authentication and is for a trusted local machine. Do not expose the port to a network.
- **NOTAM and the legacy AIC archive:** Still carried by the old client (`Start-SZH.cmd`, `Open-SZH-Desktop.cmd`). The new client does not show them.
