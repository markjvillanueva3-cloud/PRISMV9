# SFC-CONVERGENCE/U-SFC-ORCH-REGRESSION-BASELINE — [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ORCH-REGRESSION-BASELINE (slot:oscar): numeric-regression baseline for SpeedFeedOrchestratorEngine.compute() -- P0 safety net for the operator-approved engine convergence

**Commit:** `266588666330` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T01:05:22-05:00
**Tags:** sfc-convergence, u-sfc-orch-regression-baseline, auto-distilled

## Subject
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ORCH-REGRESSION-BASELINE (slot:oscar): numeric-regression baseline for SpeedFeedOrchestratorEngine.compute() -- P0 safety net for the operator-approved engine convergence

## Body
```
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ORCH-REGRESSION-BASELINE (slot:oscar): numeric-regression baseline for SpeedFeedOrchestratorEngine.compute() -- P0 safety net for the operator-approved engine convergence

The orchestrator (the WEB-UI physics engine via prism_calc:sf_orchestrate) had NO direct
compute() unit-test coverage. Before converging it onto UltimateSpeedFeedEngine (operator-
approved 2026-06-21; the 2 engines diverge -- the UI runs the orchestrator, NOT the engine
all SFC-WIRING-MS0 work targets, see reference_oscar_sfc_two_engine_divergence_2026_06_21),
this SNAPSHOTS the CURRENT deterministic core-physics outputs (Vc/RPM/fz/Vf/MRR/power/torque/
Fc/life/Ra/deflection) for 4 representative inputs (steel/aluminum/titanium/hardened-HB500 mill).

Purpose: the convergence WILL shift these (the engines compute core physics differently --
calibration+proven-blend vs H-switch+chip-thinning); when these fail post-convergence the diff
QUANTIFIES the production UI re-baseline for operator sign-off, then baselines update. The MC
uncertainty fields (force_ci95/...) are partially Math.random-driven (non-deterministic) -> NOT
snapshotted; only the deterministic point estimates + run-to-run determinism + physical
invariants are pinned. 6 tests green; baselines reproduce in vitest (env-stable, confirmed
not tsx-only). Plan: reference_oscar_sfc_convergence_plan_2026_06_21 (this is P0 of P0-P5).
```

## Files touched (2)
- mcp-server/src/__tests__/speed-feed-orchestrator-convergence-baseline.test.ts | 87 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 87 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 266588666330`
- Milestone envelope: `mcp-server/data/milestones/SFC-CONVERGENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._