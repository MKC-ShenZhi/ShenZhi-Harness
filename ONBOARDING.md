# ShenZhi Harness onboarding

Welcome to ShenZhi Harness. This guide gets a local Harness and workbench running and points to the rest of the docs. Reading takes about 15 minutes. Setup takes about 20 minutes.

---

## 1. What this project is

ShenZhi Harness is an agent framework for researching domain-specific tasks. After a domain solution is registered, the local service runs it and leaves downloadable artifacts. The repository is one project:

```
szh-harness/
├── apps/
│   ├── server/         # Node Harness (tasks / solutions / runs / artifacts)
│   ├── szh-app/        # Electron + React workbench
│   └── client/         # Legacy web preview, for regression
├── solutions/          # Domain solution definitions
├── docs/               # Architecture, API, capability status
├── README.md           # Overview and runtime boundary
└── ONBOARDING.md       # This guide
```

**Boundary:** pages and interaction live in `apps/szh-app`. Execution, validation, and files live in `apps/server`. The workbench reaches Harness only over HTTP. It does not call a model or a specialist compute environment directly.

## 2. Read these three rules first

1. Root [AGENTS.md](AGENTS.md): repository-wide collaboration
2. [docs/engineering/git-conventions.md](docs/engineering/git-conventions.md): commit messages and what may be committed
3. The `AGENTS.md` in the directory you work in ([apps/server/AGENTS.md](apps/server/AGENTS.md), [apps/szh-app/AGENTS.md](apps/szh-app/AGENTS.md))

## 3. Local setup

### 3.1 Requirements

| Tool | Version | Notes |
|------|------|------|
| Node.js | ≥ 22.19 | Shared by the workbench and Harness |
| npm | Bundled with Node | The root and `apps/szh-app` each have a lockfile |
| Git | — | What may be committed is the allowlist in the root `.gitignore` |

Windows 10/11 is the primary verified platform. Real AIC inference also needs a local Python and a controlled runtime package. Queries and the text self-test do not.

### 3.2 Start Harness

```bash
npm ci
npm start                     # http://127.0.0.1:4782
```

Check:

```bash
curl http://127.0.0.1:4782/api/health
```

It starts without a model key. `model_configured` in the health check only means a configuration exists. It does not mean the upstream model is reachable.

For real chat or NOTAM reasoning, copy [.env.example](.env.example) to `.env` and set `SZH_MODEL_API_KEY` locally. Do not commit that file or paste the key into docs. The port and AIC material directory are not read from `.env`. Set them in the process environment.

### 3.3 Start the workbench

```bash
cd apps/szh-app
npm ci
npm run dev:desktop           # development
```

A new `var/` has an empty solution registry. Publish a text word-frequency self-test with an isolated sandbox:

```bash
node apps/szh-app/scripts/harness-sandbox.mjs --port 4790 --dir <a new temporary directory>
```

Then start the workbench with `SZH_HARNESS_URL=http://127.0.0.1:4790`. You can also switch to the demo data source in Settings. Demo data never enters the real service.

On Windows you can also double-click `Start-SZH-Next.cmd` in the repository root.

### 3.4 Register one solution

```bash
node scripts/import-solution.mjs solutions/aic-flowproxy/manifest-v01.json
```

Registration only validates the manifest. The HTTP import route always refuses the request. There is no publish button in the workbench.

### 3.5 Checks before a commit

```bash
npm test                                      # Harness regression
cd apps/szh-app && npm run typecheck && npm test
```

Run the checks for the layer you changed. If `SZH_AIC_MATERIALS` is unset, the four legacy AIC archive tests skip. That is expected.

## 4. Git

- Commit format: `<type>: <English description>`. `type` is `feat`, `fix`, `refactor`, `docs`, `chore`, or `test`.
- One commit has one clear purpose.
- Secrets, `var/`, PDFs, model weights, screenshots, and build output stay out of the repository. `.gitignore` is an allowlist. A new path must be allowed explicitly.
- Full rules: [docs/engineering/git-conventions.md](docs/engineering/git-conventions.md).

## 5. Where to look

| Question | Where |
|----------|------|
| How to start, environment variables, runtime boundary | [README.md](README.md) |
| How modules split, where data is written | [docs/engineering/architecture.md](docs/engineering/architecture.md) |
| Whether a capability exists | [docs/engineering/status.md](docs/engineering/status.md) |
| HTTP paths and error codes | [docs/harness/api.md](docs/harness/api.md) |
| How workbench fields map to the backend | [docs/harness/client-contract.md](docs/harness/client-contract.md) |
| Workbench pages and known degradations | [apps/szh-app/README.md](apps/szh-app/README.md) |
| Security and stability gates before release | [docs/engineering/tech-debt.md](docs/engineering/tech-debt.md) |

## 6. Common pitfalls

1. **Copied `.env.example` but the port did not change.** `SZH_PORT` and the AIC variables are read only from the process environment.
2. **The solution list is empty.** A new data directory does not import `solutions/` automatically. Register with the CLI or the sandbox.
3. **Importing a solution over HTTP returns 403.** That is fixed behavior. Use `scripts/import-solution.mjs`.
4. **AIC tests fail or skip.** Skipping is normal when the authorized material directory is unset. A path that is set but missing files is an error.
5. **The sandbox wrote into the project `var/`.** Pass a new temporary directory every time. Do not use `--fresh` to wipe an existing directory.
6. **The Harness port was forwarded off the machine.** There is no authentication. Use loopback only.
