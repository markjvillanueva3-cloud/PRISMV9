---
name: oscar-speedfeed-material-aware-fixed-2026-06-22
description: "FIXED Bug 1 (material-blind prism_calc:speed_feed) -- dispatcher action now delegates to UltimateSpeedFeedEngine. Closes task #52. SFC bug list (reference_sfc_speed_feed_bugs_2026_05_31) now largely closed."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.717Z
aliases: reference_oscar_speedfeed_material_aware_fixed_2026_06_22
---


**U-OSC9-SPEEDFEED-MATERIAL-AWARE shipped (slot:oscar, 2026-06-22, commit `986b36a2b1`).** Fixes Bug 1 from [[reference_sfc_speed_feed_bugs_2026_05_31]] / task #52 diagnosed in [[reference_oscar_speedfeed_material_blind_diagnosis_2026_06_01]].

**The bug:** `calcDispatcher` case `speed_feed` (line ~1690) called `calculateSpeedFeed` (ManufacturingCalculations.ts:788), which keys Vc off the TOOL material + hardness ONLY and never reads the workpiece -- so it returned the SAME cutting speed for steel, aluminum, and titanium. Safety-relevant: Al(N) should run ~2.6x steel(P) Vc, Ti(S) ~0.33x.

**The fix (verified the engine return shape first, per the diagnosis):** the `speed_feed` case now delegates to `ultimateSpeedFeedEngine.calculate()` (the material-aware Kienzle/Taylor authority with a workpiece alias->ISO/hardness table at UltimateSpeedFeedEngine.ts:444+) and remaps its `OptimizedValue` result back to the `{cutting_speed, spindle_speed, feed_per_tooth, feed_rate, axial_depth, radial_depth}` contract the compact map (`calcExtractKeyValues`, calcDispatcher.ts:42-43) reads. Key detail: the engine field is `spindle_rpm` -> remapped to the contract's `spindle_speed`. Finite-guards the whole Vc/rpm/fz/vf quartet -> fail-LOUD fallback to the legacy util (with a material-BLIND warning) on any engine error (R12).

**Why NOT patch the util:** `calculateSpeedFeed` has 12 callers incl. `route-contract-sfc-speedfeed.test.ts` which tests it DIRECTLY -- it stays material-blind by design (a second ISO-Vc table = physics fragmentation). The contract test stays green (25/25) because it tests the util, not the dispatcher action. The util is left untouched.

**Key insight (R8/R12) -- STRANDED SLOT-BRANCH FIX:** Bug 1 was ALSO fixed on the `slot/oscar` branch on 2026-06-02 under the SAME unit name `U-OSC9-SPEEDFEED-MATERIAL-AWARE` (+ follow-up `U-OSC9-SPEEDFEED-PARAM-PASSTHROUGH` `d5edd5eada`, task #53) -- see [[reference_oscar_speedfeed_material_aware_shipped_2026_06_02]] / [[reference_oscar_speedfeed_param_passthrough_2026_06_02]]. BUT `git merge-base --is-ancestor d5edd5eada cad-fusion-live-ms0` = FALSE: that slot-branch work NEVER MERGED to the live working branch (`cad-fusion-live-ms0`, where the whole fleet commits). So the live tree was genuinely still material-blind (verified by reading calcDispatcher.ts:1690 on HEAD). My commit `986b36a2b1` delivers the material-aware fix to the LIVE branch. This is the recurring PRISM "slot-branch commit stranded, never merged -> live tree still has the bug" pattern (sibling: [[reference_sfc_inference_gate_wire_la1_2026_06_01]]). My implementation (delegate the dispatcher action to the engine + remap) may differ from the slot/oscar approach; if slot/oscar ever merges, reconcile the two -- but the live branch is now correct + verified regardless. LESSON: a fix is only real on the branch the operator/fleet actually builds on -- verify with `merge-base --is-ancestor`, not by trusting a "shipped" memory whose commit lives on an unmerged slot branch.

**Verified:** new `sfc-speed-feed-material-aware.test.ts` 5/5 (Al/steel=2.28x, Ti/steel=0.29x per canonical CUTTING_PARAMS; finite remap fields; name-only ISO resolution; util-blind regression anchor) + contract 25/25; physics-reviewer PASS + independent reviewer PASS (2-arm). tsc: my files clean (19 pre-existing errors in unrelated CAD/CAM peer files).

**SFC bug-list status now (from [[reference_sfc_speed_feed_bugs_2026_05_31]]):** Bug 1 (material-blind speed_feed) = FIXED today. Bug 2 (diameter-blind ultimate_speed_feed) = fixed 2026-05-31 (4abd8d9156). Gap 3 (drill op-path) = VERIFIED FIXED since -- the engine has per-process drilling Vc tables (`P_drilling_roughing` etc., UltimateSpeedFeedEngine.ts:772-822) and `dataKey = ${iso}_${operation}_${cutType}` (line 2204) selects them. Bug 4 (sf_orchestrate absurd output / machine_name-string crash) = LIKELY fixed (contract test sf_orchestrate/sf_quick green + extensive convergence work) but not independently re-verified this session -- next chat should probe it to formally close.

Sibling: also shipped `e697a82840` U-SFC-DARK-PARITY (SFC frontend dark-canonical color parity -- extended `.prism-dark` neutralize group + SpeedFeedPage/banner dark variants). [[reference_oscar_sfc_frontend_ownership_2026_06_22]].
