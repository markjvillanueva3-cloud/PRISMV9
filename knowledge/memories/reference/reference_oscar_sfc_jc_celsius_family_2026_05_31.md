---
name: oscar-sfc-jc-celsius-family-2026-05-31
description: "SFC JC °C-family conflict-resolution spec + Inconel-718 C 0.034→0.0134 typo fix + resolveJC empty-candidate fail-loud guard (slot:oscar, 2026-05-31)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.257Z
aliases: reference_oscar_sfc_jc_celsius_family_2026_05_31
---


Follow-up to [[oscar-sfc-jc-single-source-2026-05-31]]. After unifying the two K-frame JC databases, four OTHER engines were found holding independent inline JC tables in a **°C reference frame**: `UltimateSpeedFeedEngine` (`JC_MATERIALS`, 15 keys), `SuperalloyMachiningEngine` (`ALLOY_PROPERTIES`, 6), `LAMThermalSofteningEngine` (`JC_PARAMS`, 3), `AdvancedPostPhysicsEngine` (`JC_DATABASE`, 22). Read all four + ground-compared against the canonical K-table.

**Key finding — NOT a mechanical dedup. Divergences fall into 3 classes** (spec: `state/shared/specs/SFC-JC-CELSIUS-FAMILY-CONFLICT-RESOLUTION-2026-05-31.md`):
- **Class A — frame-shifted identical** (safe to dedup): ~15 entries match canonical once °C↔K is accounted for (A/B/n/C/m are frame-independent; T_melt differs by exactly 273). E.g. SuperalloyMachining `inconel_718` (T_melt 1336°C = 1609 K = canonical exactly).
- **Class B — TYPO (R12 bug, FIXED this unit)**: `AdvancedPostPhysicsEngine.JC_DATABASE["Inconel 718"]` had `C: 0.034`; canonical + the 3 other PRISM tables + literature all agree **0.0134**. A/B/n/m were byte-identical (1241/622/0.652/1.30) — only C, off by a dropped digit. 2.5× strain-rate-sensitivity error → over-predicts flow stress → over-predicts cutting force → corrupts S(x).
- **Class C — legitimate ALTERNATE published fits (must NOT force one winner)**: Ti-6Al-4V (Lee-Lin 862/331 vs Meyer 1098/1092), 4140 (×3), 316L, Inconel 625 (×3), Waspaloy (×3), Hastelloy X, Rene 41, 2024-T351, H13, D2, 17-4PH. Forcing one would silently corrupt an engine's physics. Resolution = multi-fit canonical registry with provenance + named variants (deferred unit `U-OSC9-JC-CELSIUS-FAMILY-UNIFY`, sub-units U-1..U-5 in the spec).
- **Class D — NEW alloys** absent from canonical (Mar-M247, Ti-5Al-2.5Sn, Hastelloy C-276, 5052-H32, MIC-6 …) = coverage gain on absorption.

**SECOND bug found + fixed (R12 fail-loud)**: `AdvancedPostPhysicsEngine.resolveJC` did `k.includes(c.split(" ")[0])` — when `material_iso` is empty, `k.includes("")` is true for EVERY key, so an unresolvable material **silently fell back to the first DB entry (Ti-6Al-4V)** instead of erroring. Fixed with a `c.trim().length === 0 → continue` guard. Only changes behavior for the genuinely-unresolvable case (silent wrong-material → proper null/error); the regression test `AdvancedPostPhysicsEngine.inconel718-jc-typo.test.ts` (11 cases) pins both fixes.

**Test design (R9, reusable)**: the engine reports strain/strain_rate/temperature_ratio — all **independent of C** (C enters only term2). The test reads those back and independently recomputes flow stress with C=0.0134 AND with C=0.034, asserting the engine matches 0.0134 and is >50 MPa from 0.034. Isolates the coefficient, robust to unrelated chain changes. tsc clean. 1 pre-existing UNRELATED failure in `CpsPostParserEngine.cps_summary` (collection-time, different engine — proven independent: AdvancedPostPhysics tests in the same file all pass, so the module import is healthy).

Relates to [[feedback_check_units_first]] (°C/K frame), [[feedback_always_fill_gaps]] (surfaced + fixed the resolveJC hole instead of working around it in the test), [[feedback_verify_actual_contract_not_proxy]].
