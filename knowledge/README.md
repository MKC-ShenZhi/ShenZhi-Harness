# Authoritative sources and knowledge intake

Owners: Wang Zihan, Zhang Jiarong, Jin Wanqing. Wang Zihan merges the result.

1. Jin Wanqing checks `sources.json` and the source text under `documents/` and adds official sources for the current task.
2. Wang Zihan implements search and source-text read, using the citation shape in `contracts/knowledge-hit.example.json`.
3. Zhang Jiarong checks citations and organizes reference cases. After a specialist task is confirmed, add result checks.
4. Combine the query, source text, reference result, and self-check record into one materials and code package.

One document is included now: the civil-aviation NOTAM series management regulation. Its scope is how the notice series is divided and used. Parsing the notice body, business judgment rules, and real cases are filled in after the task is confirmed.

A new source records title, publisher, URL, version and date, scope, local file location, and SHA-256. Keep rule documents separate from real notice samples.
