---
name: reference_mill_tribal_ground_trainer_shipped_2026_06_02
description: "SHIPPED U-MILL-TRIBAL-GROUND-TRAINER (commit 7b00affd) — the mill closed-loop trainer/template library now grounds in 3 layers: baseline → SFC physics → per-machine envelope → JM shop-floor tribal speeds/feeds rules. Closes the assessment residual. tribal_ground flag; source-attributed; fail-soft."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.660Z
aliases: reference_mill_tribal_ground_trainer_shipped_2026_06_02
---


# Mill trainer tribal grounding shipped (foxtrot, 2026-06-02)

**Commit `7b00affd`** (U-MILL-TRIBAL-GROUND-TRAINER / POST-TRAIN-MS0). Closes the residual flagged in [[reference_mill_galaxy_complete_stale_audit_flags_2026_06_02]]: the synthetic closed-loop trainer was tribal-agnostic. Now the mill template library + trainer ground cutting conditions in **layers**: hardcoded `ISO_BASELINE` → SFC physics (`UltimateSpeedFeedEngine`, U-MILL-SFC-GROUND) → per-machine spindle envelope (U-MILL-MACHINE-GROUND) → **JM shop-floor tribal speeds/feeds rules (this unit)**.

## What it does
- `MillToolpathTemplateLibraryEngine.generateLibrary({tribal_ground:true})` applies `MillTribalIntegrationEngine.getAdjustment(iso, operationType, toolType, dia)` → multiplicative `rpm_factor`/`feed_factor` on top of the current (baseline or SFC) conditions, per `{iso, operation}` cell.
- `OP_TO_TRIBAL_OPERATION` maps only UNAMBIGUOUS ops (facing→face, profile→rough_profile, circular_pocket→rough_pocket, peck/chip_break_drilling→peck_drill); unmapped ops (drilling/tapping/boring/thread_milling) get NO tribal lookup (no forced wrong match — fail-soft).
- Source attribution (foxtrot soul): each adjusted cell carries `tribal_tips` (applied JM_DIE_MILLING_TIPS ids) + `tribal_warnings` (CAUTION text from constraint/failure-mode rules). `tribal_adjusted_cells` counter == count of `tribal_adjusted===true` cells (consistency invariant, tested).
- Threaded through `runTrainingSweep` + `runFleetClosedLoopTest` (`tribal_adjusted_cells` / `fleet_tribal_adjusted_cells`). Schema `tribal_ground` on `mill_template_library` / `mill_template_train_sweep` / `mill_fleet_closed_loop_test`.

## Key facts (for reuse)
- `getAdjustment` returns identity (1.0) factors on no-match → applying tribal_ground is safe/no-op for unmatched cells. It MULTIPLIES matching tips + heuristics + critical failure-mode prevention factors. **getAdjustment applies critical-failure-mode prevention WITHOUT a tip id** (only a warning) — so the consumer keys `tribal_adjusted` on `moved` (factor != 1) and surfaces `warnings` as attribution, never anonymous. (P1 caught by 3-of-3 arm A, fixed in this commit.)
- `tribal_ground` WITHOUT `sfc_ground` is FAST (no 2.5s UltimateSpeed calls — tribal modulates the baseline directly). Good for cheap tests.
- 9 tests (`mill-tribal-ground-template.test.ts`); 61 regression pass; type-clean; 3-of-3 PASS.

## How to apply
- To train/emit mill conditions grounded in real JM shop-floor wisdom (not just synthetic templates), pass `tribal_ground:true` (compose with `sfc_ground` + `machine`).
- Relates: [[reference_jm_vmc_spindle_envelopes_2026_06_02]] · [[reference_mill_galaxy_complete_stale_audit_flags_2026_06_02]] · [[feedback_domains_own_ai_training_systems]] · foxtrot soul (tribal→wiki/training bridge).
