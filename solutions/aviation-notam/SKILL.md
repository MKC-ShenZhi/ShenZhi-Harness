---
name: aviation-notam
description: Parse a NOTAM in the selected paper-runway mode or report-business mode, and keep the source text and field evidence.
---

# Scope

Paper-runway mode and report-business mode are supported. Each uses the fields and rules from its own source.

1. Call `notam_schema` and take the field definitions and rules for the selected mode. Do not mix the two outputs.
2. Call `notam_reference` and read the stored official summary and source by field or runway keyword. Then identify the airport and runway direction from the original NOTAM and output a JSON array.
3. Runway mode uses the five-field array, the paper defaults, aircraft conditions, and the FT conversion. If the runway number is missing, return an empty array. Report mode uses the report case object and keeps business limits, negation, exceptions, conditions, and stated facilities.
4. The service checks JSON, fields, airport, implemented rules, and correspondence with the source text. It saves source location, the result, and tool records. Do not guess when a facility or aircraft map is missing. Keep AND/OR conditions strictly.

Fields and sources are in runway-rules.json and report-rules.json. Engineering differences for report fields are listed separately. Existing rules are used as written. A missing airport-facility table, aircraft map, and the original model interface are listed apart.

At runtime the backend loads this solution’s field tools and parse instructions. Dynamic loading of a generic skill file is left for a later integration.
