---
name: reference_cam_tsc_errors_for_kilo_2026_06_24
description: 3 remaining tsc errors are CAM/RL design-mismatch bugs (PowerMill selectStrategy vs recommend; RL-CAM step() needs an outcome object) -- actionable spec for kilo/india; verified NOT a mechanical fix.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.505Z
aliases: reference_cam_tsc_errors_for_kilo_2026_06_24
---


# CAM/RL-domain tsc errors for kilo (2026-06-24) -- ACTIONABLE SPEC

After xray fixed the cad-validation-corpus regression
([[reference_xray_corpus_tolerance_shape_fix_2026_06_24]]), mcp-server tsc dropped 19 -> 3, then xray
shipped #1 (PowerMill, below) so it is now **2** remaining. xray (ANY-DOMAIN) READ the real signatures
and CONFIRMED the remaining 2 (RL-CAM, #2-3 below) need owner judgment -- a guessed fix would silently
corrupt RL training behavior (R12), worse than the tsc error. Precise spec below so india can fix fast.

## STATUS 2026-06-24 (slot xray) -- #1 SHIPPED, #2-3 remain for india
**#1 PowerMill SHIPPED** by xray: commit `134b0e74bd` `U-XRAY-POWERMILL-RECOMMEND-WIRE`. It was a clean
R8 mechanical mapping (NOT a design decision) AND a real functional bug: `selectStrategy` did not exist,
so at runtime it threw on every request -> the orchestrator's catch ALWAYS fell back to the crude
`fallbackStrategy` and the real ranked `recommend()` engine was never reached. Fixed: map request ->
`PMRecommendInput` (machine 3axis->3_axis, priority surface_finish->quality, etc.), call `recommend()`,
take rank-1, `getParameters()`, build the same downstream `{name,powermill_strategy,parameters,rationale}`
shape. 6 reference-value tests, tsc-verified 3->2. **#2 (updatePolicy:302) + #3 (closeFeedbackLoop:373)
REMAIN for india** -- both are genuine RL-modeling decisions (verified: `ActualOutcome` =
`{cycle_time_min, tool_life_min, surface_ra_um, dimensional_accuracy_mm, safety_event?}` -- it has NO
`mrr`/`tool_life_factor`/`safety_margin`, so mapping CAM-actual onto MillingRL's `outcome:{mrr,
tool_life_factor, surface_ra, safety_margin}` needs india's modeling judgment; and `updatePolicy` has
only a scalar reward, no outcome). `updatePolicy`'s ONLY caller is its own test (NaN/Inf guard); no
production caller. india owns the reward-vs-outcome contract decision (see #2-3 spec below).

## 1. PowerMillAIOrchestrationEngine.ts:233 -- caller uses an OLD/imagined PowerMill API
Caller: `powerMillStrategyEngine.selectStrategy({feature_type, material_iso, machine_type, operation})`
expecting a single result `{name, strategy_name, parameters}`.
REALITY (PowerMillStrategyEngine.ts):
- Method is `recommend(input: PMRecommendInput): PMStrategyRecommendation[]` (line 688) -- NOT selectStrategy, returns an ARRAY.
- `PMRecommendInput` (line 77): `{feature_type, material_group?, machine_type?, tool_diameter_mm?, wall_angle_deg?, pocket_depth_mm?, has_previous_roughing?, tolerance_mm?, priority?, enable_viewmill?}` -- NO `material_iso` (it's `material_group`, a PMMaterialGroup enum), NO `operation`.
- `PMStrategyRecommendation` (line 90): `{rank, strategy_name, pm_operation_type, category, description, ae_factor, ap_factor, cutting_mode, speed_multiplier, axis_requirement, collision_avoidance, viewmill_supported, confidence, warnings}` -- has `strategy_name` but NO `name`, NO `parameters`. The parameters shape is a SEPARATE `PMStrategyParameters` (line 107), fetched by a different method.
FIX (kilo): map caller -> PMRecommendInput (material_iso->material_group enum; drop/translate `operation`), call recommend(...), pick [0] (or best by rank/confidence), map PMStrategyRecommendation (+ a PMStrategyParameters lookup) -> the `{name, strategy_name, parameters}` the orchestrator reads downstream (verify how strategy.name/parameters are consumed after line 240).

## 2-3. ReinforcementLearningCAMFeedbackEngine.ts:302 + :373 -- step() now takes an OUTCOME object
Both call `millingReinforcementLearningEngine.step(state, action, nextState, done)` (4 args, old shape).
REALITY: `MillingReinforcementLearningEngine.step(state, action, nextState, outcome: {mrr, tool_life_factor, surface_ra, safety_margin}, done): {loss, reward}` (line 181). step() computes reward INTERNALLY from `outcome` (computeReward(state,nextState,outcome), line 192) -> replay buffer. The 4-arg callers pass `done` where `outcome` is expected + omit the real `done`.
- The RL-CAM inline comment (lines 297-301) is STALE: it imagines a `rewardOverride` param on step() that DOES NOT EXIST.
- `:373` (closeFeedbackLoop): MIGHT be fixable IF `v.actual` (CloseFeedbackLoopInput.actual) carries {mrr, tool_life_factor, surface_ra, safety_margin} -> `step(v.state, v.action, v.next_state, v.actual, v.done ?? false)`. VERIFY the actual schema first.
- `:302` (updatePolicy): signature is `(state, action, nextState, reward: number, done)` -- it has a reward SCALAR and NO outcome object to pass. It is fundamentally incompatible with the new step() without a DESIGN DECISION: either add an `outcome` param to updatePolicy (changes ITS callers) OR add a reward-override path to MillingRL.step() (the path the stale comment wrongly assumed exists). This is the kilo/india call.
FIX (kilo/india): decide the reward-vs-outcome contract between RL-CAM feedback and MillingRL; fix both sites + delete the stale rewardOverride comment.

## Note
build:fast (esbuild) skips type-check so these don't block dev builds; they DO block `npm run build:verify`
(full tsc, pre-commit gate). Heap-bump tsc to avoid OOM-false-green:
`node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit` ([[reference_tsc_oom_false_green_2026_06_09]]).
