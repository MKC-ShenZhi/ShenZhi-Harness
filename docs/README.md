# ShenZhi Harness documentation

This directory holds engineering rules, interface contracts, and capability notes for ShenZhi Harness.

When adding or maintaining a document, put it in the matching category. Do not leave documents with no clear home in the `docs/` root.

## Layout

```text
docs/
├── README.md          # this note
├── engineering/       # architecture, capability status, tech debt, Git conventions
└── harness/           # HTTP API and workbench contract
```

### `engineering/`

Project-level engineering documents:

- [architecture.md](engineering/architecture.md): module boundaries, the two execution paths, data directories
- [status.md](engineering/status.md): current capabilities and verification notes
- [tech-debt.md](engineering/tech-debt.md): pre-release gates and known risks
- [git-conventions.md](engineering/git-conventions.md): commit messages and what may be committed

### `harness/`

Interfaces for the solution-research path:

- [api.md](harness/api.md): the real `/api/tasks` and `/api/v1` routes
- [client-contract.md](harness/client-contract.md): how the Electron workbench consumes those routes

## Domain documents

After a domain solution has a stable description, give it its own directory, for example:

```text
docs/
├── notam/
├── aic/
└── ...
```

Each may contain `README.md`, `API.md`, and `VALIDATION.md` as needed. When there are few files, clear names are enough. Modules do not have to share one file set.

Domain definitions stay in `solutions/`, `contracts/`, and `knowledge/`. Do not copy them under `docs/`.

## Maintenance

1. `docs/` does not mirror the code tree, but the domain meaning should match.
2. Project rules go in `engineering/`. Interfaces and client agreements go in `harness/`.
3. A stage note is not a current rule. Whether a capability works is decided by `engineering/status.md`.
4. Do not create empty folders just to fill the tree.
5. When architecture, a public interface, or a runtime boundary changes, update the matching document and the root README.
