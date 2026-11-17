# SZH HTTP API

The source of truth is `apps/server/main.mjs` and the matching services. There is no OpenAPI generator. The default address is `http://127.0.0.1:4782`, loopback only. There is no authentication, token, session permission, or user isolation. The service allows any CORS origin. OPTIONS returns 204. Every JSON body is an object, with a read limit of 100,000 bytes.

A successful JSON response is `{"mode":"development","data":...}`. An error is `{"mode":"development","data":{"code":"...","message":"..."}}`. Files and redirects are not wrapped in that envelope.

Do not store API keys or personal chat transcripts in this document or in the repository. Chat and run records stay in the local data directory.

## System, documents, and legacy tasks

| Method | Path | Request | Success |
| --- | --- | --- | --- |
| GET | `/api/health` | none | 200. runtime, model_configured, optional model/reasoning_effort, model_availability, supported_parsers, supported_solutions, schema_status |
| GET | `/api/solutions` | none | 200. Two static descriptions: NOTAM and legacy AIC |
| GET | `/api/knowledge/search` | optional `q`. Split on whitespace and match any keyword | 200. At most eight index hits |
| GET | `/api/knowledge/{id}` | document id | 200. One index entry |
| GET | `/api/tasks` | none | 200. An array of task summaries |
| POST | `/api/tasks` | see below | 201. The full task |
| GET | `/api/tasks/{id}` | task UUID | 200. Task snapshot and messages |
| DELETE | `/api/tasks/{id}` | task UUID | 200. `{id}` after a finished general chat is removed |
| GET | `/api/tasks/{id}/activity` | task UUID | 200. Legacy activity array. In-memory activity first, then the DSH archive |
| POST | `/api/tasks/{id}/start` | no body | 202. Confirm and start from awaiting_confirmation |
| POST | `/api/tasks/{id}/stop` | no body | 202. Stop the task and return the snapshot |
| POST | `/api/tasks/{id}/resume` | no body | 202. Continue from stopped, interrupted, failed, or invalid_output |
| POST | `/api/tasks/{id}/messages` | `{"content":"..."}` | 202. Enqueue and return the task and messages |
| POST | `/api/tasks/{id}/messages/stop` | no body | 202. Stop the current reply and return the task |
| GET | `/api/tasks/{id}/artifacts/{name}` | URL-encoded allowed file name | 200. The file from the latest attempt, with Content-Disposition |

Real inputs for creating a task:

- NOTAM: `notam` is required, 1–30,000 characters. Optional `solution_id: "aviation-notam"`, `parser_type: "runway" | "report"`, a single-line `notam_id` (at most 100 characters), and `timeout_seconds` (default 180, integer 10–300). Creation waits for confirmation.
- General chat: `solution_id: "general"` and `content` (non-empty after trim, raw length at most 10,000). The task is `ready` and the first message is queued. Message status is independent of the task. `DELETE` removes only a general chat, and only when no reply is queued, running, or stopping.
- Legacy AIC: `solution_id: "aic-flowproxy"`, also accepted as `solution: "aic-flowproxy"`. Optional `case_ids` (1–12 items from the authorized confirmation set), `note` (at most 10,000 characters), `aic_mode: "current_week"`, and `timeout_seconds`. The default is the historical mode and two display cases. This entry needs archive files.

## Registered versions and runs

| Method | Path | Request | Success or fixed response |
| --- | --- | --- | --- |
| GET | `/api/v1/solutions` | none | 200. Version records, including manifest, status, published_at |
| GET | `/api/v1/solutions/{id}/versions` | solution id | 200. Versions for that solution. An unknown id returns an empty list |
| GET | `/api/v1/solutions/{id}/versions/{version}` | exact version | 200. One version record |
| POST | `/api/v1/solutions/{id}/versions/{version}/validate-input` | the input object itself | 200. `{"valid":true,"input":...}` |
| POST | `/api/v1/solutions/import` | no usable HTTP parameter | Always 403 `maintainer_cli_required`. Import with the maintainer CLI |
| GET | `/api/v1/runs` | none | 200. Full run array, newest first |
| POST | `/api/v1/runs` | see below | 202. Run snapshot |
| GET | `/api/v1/runs/{id}` | run UUID | 200. Run snapshot |
| POST | `/api/v1/runs/{id}/cancel` | no body | 202. Cancel was requested. The snapshot includes cancel_requested |
| GET | `/api/v1/runs/{id}/artifacts` | run UUID | 200. Artifact list |
| GET | `/api/v1/runs/{id}/artifacts/{artifactId}/download` | run UUID and artifact UUID | 200. File bytes and a download file name |

```json
{
  "solution_id": "aic-inference",
  "version": "0.1.0",
  "input": { "case_id": "cylinder_Re143.41_cy0.208_D1.184" },
  "request_id": "client-generated-id"
}
```

`source_run_id` is optional. The service checks that the run exists. The request id must be a non-empty string. The same id and the same serialized fingerprint return the existing record. A changed configuration needs a new id. Changing parameter order can change the fingerprint. A run returns id, solution_id, version, manifest, input, request_id, fingerprint, status, created_at, and optionally source_run_id, started_at, finished_at, and error. Each run has `events` and `artifacts` arrays.

Known run statuses are `queued`, `running`, `succeeded`, `failed`, `cancelled`, and `cancel_requested` on the cancel response. After a cancel response, keep polling the detail. It may still be queued or running for a moment. An interrupted run is marked failed on the next startup. `events` is currently empty. There is no subscription or streaming event route. Artifact fields are id, run_id, name, size, and sha256. Download MIME is mapped from the extension. The client may choose a display type from the file name.

## Errors and compatibility

| HTTP | Common codes |
| --- | --- |
| 400 | invalid_json, invalid_artifact, invalid_input, request_id_required, request_conflict, runtime_unavailable, invalid_run_state |
| 403 | maintainer_cli_required |
| 404 | not_found, task_not_found, source_not_found, version_not_found, run_not_found, artifact_not_found |
| 409 | invalid_task_state, invalid_message_state, reply_in_progress, not_a_chat |
| 413 | request_too_large |
| 422 | invalid_notam, unsupported_solution, unsupported_parser, invalid_notam_id, invalid_budget, invalid_message, invalid_note, unknown_case, aic_materials_missing |
| 500 | Unexpected service or file error. It may carry the underlying error.code. The message is usually generic |
| 503 | service_closing |

A model timeout or failure is written onto the task, message, or run. An accepted request does not later report execution failure as an HTTP error. Manifest structure errors and version conflicts are reported by the CLI as an error and an exit code.

`GET` or `HEAD /` returns 302 to `/preview/` and keeps the query string. The service serves the legacy preview, the old `/index.html`, samples, and document files from a fixed allowlist. Building the legacy preview needs the full project. The Electron app uses its own build and the JSON API above.
