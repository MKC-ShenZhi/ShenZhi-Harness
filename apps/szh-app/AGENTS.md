# ShenZhi workbench collaboration rules

This file applies to `apps/szh-app/`. Also follow the repository [AGENTS.md](../../AGENTS.md).

## Frontend constraints

- `src/app/` owns routing and cross-page UI state. Pages live in `src/features/{module}/`.
- Read and write Harness only through `src/lib/api/queries.ts`. The real mapping is `harness.ts`. Demo data is `mock.ts`. Do not mix them.
- Components do not call HTTP directly and do not read model keys or `var/`.
- Keep a feature's components, types, and constants inside the feature until more than one module uses them. Then move them to `src/components/` or `src/lib/`.
- Raw colors belong only in `src/styles/tokens.css`.
- Do not draw stages, percentages, live logs, or pause as real execution data when the backend does not provide them. A local cancelling state must return to the server snapshot after refresh.
- Keep the existing React, TanStack Query, HashRouter, and components. Do not start a new data layer for one page.
- After a change, run `npm run typecheck` and `npm test`. For a page flow, walk the main path with the capture script in the README or with the local workbench.

When adding a backend field, update the contract note first, then `harness.ts`. Do not pretend a schema annotation that Harness rejects is already in effect in the form.
