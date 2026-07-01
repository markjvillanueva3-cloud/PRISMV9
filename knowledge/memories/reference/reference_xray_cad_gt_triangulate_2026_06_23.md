---
name: reference_xray_cad_gt_triangulate_2026_06_23
description: "CAD-model dimensional GT lib (cad-dimension-gt-lib) + GPU-free CAD<->program triangulation wired into validate-perfect-parts --cad-triangulate; the reconcile-engine \"(b) cad adapter\"; CAD-GT-for-OCR-recall is bounded (5/11 parts) and deprioritized"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.270Z
aliases: reference_xray_cad_gt_triangulate_2026_06_23
---


**XRAY CAD-model dimensional GT + cross-source triangulation** (commit `U-XRAY-CAD-GT-TRIANGULATE`, slot:xray, 2026-06-23).

Built `scripts/lib/cad-dimension-gt-lib.mjs` (26/26 tests, 2-arm scrutiny PASS) -- the dimensional CAD-GT layer that did NOT exist (the existing `cad-ground-truth-lib`/`cnc-ground-truth-lib` are presence/feature-KIND only, by deliberate R12 design; `CrossSourceDimensionReconciliationEngine` consumes candidates but its documented "(b) cad: STEP geometry measure" source-adapter was unbuilt).

Exports:
- `extractCadGT(stepText, opts)` -- callout-class dimensional GT from a neutral STEP: radii->diameters (x2), drop sub-floor fillet-class (CAD_CALLOUT_FLOOR_MM=1.0mm, over-count guard), cluster (reuse `clusterDiameters`), + envelope bbox L/W/H. All mm. reliability class (ok / unknown-unit / no-callout-geometry). Reuses `extractRadiiMm`/`extractBboxMm` from `step-dimension-extract.mjs`.
- `scorePartAgainstCadGT(ocrDimsMm, cadGT, opts)` -- mm-vs-mm recall/precision (mirrors `scorePartAgainstProgram`).
- `triangulateGT({programGT, cadGT}, opts)` -- greedy-1:1 program-cap-cad corroboration; confidence high|uncorroborated|program-only|cad-only|none. Zero-dependency harness helper; defers to `CrossSourceDimensionReconciliationEngine` (`prism_cad:cad_dimension_reconcile`) for production multi-source consensus (R7 surface-don't-blend).
- `cadGtToCandidates(cadGT, opts)` -- emits the engine's `DimCandidate[]` shape (canonical DimType: `diameter` for features, `linear`+L/W/H labels for envelope; source:cad; conf 0.95 ok / 0.5 unreliable). THE fix for a P1: the engine clusters by EXACT type string and has NO "length" type, so envelope must be "linear" or it never co-clusters with a print's linear dim.

Wired GPU-free into `validate-perfect-parts.mjs --cad-triangulate` (additive, opt-in, early-return before OCR; `findStepForPart` resolves the neutral STEP via the sample-CAD folder).

**R12 HONEST bounded-payoff finding (decide-by-the-number):** CAD-GT as an OCR-recall-corpus EXPANSION is small-payoff and was already deprioritized in [[reference_xray_perfect_parts_gt_source_2026_06_22]] -- only **11 of 91** perfect parts have a neutral STEP (68 are .ipt/Parasolid binary, unreadable), and only **5 of those 11** have a posted program (.MIN/.hnc) -- the hard CAD<->program corroboration ceiling. Live run (2 sampled): both resolved their .stp and extracted 13 + 20 real callout dims (unit=inch, class=ok), but both programs are .mcx-8 binary CAM -> `cad-only`/0-corroborated. So the lib's durable value is the **reconcile-engine "(b) cad adapter"** + the **cross-source determination primitive**, NOT a recall lever. The genuine next OCR step remains the GPU validation run of the mill-recall lift (`U-XRAY-MILL-PROGRAM-GT`), GPU-gated.

Pairs with [[reference_xray_cross_source_dim_reconcile_2026_06_02]] (the consensus engine this adapter feeds) and the backlog [[blueprint-reading-improvement-backlog-2026-06-19]] P2.7.
