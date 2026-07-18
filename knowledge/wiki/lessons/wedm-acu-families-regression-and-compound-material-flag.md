---
title: WEDM ACU 7-pass family regression + compound-material fail-loud flag
type: lesson
domain: wedm
slot: mike
date: 2026-06-02
tags: [wedm, e-code, tech-tables, regression, single-source, R7, R12, neural-training, jm-die]
related:
  - "[[reference_acu_7pass_families_regression_2026_06_02]]"
  - "[[reference_min_files_not_wire_programs]]"
  - "[[wedm-acu-7pass]]"
---

# WEDM ACU 7-pass family regression + compound-material fail-loud flag

## What happened
While building a closed-loop print→wire-program accuracy harness against the JM Die ground-truth programs, two latent data bugs surfaced in the WEDM E-code parameter layer.

### Bug 1 — registry lost 2 of 5 E-code families (regression)
`mcp-server/src/data/jm-die-wedm-tech-tables.ts` registered only **3** families (`E12xx_standard_4pass`, `E12xx_heavy_5pass`, `E28xx_taper_5pass`). The two **ACU accuracy-priority 7-pass** families (`E952_acu_7pass_thin` 0.50″, `E56xx_acu_7pass_thick` 1.00″+) were missing, even though:
- `wedm-acu-7pass.test.ts` expected `JM_DIE_ECODE_FAMILIES.length === 5` (test was **RED**, 17/20),
- `WEDMProgramOptimizerEngine.ts:872` does `JM_DIE_ECODE_FAMILIES.find(f => f.id.includes("acu"))` → silently `undefined`,
- `WEDMProgramNeuralAnalysisEngine` looked them up by id → never matched,
- the real data already existed in `mcp-server/src/data/mitsubishi-fa-s-extracted.ts` (12 thickness records × 7 passes, genuine Mastercam FA-S E-pac codes/feeds/offsets/Ra),
- and a THIRD selector, `WireEDMDeepAIHardeningEngine._selectECodeFamily`, had its *own* ACU implementation off that same data.

This is the **R7 "N divergent selectors"** failure mode: three independent E-code-family selectors, only one of which knew about ACU.

### Bug 2 — silent wrong answer for compound/exotic materials (R12)
`jm-die-wedm-program-patterns.ts::getJMDiePatternForMaterial(material, thickness, taper)` returned a confident `E12xx_standard_4pass` recipe for **any** material not in its inline hardened list — including carbide, Inconel, Ti, 17-4PH, CPM, copper, brass, none of which JM has wire-EDM calibration for. That output feeds `WEDMNeuralTrainingEngine:2109` as a training baseline → **poisoned labels** for exotic-material parts. The sibling `selectECodeFamily` fails loud (returns `null`) for unknown materials; this one failed silent.

## Fix
- `buildAcuFamilyFromFAS(thicknessInch, id)` builds the 2 ACU families by **single-sourcing** values from `findFASRecord()` (no hand-typed numbers); pushed into `JM_DIE_ECODE_FAMILIES` (3→5); added an ACU branch to `selectECodeFamily` (`Ra < 0.2 µm` OR `tol < 0.003 mm` → thin ≤15 mm / thick >15 mm).
- Added `material_calibrated: boolean` + `warning?: string` to `getJMDiePatternForMaterial` (purely additive / non-breaking). `JM_CALIBRATED_MATERIALS` is single-sourced from the family registry, so uncalibrated materials now carry an explicit fail-loud warning instead of a silent steel recipe.
- Verified RED→GREEN: 117/117 across `wedm-acu-7pass` (20), `jm-die-wedm-program-patterns` (24, +4 new), `WEDMProgramOptimizerEngine` (30), `WEDMProgramNeuralAnalysisEngine` (20), `WEDMNeuralTrainingEngine` (73).

## Lessons
1. **A "JM uses N families" count that disagrees with `JM_DIE_ECODE_FAMILIES.length` means the registry lost a family** that real extracted data + a RED test already define — wire it from the extracted source, never re-type values.
2. **Selectors must be singular.** When ≥2 functions select the same thing (here: E-code family), they drift. Consolidate or have one delegate to the canonical one.
3. **Fail loud for uncalibrated inputs.** A confident fallback recipe for a material you have no data on is worse than a flagged one — especially when it becomes a training label.

## Corpus reality (honest scope)
Directly-comparable raw-G-code wire programs in `JM DIE/WIRE EDM/` = **3 unique** (ITW D2 4-pass, NOZE SS taper, FIOCCHI D2 heavy). The ~3,970 `.mcx-8`/`.MCX` are binary Mastercam projects (need Mastercam to post); `.MIN` files there are Okuma **lathe** programs ([[reference_min_files_not_wire_programs]]). So "100% accuracy for all JM wire programs" is bounded — the harness reproduces the 3 testable programs' parameters exactly (a regression-lock), and the real wins are the data-correctness fixes above. Harness: `mcp-server/scripts/wedm-print-to-program-accuracy.ts` → `state/shared/wedm-p2p-accuracy/`.
