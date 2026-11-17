# ShenZhi Harness

Tasks, solution registration, runs, artifacts, and the NOTAM and AIC specialist paths. The workbench talks only to this service's HTTP API.

```bash
# from the repository root
npm ci
npm start
npm test
```

Default `http://127.0.0.1:4782`. Model, port, and AIC settings are in the root [README](../../README.md). Keep API keys out of this tree.

## Modules

| File | Responsibility |
|------|------|
| `main.mjs` | HTTP routes, request-body checks, error envelope, legacy preview allowlist |
| `tasks.mjs`, `dsh-runner.mjs` | NOTAM, general chat, one DSH turn |
| `solution-registry.mjs` | Manifest checks and version records that cannot be overwritten |
| `solution-runs.mjs` | Run queue, executor, artifact metadata |
| `knowledge.mjs` | Document index search |

Collaboration rules: [AGENTS.md](AGENTS.md). Architecture: [docs/engineering/architecture.md](../../docs/engineering/architecture.md). Routes: [docs/harness/api.md](../../docs/harness/api.md). Workbench fields: [docs/harness/client-contract.md](../../docs/harness/client-contract.md).
