---
name: reference_rl_cam_feedback_step_arity_regression_2026_06_24
description: "Pre-existing tsc regression (2 errors) in ReinforcementLearningCAMFeedbackEngine -- step() arity mismatch vs MillingReinforcementLearningEngine.step; flagged for owner (lima/CADCAM-DAGI). NOT india's to fabricate."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.146Z
aliases: reference_rl_cam_feedback_step_arity_regression_2026_06_24
---


# RL CAM feedback step() arity regression (found 2026-06-24, slot:india)

Surfaced by a full `tsc --noEmit` while shipping U-CAD-LEARN-TRIBAL-INJECT (an unrelated
india CAD-learning unit). **Not caused by my change** -- my 4 touched files are tsc-clean.

## The 2 errors
`mcp-server/src/engines/ReinforcementLearningCAMFeedbackEngine.ts`
- line 302 (`updatePolicy`): `millingReinforcementLearningEngine.step(state, action, nextState, done)` -- 4 args
- line 373 (feedback loop): `step(v.state, v.action, v.next_state, v.done ?? false)` -- 4 args
- TS2554 "Expected 5 arguments, but got 4".

## Root cause
`MillingReinforcementLearningEngine.step` (line 181) signature is
`step(state, action, nextState, outcome: {mrr, tool_life_factor, surface_ra, safety_margin}, done)`.
A structured `outcome` was inserted as the 4th param. The CAM feedback engine (committed
`fc4cf18ace` 2026-05-22, [CADCAM-DAGI-MS4]/U-CAMAGI13, slot:lima) calls the OLD 4-arg form
`step(state, action, nextState, done)` -- and `step`'s current signature dates to the
`edd5dcf363` fossil-absorption (2026-05-12, BEFORE the CAM engine). So it has been tsc-red
since 2026-05-22 -> **full `tsc --noEmit` is NOT in the blocking Stop gate** (fleet iterates on
`build:fast` esbuild, which skips type-check); this corner stayed red for a month undetected.

## Why I did NOT auto-fix it (R8/R12)
A correct fix needs a real `outcome` object. `updatePolicy` (call site 1) only has a scalar
`reward` -- it CANNOT construct a faithful {mrr, tool_life_factor, surface_ra, safety_margin}.
Fabricating one would corrupt MillingRL's replay buffer (it trains on it) -- a real harm worse
than the cosmetic tsc error (R9/R12: never fake data to go green). The documented INTENT in the
CAM engine's own comment ("pass the empirical reward via the rewardOverride parameter") points
at the right design: add an optional scalar `rewardOverride` to `MillingReinforcementLearningEngine.step`
so scalar-reward callers bypass the outcome-derived reward. That is a mill-RL design change with
its own tests -- owner = lima (CADCAM-DAGI) or kilo/foxtrot (mill-RL).

## Suggested fix (for owner)
Add `rewardOverride?: number` (5th, optional) to `MillingReinforcementLearningEngine.step`; when
present, push `{reward: rewardOverride}` to the replay buffer instead of `computeReward(...)`, and
make the `outcome` param optional. Then call site 1 passes `reward` as override; call site 2 builds
a real `outcome` from `v.actual`/`v.predicted` (the data it already has) OR passes the override too.
Verify with a round-trip test + re-run `tsc --noEmit` (expect 0 errors).
