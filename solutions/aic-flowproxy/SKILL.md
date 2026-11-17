# AIC flow: periodic wake reconstruction

Input is a known geometry, a 4-frame full Ux/Uy/p startup field, and 19 later observations. Each observation has 4 Uy probes, 76 scalars in total. Output is 40 seconds, 160 frames, 64×64, for Ux, Uy, and p.

The current entry reads the start-of-work materials both sides confirmed. It does not call a chat model. It returns:

- The historical parent baseline, included in the same batch of 12 cases.
- Four historical candidate configurations. The selected version is coverage_rollout32_step1500, with confirmation-batch summary metrics. The other three have configuration only, not per-case error.
- Per-case relative L2, R, and the internal target for the requested case.
- Timing status for the display case. If nothing was recorded, write that it was not recorded. An independent 8-case timing is returned separately.
- Process steps, plus comparison figures, inputs, metrics, and timing files.

This week’s observer and calibration trials, groups 4–6, are run by Wang Yunhao. Until those trials finish, `current_week_trials` stays empty.
