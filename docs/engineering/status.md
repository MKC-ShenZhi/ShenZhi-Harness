# Backend capability status

This table follows the source review and local verification on 2026-11-09, with later notes where the workbench behavior has changed. The stand-in model, historical archives, and the text self-test are marked separately.

| Capability | Status | Code | Verified behavior | Limit |
| --- | --- | --- | --- | --- |
| HTTP service and health | Implemented | `apps/server/main.mjs` | A real service starts and returns health | The model flag comes from configuration. `not_probed` does not check the upstream |
| Harness and NOTAM | Implemented, specialist coverage is limited | `tasks.mjs`, `dsh-runner.mjs`, `plugins/notam-schema.mjs` | Create, confirm, rule checks, save, and download. Tests inject a model response | That review did not call a live model. Specialist results still need review |
| Tools and knowledge | Basic capability implemented | `knowledge.mjs`, `plugins/notam-schema.mjs` | Document search and NOTAM validation regression | A document read reuses at most eight search hits. Later entries may be missed |
| AI chat | Implemented | `tasks.mjs`, `dsh-runner.mjs` | Stand-in tests cover multiple turns, stop, resend, and read after restart | No streaming reply and no user ownership. The workbench can stop a reply and delete a finished chat. Chat records stay in the local data directory |
| Legacy AIC | Archive assembly implemented | `aic-entry.mjs`, `aic-weekly-result.mjs` | Four historical samples from the original project passed regression | Depends on authorized materials. It does not run new inference |
| Solution registry | Basic capability implemented | `solution-registry.mjs`, `scripts/import-solution.mjs` | Versions persist, conflicts are rejected, queries work, illegal input is rejected | HTTP import is always 403. No asset upload, publish permission model, or version disable |
| Generic run | Partial | `solution-runs.mjs` | Unit stand-ins and an isolated HTTP text self-test cover create, idempotency, persistence, failure, and download | Single-process queue. No generic runner registry, resource isolation, or timeout policy |
| Run cancel | Partial | `solution-runs.mjs` | The text self-test can be cancelled. The response and the later status are read separately | The cancel request is not persisted. The subprocess tree, artifact collection, and shutdown timing still race |
| Task activity and run events | Partial | `task-activity.mjs`, `solution-runs.mjs` | Legacy activity tests have a real event shape. The run self-test API returns an empty `events` array | No run event route, stages, percentages, or log stream. The client derives a timeline from timestamps |
| Artifact | Basic capability implemented | `main.mjs`, `solution-runs.mjs` | Self-test output bytes download and match the recorded SHA-256 | Only id, run_id, name, size, sha256. No library, paging, or cleanup policy |
| AIC inference executor | Concrete implementation, environment-dependent | `solution-runs.mjs`, `scripts/aic/run_solution.py` | That review inspected the execution path only | Python, a remote host, and the model were not invoked. The adapter starts a subprocess on the service machine |
| Remote compute and user management | Not implemented | No related route or adapter | Source inspection | A remote deployment needs an operations path. No SSH scheduling, auth, multi-tenant isolation, or quota |
| Demo data | Frontend mock or static samples only | `apps/szh-app/src/lib/api/mock.ts`, `scripts/examples.mjs` | Data-source switching and read-only routes were reviewed | Not counted as Harness execution. The text word-frequency sandbox is a separate real local self-test |

## Verification record for that review

| Command or check | Result |
| --- | --- |
| Original project `npm test` | One full regression before the cleanup and one after. Both: 68 passed |
| Original project `npm run check` | SHA-256, sources, and contract samples matched for PDFs that were present |
| Original project `npm --prefix apps/szh-app test` | 38 Electron renderer unit tests passed, 21 of them covering the Harness data adapter |
| Original project `npm run runtime:help` | The DSH CLI started and printed help |
| Temporary snapshot `npm ci --no-audit --no-fund`, `npm test` | Reinstall from the lockfile succeeded. 64 passed. 4 legacy AIC archive tests skipped because the samples are not distributed with the repository |
| Temporary snapshot `node apps/server/main.mjs` | Started on an isolated port with no credentials. Health, legacy solutions, registered solutions, tasks, and runs all returned 200 |
| Temporary HTTP script via `node --input-type=module -` | Started the existing sandbox. Verified CLI import and conflict, legacy task create and query, version query, HTTP import 403, validation success and failure, run idempotency, run failure and cancel, and snapshot persistence. Four downloads matched in length and SHA-256. Both the original tree and a clean snapshot passed |
| `npm audit --omit=dev` | Dependency advisories found. See [tech debt](tech-debt.md) |

Tests used Node.js 24.22.1 and npm 11.19.1. Legacy model tasks and sessions are covered by stand-in tests. A live model call, AIC Python or remote compute, and manual desktop-window use were not run. Compatibility was checked with an API smoke test and frontend contract tests.
