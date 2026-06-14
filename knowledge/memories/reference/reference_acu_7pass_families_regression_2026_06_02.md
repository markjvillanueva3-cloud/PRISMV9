---
name: reference-acu-7pass-families-regression-2026-06-02
description: "WEDM tech-tables lost its 2 ACU 7-pass E-code families (E952 thin / E56xx thick); the registry + selectECodeFamily only had 3 of 5 — a silent regression caught by a RED test + a dormant consumer. Fixed by wiring from real FA-S extracted data. (slot:mike 2026-06-02)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.008Z
aliases: reference_acu_7pass_families_regression_2026_06_02
---


# WEDM ACU 7-pass families regression (E952 / E56xx)

**Bug:** `mcp-server/src/data/jm-die-wedm-tech-tables.ts` registered only **3** E-code families (`E12xx_standard_4pass`, `E12xx_heavy_5pass`, `E28xx_taper_5pass`) and `selectECodeFamily` had no ACU branch — but **5** were expected. The two missing accuracy-priority 7-pass families (`E952_acu_7pass_thin` 0.50″, `E56xx_acu_7pass_thick` 1.00″+) were referenced by THREE live consumers that all silently got nothing:
- `wedm-acu-7pass.test.ts` — RED (expected `JM_DIE_ECODE_FAMILIES.length===5` + `selectECodeFamily(Ra<0.2)→acu`; got 3 + `E12xx_heavy_5pass`).
- `WEDMProgramOptimizerEngine.ts:872` — `JM_DIE_ECODE_FAMILIES.find(f => f.id.includes("acu"))` → `undefined` (dormant path).
- `WEDMProgramNeuralAnalysisEngine.ts` — `find(f => f.id === pattern.e_code_family)` → no match for any acu pattern.

**Root cause:** the canonical registry array + selector were never wired to the real extracted data that already existed — `mcp-server/src/data/mitsubishi-fa-s-extracted.ts` holds 12 thickness records (0.50″–6.00″ × 7 passes) with genuine Mastercam FA-S E-pac codes/feeds/offsets/Ra. The `WireEDMDeepAIHardeningEngine._selectECodeFamily` had its OWN private ACU impl off this data, but the shared tech-tables surface didn't — classic R7 "N divergent selectors" drift.

**Fix (commit on cad-fusion-live-ms0, slot:mike):** added `buildAcuFamilyFromFAS(thicknessInch,id)` that single-sources the 2 anchor families from `findFASRecord(0.5)` / `findFASRecord(1.0)` (no hand-typed values), pushed them into `JM_DIE_ECODE_FAMILIES` (3→5), and added an ACU branch to `selectECodeFamily` (Ra<0.2µm OR tol<0.003mm → thin ≤15mm / thick >15mm). RED 17→GREEN 20; 168/168 across acu+patterns+optimizer+neural-analysis+neural-training.

**ADVERSARIAL-CAUGHT SUB-BUG (the value of the verify Workflow):** my first thin-family builder index-paired `epac[i]↔offsets[i]`, but RECORD_1's 7-pass config has 8 `epac` (a leading **`952` APPROACH** code) vs 7 `offsets`/`registers` — so it emitted `952` as cut pass 1, shifted every cut-code↔offset pairing by one, and dropped the finest skim `E5607`. An 8-agent adversarial Workflow (2 of 3 verifiers REFUTED) flagged it; the two file-reviewers had rated it PASS (R7 reviewer split). Resolved DEFINITIVELY by reading the **raw `Mitsubishi (FA-S).tech` XML** (`H:/PRISM/resources/MasterCam/.../wire/Power/`): pass `num="1"` = `<epac>952, 5601</epac>` with ONE offset → `952` is `<approach>`, `5601` is the first cut. Correct family = 7 cut passes **E5601–E5607**, register/offset-aligned; builder now strips `approachCount = epac.length − offsets.length` and fails loud on any length mismatch. Lesson: **adversarial verification + going to the raw source beats N reviewers averaging an opinion.**

**ALSO hardened (P1):** `isJMMaterialCalibrated` was bidirectional-substring (`"A286".includes("A2")` → real superalloy wrongly calibrated; `"316 + WC composite"` calibrated) → replaced with EXACT-TOKEN match + a composite/exotic-marker disqualifier (WC/CARBIDE/PCD/INCONEL/TI/…). Bias = false-negative is safe (adds verify-warning), false-positive poisons training.

**Still open (R7 / R12):** `jm-die-wedm-program-patterns.ts::getJMDiePatternForMaterial` (the OTHER selector, which feeds `WEDMNeuralTrainingEngine:2109`) still can emit only **3 of 5** families AND **silently returns `E12xx_standard_4pass` for uncalibrated/compound materials** (carbide, Inconel, Ti, 17-4PH, CPM) instead of failing loud — poisoning neural-training labels for exotic-material parts. Tracked in the accuracy harness (`scripts/wedm-print-to-program-accuracy.ts` → `state/shared/wedm-p2p-accuracy/`).

**How to apply:** when a "JM uses N families" count disagrees with `JM_DIE_ECODE_FAMILIES.length`, suspect the registry lost a family that real extracted data + a RED test already define — wire from `mitsubishi-fa-s-extracted.ts`, don't re-type values. Related: [[reference_min_files_not_wire_programs]] · [[reference_wire_domain_atlas_for_mike_2026_05_27]]
