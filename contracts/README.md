# Public interface starting point v0.1

These are read-only sample entries for client development. They are available after `npm run examples`. Every response has `mode: fixture`. In sample mode the page shows “Interface sample”.

- `GET /api/health`: sample service status. `runtime_connected` and `model_called` are explicitly false.
- `GET /api/solutions`: one solution list item still waiting for domain confirmation, wrapped in `data`.
- `GET /api/examples/task`: task, plan, steps, and items waiting for confirmation. The sample did not execute. `runtime_executed` is false.
- `GET /api/knowledge/sources`: the source catalog.
- `GET /api/examples/knowledge-hit`: the shape of a source-text citation.

The task API on port 4782 already supports create, start, stop, continue, and result query. Real routes, errors, and request shapes are in the [HTTP API](../docs/harness/api.md). Port 4780 remains a clearly labeled historical sample entry.

Shared objects keep at least this information:

- Task: id, goal, solution id and version, work mode, status, plan.
- Step: id, actual status, a short note, specialist detail, artifact references.
- Knowledge citation: source id, source text, page or clause location.
- Check: the result that was checked, the judgment, the basis, and items waiting for confirmation.

`pdf_page` on a knowledge fragment counts from 1. `printed_page` is the printed page number. A cover and a table of contents can make them differ. After the source text changes edition, locate the citation again.
