# AIC flow execution entry v0.1

5 November 2026. Owner: Tong Yuxin. Samples and fields match the start-of-work package `AIC_流相_两组开工材料_20261105` provided by Wang Yunhao.

The NOTAM interface is unchanged. `GET /api/health` still returns `supported_parsers: ["runway", "report"]` and adds `supported_solutions: ["aviation-notam", "aic-flowproxy"]`.

## Create and run

`POST /api/tasks`

```json
{
  "solution_id": "aic-flowproxy",
  "case_ids": ["ellipse_a1p4_Re169.08_cy-0.368_D1.171"],
  "note": "optional note",
  "timeout_seconds": 180
}
```

If `case_ids` is omitted, two illustrated cases are used: the representative ellipse `ellipse_a1p4_Re169.08_cy-0.368_D1.171` and the difficult long rectangle `rectangle_a1p7_Re133.03_cy0.304_D1.131`. A case must come from the 12-case confirmation batch. Create returns `awaiting_confirmation` and does not read a model.

Confirm, stop, continue, query, and download use the original task routes:

- `POST /api/tasks/{id}/start`
- `POST /api/tasks/{id}/stop`
- `POST /api/tasks/{id}/resume`
- `GET /api/tasks/{id}`
- `GET /api/tasks/{id}/artifacts/{name}`

The third-stage client also has message routes. Messages are stored in `messages` and do not change `result`:

- `POST /api/tasks/{id}/messages`, body `{ "content": "Which metric improved?" }`
- `POST /api/tasks/{id}/messages/stop`

One task runs at a time. The rest wait. After a service restart, queued and running tasks become `interrupted`. Finished results are kept and can be continued.

## What the result contains

When finished, `result.record_type` is `historical_result` and `model_called` is false. Materials come from the 2026-10-07 confirmation record and the 2026-10-25 release wording.

- `protocol`: a 4-frame full startup field, then 19 observations of 4 Uy probes each, 76 scalars in total; 40 seconds, 160 frames, 64×64, channels Ux, Uy, and p.
- `summary_40s`: the same batch of 12 cases. The parent passes 7/12 with mean R 0.834115. The release passes 12/12 with mean R 0.633023.
- `cases`: the cases in this request. The two illustrated cases include geometry, parent and release error, input file names, and the Uy comparison figure.
- `batch_metrics`: per-case relative L2, R, and the internal target for the 12-case confirmation batch.
- `candidates`: the historical parent baseline plus the 4 historical configurations in `selection_lock.json`. The selected version is `coverage_rollout32_step1500`. The other 3 have configuration only and `metrics` is null.
- `current_week_trials`: an empty array. Replace it after Wang Yunhao writes this week’s observer and calibration trials, groups 4–6.
- `timing`: release inference time for an independent set of 8 cases, 3 runs each, on an RTX 3090. `applies_to_display_cases` is false. For the two display cases, `duration_seconds` is null and `duration_status` is the stored value “未记录” (not recorded).
- `process`: seven steps for protocol, baseline, candidates, metrics, timing, files, and trials still to be written.
- `checks.valid`: true when the display samples match the 12-case comparison and R≤1 agrees with `meets_internal_target`.

Relative L2 is stored as a ratio. `relative_l2_mean_percent` is that value times 100, kept to 4 decimal places. The release Uy value 0.026377134371970312 for the representative ellipse corresponds to 2.6377.

## Downloadable files

`result.json`, `checks.json`, `candidates.json`, `metrics.json`, `timing.json`, `process.json`, `files.json`, `runtime-summary.json`, `input.txt`.

When an illustrated case is requested, the matching Uy comparison figure, input JSON, and NPZ can also be downloaded, plus `同批12例_40秒对照.csv` and `独立8工况_RTX3090计时.csv`. Those two file names are the names stored with the materials.

The material directory defaults to `AIC_流相_两组开工材料_20261105` in the workspace. `SZH_AIC_MATERIALS` can point somewhere else.
