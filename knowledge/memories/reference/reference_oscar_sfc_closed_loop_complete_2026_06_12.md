---
name: reference_oscar_sfc_closed_loop_complete_2026_06_12
description: "SFC closed-loop COMPLETE (slot:oscar, 2026-06-12): the CSFH 13-unit harness shipped end-to-end -- predict->record-actuals->derive-calibration->apply-to-live-physics, flag-gated + safety-clamped. The learn->apply ring that 'trained in a sandbox nobody read' is now closed."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.696Z
aliases: reference_oscar_sfc_closed_loop_complete_2026_06_12
---


# SFC closed loop COMPLETE -- CSFH 13/13 (slot:oscar, 2026-06-12)

The standing oscar /goal "complete closed loop testing and comparison of data" is DONE. The CSFH
(Combinatorial Speed-Feed Honesty) harness (`state/shared/specs/SFC-COMBINATORIAL-HARNESS-PLAN-2026-06-04.md`,
13 units) is now 13/13 on `slot/oscar`. This session shipped the final 4 units (the loop-closing keystone set).

## The closed loop (was OPEN -- SFC-OPEN-THREADS 2b: "trained in a sandbox nobody read")
Before: `SpeedFeedDeepLearningEngine.calibrationFactors` were read ONLY by its own `predict*`; the live
`prism_calc:speed_feed` goes through `UltimateSpeedFeedEngine.calculate()` which had ZERO DL refs. Predictions
were captured but actuals could never come back, and learned factors never touched live output.

Now CLOSED, in dependency order:
1. **U-OSC9-CALIB-PERSIST** (`5bffb4f830`) -- `SelfLearningSystem` global+per-segment factors + sample counts
   + feedback log now persist atomically (tmp+rename) to `data/state/sfc-calib-factors.json`, schemaVersion 1.0.0,
   fail-soft, clamp-on-load [0.5,2.0]. OPT-IN at construction: the exported singleton persists; bare `new`
   (tests) stay hermetic; the singleton is gated inert under VITEST/NODE_ENV=test + `PRISM_SFC_CALIB_PERSIST` knob.
2. **U-OSC9-CALIB-APPLY-WIRE (KEYSTONE)** (`4ae684e0e2`) -- `UltimateSpeedFeedEngine` STEP 18F applies the learned
   speed/feed correction to the EMITTED operating point. Four safety invariants: flag-gated DEFAULT OFF
   (`PRISM_SFC_CALIB_APPLY`) -> byte-identical to pristine when off (deterministic calculate()); never overrides
   a user-pinned operating point; clamp [0.4,2.5] + NaN/<=0 -> identity; re-respects machine RPM ceiling. Vf/mrr
   RECOMPUTED (not scaled) so they stay exact after an RPM re-cap; analytics (force/power/thermal/life) stay
   first-principles, surfaced via `result.calibration` + a warning (R12). Injectable provider
   (`setSfcCalibrationProvider`) for deterministic tests; default wires the DL singleton. safety-physics oracle
   gate + physics-reviewer + independent reviewer all PASS.
3. **U-CSFH-09-401-GAUNTLET** (`9a51a16780`) -- testing breadth: GROUP 14 ISO x operation cross-product (42 cases
   x 8 oracles = 336 assertions). HONEST: the prior 103-case matrix already fired ~450 assertions; the bar was
   met before -- the real deliverable is the previously-uncovered cross-product (gauntlet now ~789 assertions).
4. **U-CSFH-11-DRILLING-SEGREGATE** (`f491d5ee8a`) -- data-driven `NON_CALIBRATABLE_OPERATIONS` registry replaces
   the rot-prone hardcoded `["drilling"]`. Drilling REMOVED (U-OSC9-DRILL-CHIPGEOM fixed its ap=0 degeneracy ->
   vc/fz now real); TAPPING segregated (pitch-locked feed -> degenerate fz + torque-proxy force). thread_milling
   deliberately NOT segregated (routes through milling chip-geometry, derived per-tooth fz).

## Comparison-of-data half
Already complete in prior sessions ([[reference_oscar_sfc_live_vendor_compare_2026_06_09]]): 144-cell live
tri-vendor sweep + carbide/hss/ceramic/cbn baselines + per-ISO deltas. The CSFH COMPARE (07) + BASELINE-PARAMS
(08, the moat) units add the per-regime vc/fz envelopes + vendor bias/containment that FEED calibration, with
the honest segregation (13) ensuring only validated regimes contribute.

## Verification note (slot worktree has NO node_modules)
vitest is not installed in `H:/prism-slot-oscar/mcp-server` -> every unit verified via the proven CSFH pattern:
a `tsx` harness driven by the main-tree binary (`H:/prism/mcp-server/node_modules/tsx`) replicating each unit's
oracles on the REAL engine, + isolated `tsc --noEmit`. Counts this session: 25 + 24 + 336 + 11 oracles, all PASS.
The durable `*.test.ts` files ship as the CI artifacts.

## Deferred follow-ups (handoff)
- **U-OSC9-TURNING-CAP-VC-DW** (NEW, P2): pre-existing STEP 4 turning capped-Vc uses TOOL dia Dc not WORKPIECE
  dia Dw (`UltimateSpeedFeedEngine.ts:2152`); STEP 18F mirrors it at the calib re-cap. Fix BOTH sites together,
  never one alone (a one-sided fix breaks the mirror invariant). The rpm hard-cap (the real safety) holds.
- per-call sync write-amplification on `recordFeedback` saveState (low-volume by contract; debounce candidate).
- add an end-to-end test seeding the real DL singleton to close the keystone's inject-only test gap (R15).

See [[reference_oscar_sfc_domain_map_2026_05_27]] (domain map) + the open-threads ledger
`state/shared/specs/SFC-OPEN-THREADS-2026-06-10.md` (other threads: vendor-fairness densification, tracker backend).
