# WIRE-UNWIRED-MS0/U-WIRE-TTRO — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-TTRO: wire TurningThreadRobustOptimizerEngine into prism_dev (1 action) — closes ghost wiring

**Commit:** `f5f26fac3c84` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T09:48:02-05:00
**Tags:** wire-unwired-ms0, u-wire-ttro, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-TTRO: wire TurningThreadRobustOptimizerEngine into prism_dev (1 action) — closes ghost wiring

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-TTRO: wire TurningThreadRobustOptimizerEngine into prism_dev (1 action) — closes ghost wiring

Engine header CLAIMED to be shipped as dispatcher action
`turning_thread_robust_optimizer` (lines 23-25) but no dispatcher case
ever existed. The ThreadClassGateHook `GUARDED_ACTIONS` list even
references the action name — but it was wired NOWHERE. Classic ghost
wiring caught and closed.

1 pure-compute action through prism_dev (renamed for session prefix):
  ttro_run -> run(input) - sensitivity-driven robust optimizer for
                            single-point threading. OAT screen
                            (TurningThreadSensitivityEngine top-2) +
                            grid search + per-point MC trials via
                            TurningThreadStochasticPlanEngine.

Engine throws on bad input via validateInput() at lines 92-115. Wrapped
in try/catch envelope (mirrors AGS pattern) so caller gets clean error
string not engine stack-bubble.

Wire-level invariants:
  - has_best_point discriminator (best_point may be null when no grid
    point clears min_feasibility_rate threshold)
  - grid_point_count + top2_driver_count + safe_fraction_lift exposed
    at top level for fast LLM routing
  - DoS guards mirror engine bounds: grid_steps [2,11], n_trials
    [10,2000], adjust_range (0,1) — fail-fast at Zod boundary
  - All 13 SPTInput fields validated (thread_form + infeed_method
    enums, physical dims capped)

Tests: 17/17 PASS (dispatcher round-trip; engine-pair test pre-existed).
       Includes: 4 schema-guard cases, 7 happy-path invariants
       (baseline_safe_fraction in [0,1], grid points well-formed,
       top2_drivers from THREAD_DIMS enum), VARIABILITY across 3 thread
       forms (UN/metric/ACME), seeded MC determinism, ROUTING PROOF,
       4 error-envelope cases.

WIRE-UNWIRED-MS0 progress: 23->24 wires this session.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- ...dispatcher.turningThreadRobustOptimizer.test.ts | 249 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  42 ++++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  31 ++-
- 3 files changed, 321 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f5f26fac3c84`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._