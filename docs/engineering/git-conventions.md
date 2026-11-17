# Git collaboration and commit conventions

This note sets the commit message and the commit scope for ShenZhi Harness so reviews can be traced.

---

## 1. What may be committed

The root `.gitignore` is an allowlist. Everything is ignored unless a path is explicitly allowed.

Source, lockfiles, solution definitions, public contract samples, and documentation may be committed.

Do not commit:

- `.env`, model keys, private keys, and connection strings
- Tasks, runs, chats, and DSH sessions under `var/`
- Authorized PDFs, experiment archives, model weights, and datasets
- `node_modules/`, `dist/`, `dist-electron/`, screenshots, and installers
- `__pycache__/`, `.pyc` files, logs, and other process files

When adding a top-level file or a subdirectory of `docs/`, update the allow rules in `.gitignore`. Otherwise the file stays in the working tree and cannot be committed.

---

## 2. Commit message format

```text
<type>: <English description>
```

- `type` is English
- The description is English and states the purpose of the commit

Examples:

```text
feat: add artifact download for the text self-test
fix: persist run status after cancellation
docs: translate Harness documentation to English
```

---

## 3. Common types

```text
feat      a new capability
fix       a defect fix
refactor  a restructure that keeps the main behavior
docs      documentation
chore     configuration, dependencies, build
test      tests
```

Use another type only when it is needed. Do not invent types casually.

---

## 4. Commit size

One commit has one clear purpose.

Prefer:

```text
docs: organize the Harness documentation layout
```

Do not put unrelated edits in one commit. Avoid messages such as `update`, `fix`, or `change code` that do not say what changed.

A commit message should answer what changed, why, and which commit to revisit if it breaks.

---

## 5. Branches

Use a short English branch name, for example `feat/run-events`, `fix/cancel-persist`, or `docs/readme`.

Do not put secrets or a machine-local absolute path in a branch description, a commit message, or a document. Confirm repository visibility with the maintainer before pushing.
