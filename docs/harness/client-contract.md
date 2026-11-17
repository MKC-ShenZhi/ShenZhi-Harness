# Electron workbench contract with Harness

Based on `apps/szh-app/electron/main.ts`, `preload.ts`, and `src/lib/api/{harness,datasource,contract}.ts(x)` in the full project. The client uses TypeScript, React, HashRouter, and TanStack Query, and is built separately from the legacy preview. Electron injects `window.szhDesktop.harnessUrl`, default `http://127.0.0.1:4782`, overridable with `SZH_HARNESS_URL`. A non-Electron Vite dev page proxies same-origin `/api`. The current renderer CSP allows HTTP to loopback. A remote address also needs a client CSP review. An authorized operator can reach a remote deployment through local forwarding. The backend does not ship an SSH tunnel.

| Operation | Data contract | Client behavior |
| --- | --- | --- |
| Connection | `GET /api/health` | Separates HTTP reachability from “model configured”. A configuration does not mean the model is usable |
| Solution list and detail | `GET /api/v1/solutions`, `GET /api/v1/solutions/{id}/versions` | Group by manifest.id and sort by semantic version. Raw records are returned per version |
| Publish | CLI writes the registry | HTTP import is always 403. The client cannot publish |
| Configuration and validation | `input_schema`, `POST .../{version}/validate-input` | Render schema controls the client understands. The server validates the final input. The client maps AJV message text onto fields when it can |
| Create a run | `POST /api/v1/runs` | Sends solution_id, version, input, and request_id. source_run_id is optional. A retry of the same request reuses the id |
| Status and cancel | `GET /api/v1/runs[/{id}]`, `POST /api/v1/runs/{id}/cancel` | Polls the snapshot. The visible timeline is derived from created_at, started_at, and finished_at. After cancel is accepted, keep reading the final status |
| Artifact | `artifacts` on the run, `GET .../artifacts/{artifactId}/download` | Infer a type from the extension. Show name and size. Download returns file bytes |
| AI chat | `GET /api/tasks[/{id}]`, `POST /api/tasks` (general), `POST /api/tasks/{id}/messages`, `POST .../messages/stop`, `DELETE /api/tasks/{id}` | Only tasks with parser_type `general` are chats. The client polls message snapshots, can stop a reply, and can delete a finished chat |

The default data source is Harness unless `?data=mock`, Electron `SZH_DATA=mock`, or a saved mock preference is set. Switching creates a new query cache. Mock status, timelines, and artifacts never enter the real service. An unreachable network maps to `network_unreachable`. HTTP errors read `data.code` and `data.message`. The UI keeps a disconnected notice and lets the user choose the data source.

## Current gaps

- The frontend understands UI annotations such as `x-advanced` and `x-unit`. Registry registration uses strict AJV and rejects unknown keywords. Current production definitions use supported schema keywords. A shared annotation shape is still undecided.
- The service does not provide real stages, percentages, pause, waiting for confirmation, GPU usage, or a live log push. `Run.events` is empty. Do not present a derived timeline or mock steps as a real execution log.
- Artifacts have no shared MIME type, provenance, paging, archive cleanup, or a streaming write. A failed download should show the real HTTP error.
- Solutions have no upload, authorized publish, favorite sync, remote resource probe, or chat-level specialist execution permission. The service has no authentication by default and is for a trusted local machine.
- `/api/solutions` is the legacy static catalog. The new catalog is `/api/v1/solutions`. A new data directory returns an empty array until something is registered.

Routes, errors, and request shapes: [HTTP API](api.md).
