# NOTAM output modes v0.1

Added on 30 October 2026. Existing tasks and interface samples keep their original format. A new task can choose one of the modes below.

- `runway`: the five-field JSON array from pages 9–10 of the paper appendix, `schema_version: paper-v1`.
- `report`: the business JSON object compiled from report cases TC-001 through TC-005, `schema_version: report-v1`.

Creating a task still calls POST /api/tasks, for example:

```json
{"notam":"A)ZYTX E)本场不接收备降航班。","notam_id":"ZYSH_C0381/24","parser_type":"report","timeout_seconds":300}
```

The Chinese sentence in that example is source NOTAM text, not interface copy. `notam_id` is optional and at most 100 characters. If `parser_type` is omitted, runway is used. The web default is report. Create and confirm are separate. Start, stop, continue, query, and download are unchanged. `result` may be an array or an object. The client displays it according to `parser_type`. The list adds `parser_type`.

Report keeps the original report field names, including restriction_Type, Diversion_Restriction, and industrialaction. Fields that do not appear in every case stay optional. The validity object and the open enum are documented engineering additions. Field and rule detail is in solutions/aviation-notam/report.schema.json and report-rules.json.

`checks.evidence.items` gives the field, the source text, and the character offset. Only a locatable source fragment is highlighted. In runway mode, notes about status, time, and partial effect stay in `checks.interpretation`. They are not extra fields on the five-field result.

`professional_review: pending` means a person has not reviewed it yet. It does not mean the existing document rules were unused. `paper-v1-draft` on an old task stays the version it had then. Human review, format checks, and whether a real model ran are shown separately.
