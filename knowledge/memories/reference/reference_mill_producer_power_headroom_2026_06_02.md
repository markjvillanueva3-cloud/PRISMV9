---
name: reference_mill_producer_power_headroom_2026_06_02
description: "SHIPPED U-MILL-PRODUCER-POWER-HEADROOM (commit dee4c4ad68) — the mill closed-loop PRODUCER (MillingPrintToProgramEngine.runSafetyChecks) now grounds its spindle-power safety check in physics gate #3 (3-tier headroom budget, fail-loud at >installed). Single-sourced SPINDLE_POWER_BUDGET_FRACTION=0.85. 2 routed follow-ups + a CRLF-on-edit fleet hazard."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.659Z
aliases: reference_mill_producer_power_headroom_2026_06_02
---


# Mill producer power-headroom grounding shipped (foxtrot, 2026-06-02)

**Commit `dee4c4ad68`** (U-MILL-PRODUCER-POWER-HEADROOM / POST-TRAIN-MS0). The mill closed-loop **PRODUCER** (`MillingPrintToProgramEngine.runFullPipeline` → recommended course + lineage_id → `MillCourseClosedLoopEngine` → OutcomeRLBridge → RL) previously emitted recommendations whose spindle-power safety check (`runSafetyChecks` Check 4) **warned at 100% installed power with ZERO headroom** — so the RL loop could learn from a power-infeasible / zero-margin course. Now a doctrine-backed **3-tier gate** (physics gate #3):

- required cutting power **> full installed** → `fail` (flips `result.success=false` via `hasCritical`; program text blanked — R12, the loop never trains on a power-impossible course)
- **> installed × 0.85 budget but ≤ installed** → `warn` (feasible, no margin for tool-wear force rise / hardness variation)
- **≤ budget** → `pass`

## Key facts (for reuse)
- **`SPINDLE_POWER_BUDGET_FRACTION = 0.85`** is now a NAMED export in `src/data/jm-mill-fleet-envelopes.ts` — the single source of truth for gate #3's headroom fraction. Was an inline magic `0.85` duplicated in `UltimateSpeedFeedEngine` (2 sites, both now import the constant: L2049 `efficiency`, L2499 `available_power_kw`). Available cutting power = installed × this. 0.85 (not 0.80) is the IMPLEMENTED canon — the foxtrot awareness "−20% headroom" text is looser prose; code-canon (matching UltimateSpeedFeed) wins.
- **`resolveMaxPowerKw(overrideKw, installedKw)`** (module fn in MillingPrintToProgramEngine) finite-guards `max_power_kW` — `??` does NOT catch NaN, so a corrupt NaN/Infinity/≤0 override falls back to installed power and can't silently pass a safety gate. Used at BOTH the Stage-5 gate and the per-op advisory warning (L1566) so they resolve identically.
- Gate flags but **does NOT down-rate** rpm/feed/ap (calcSpeedFeed/calcPhysics never read max_power_kW). Down-rating to bring an over-budget op under the ceiling is a clear FUTURE candidate (would change emitted G-code → golden-test churn).
- Tests: `mill-power-headroom-gate.test.ts` (7 self-calibrated cases — peak measured at unlimited budget, thresholds derived from it + the single-sourced fraction; pass/warn/fail tiers, boundary, NaN-fallback, machSpec fallback). 102 affected pass + 122 print-to-program regression pass. Scrutiny: per-file 2-reviewer PASS (physics-review-agent + reviewer), P0=0, all P1/P2 fixed.

## ROUTED follow-ups (pre-existing, NOT this unit — do not silently re-discover)
1. **Two divergent JM machine tables.** `MillingPrintToProgramEngine.JM_DIE_MACHINES` (producer, e.g. Haas VF-2 = **22.4 kW**, Hurco VM10i, Okuma MU-4000V) DIVERGES from the verified `jm-mill-fleet-envelopes.ts` (VMC-03 Haas VF-2 = **15 kW** conservative; VMC-01 VM30i; VMC-02 GENOS M460) — different power figures AND different machine MODELS. Reconciling needs operator ground-truth on the REAL JM fleet + cross-engine alignment with `MillingMachineIntelligenceEngine` (the producer table's cited source). R7/R8: surface, don't blind-average. The producer gate uses `machSpec.power_kW` (22.4) today; routing it through `resolveJmMillEnvelope`/`machineGroundingConstraints` would ground both engines on the same verified-conservative number. [[reference_jm_vmc_spindle_envelopes_2026_06_02]]
2. **kc1_1→kc11_mpa type-migration debt** at `UltimateSpeedFeedEngine.ts:566-567` (`profile.kc1_1 = c.kc1_1` / `c.mc` where `c: MaterialEntry`). Pre-existing tsc TS2339 (verified by stash: identical errors at L566-567 without my change). Migration is "7 of 15 files" per commit 872ad577da. Runtime is correct (getMaterialProfile test passes); it's a type-declaration gap. Owned by whoever runs the kc1_1→kc11_mpa rename (likely oscar/SFC lane).

## FLEET HAZARD — CRLF flip on Edit, huge phantom diff
Editing `UltimateSpeedFeedEngine.ts` produced a **6138-line** commit churn (whole-file LF→CRLF flip) burying a 3-line change; `ultimate-speed-feed.test.ts` flipped too (1626). The file had CRLF working-tree drift; the Edit tool preserves existing endings, so staging the whole file surfaced the flip vs the LF-committed baseline. **Fix:** `sed -i 's/\r$//' <file>` then `git commit --amend` (un-pushed HEAD only) → churn dropped to the real 182/13. Check `git show HEAD --stat` after committing big files; LF is the repo baseline. Relates: [[reference_mill_tribal_ground_trainer_shipped_2026_06_02]] · [[reference_mill_galaxy_complete_stale_audit_flags_2026_06_02]] · [[mill-template-grounding-stack]].
