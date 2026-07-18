---
title: WEDM ACU selector convergence (R7 divergent-selector fix)
type: lesson
domain: wedm
created: 2026-06-03
by: claude-f97187e6 (slot:mike)
tags: [wedm, r7, divergent-selector, nn-training, acu, jm-die]
---

# WEDM ACU selector convergence (R7)

## Symptom
The WEDM print→program accuracy harness (`mcp-server/scripts/wedm-print-to-program-accuracy.ts`) emitted, in its reachability audit:

> ⚠ patterns.ts `getJMDiePatternForMaterial` can NEVER emit: `E952_acu_7pass_thin`, `E56xx_acu_7pass_thick` (silent-fallback selector — feeds WEDMNeuralTrainingEngine)

## Root cause — two divergent selectors (R7)
| selector | file | inputs | families reachable |
|---|---|---|---|
| `selectECodeFamily` | `jm-die-wedm-tech-tables.ts` | material, taper, **tolerance, Ra**, thickness | 5/5 |
| `getJMDiePatternForMaterial` | `jm-die-wedm-program-patterns.ts` (feeds the NN) | material, thickness, taper | **3/5** |

The patterns selector had **no finish/tolerance input**, so it was structurally incapable of selecting the 2 accuracy-priority ACU 7-pass families. Since it is the selector that feeds `WEDMNeuralTrainingEngine`, the NN trained on a 3-of-5 label space — precision ACU work was systematically mislabeled.

## Fix — converge, don't average
- Exported shared thresholds `ACU_RA_MAX_UM` / `ACU_TOL_MAX_MM` / `ACU_THIN_MAX_MM` from tech-tables; **both** selectors import them (duplicated inline literals are how this blind spot re-appears).
- Added optional `finish?: {tolerance_mm?, target_ra_um?}` to `getJMDiePatternForMaterial` (backward-compatible — legacy 3-arg calls unchanged). ACU branch returns the family **from `JM_DIE_ECODE_FAMILIES`** (FA-S extraction) — no re-typed pass constants.

## Verification
- Harness audit: 5/5 families reachable from both selectors; warning gone.
- `wedm-acu-7pass.test.ts`: 28/28 (8 new incl. a cross-selector **agreement** test that fails on any future re-divergence).
- tsc-clean.

## Lesson
When two selectors can emit the same label set, **the decision boundary must be single-sourced**. A selector that feeds model training and is missing an input dimension silently truncates the label space — the model can't learn what the selector can't express. Audit reachability of every declared label from every selector.

Related: [[reference_acu_7pass_families_regression_2026_06_02]]
