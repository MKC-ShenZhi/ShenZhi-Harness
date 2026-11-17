# Legacy web preview

Static pages and workbench assets kept so the old entry can still be regression-tested. The new workbench is [apps/szh-app](../szh-app/README.md). Do not add pages here.

`GET /` on Harness redirects to `/preview/`. Preview files are served from an allowlist in `apps/server/main.mjs`. The full visual design depends on build output inside the project. The backend snapshot keeps only the source needed for regression.
