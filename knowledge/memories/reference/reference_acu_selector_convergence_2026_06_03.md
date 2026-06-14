---
name: reference-acu-selector-convergence-2026-06-03
description: WEDM R7 divergent-selector convergence — getJMDiePatternForMaterial (NN-feeding selector) was structurally blind to the 2 ACU 7-pass families; converged with selectECodeFamily via shared exported thresholds. slot:mike.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.008Z
aliases: reference_acu_selector_convergence_2026_06_03
---


# WEDM ACU selector convergence (R7) — slot:mike 2026-06-03

**Found by:** the harness's own reachability audit in `mcp-server/scripts/wedm-print-to-program-accuracy.ts` — `⚠ patterns.ts getJMDiePatternForMaterial can NEVER emit: E952_acu_7pass_thin, E56xx_acu_7pass_thick`.

**Root cause (R7 divergent selectors):** PRISM had TWO E-code family selectors:
- `selectECodeFamily()` in `src/data/jm-die-wedm-tech-tables.ts` — takes `{material, taper_angle_deg, tolerance_mm, target_ra_um, thickness_mm}`; reaches all 5 declared JM families.
- `getJMDiePatternForMaterial(material, thickness_mm, needs_taper)` in `src/data/jm-die-wedm-program-patterns.ts` — **the selector that feeds `WEDMNeuralTrainingEngine`** — took only 3 inputs, **no finish/tolerance signal**, so its 3-branch tree (taper→E28xx; thick/hardened→E12xx_heavy; else→E12xx_standard) could STRUCTURALLY never emit the 2 accuracy-priority ACU 7-pass families. The NN therefore trained on a **3-of-5 label space** → precision ACU thin/thick work systematically mislabeled as standard/heavy.

**Fix (converge, don't average — R7):**
1. Exported single-source thresholds from tech-tables: `ACU_RA_MAX_UM=0.2`, `ACU_TOL_MAX_MM=0.003`, `ACU_THIN_MAX_MM=15`. BOTH selectors now decide ACU on the same boundary (duplicated inline literals were how the blind spot would re-appear).
2. Added optional 4th arg `finish?: {tolerance_mm?, target_ra_um?}` to `getJMDiePatternForMaterial` (backward-compatible — every legacy 3-arg caller is byte-identical). When ACU-required + non-taper, it returns the ACU family **sourced from `JM_DIE_ECODE_FAMILIES`** (the FA-S extraction) — NO re-typed constants.
3. Harness reachability sweep for patterns.ts now exercises the finish dimension.

**Verified:** audit green (5/5 reachable, both selectors agree); `wedm-acu-7pass.test.ts` 28/28 (8 new: backward-compat lock, ACU thin/thick, taper precedence, threshold boundary, single-source offsets, cross-selector agreement, all-5-reachable); tsc-clean. Run: `cd mcp-server && npx tsx scripts/wedm-print-to-program-accuracy.ts`.

**Honest scope note (R12):** this fixes the NN's *label-space completeness*, NOT print→program *accuracy*. The harness's "100%" is still a REGRESSION-LOCK over N=3 (the 3 raw-G-code programs ARE the calibration set — everything else in WIRE EDM/ is binary Mastercam). The genuine accuracy proof needs iter-2 (G-code EMISSION roundtrip driving `WEDMPrintToProgramEngine`, diff emitted vs real NC) + a held-out corpus. Those are the next units.

Related: [[reference_acu_7pass_families_regression_2026_06_02]] · [[reference_min_files_not_wire_programs]] · [[reference_wire_domain_atlas_for_mike_2026_05_27]]
