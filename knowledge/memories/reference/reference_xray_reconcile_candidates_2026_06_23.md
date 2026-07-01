---
name: reference_xray_reconcile_candidates_2026_06_23
description: "reconcile-candidate-adapters.mjs -- the cnc+print+cad source-adapter trio feeding CrossSourceDimensionReconciliationEngine DimCandidate[]; completes the engine's documented real-candidate-sourcing next-iter; cadGtToCandidates now live (orphan closed)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.277Z
aliases: reference_xray_reconcile_candidates_2026_06_23
---


**XRAY reconcile candidate-sourcing trio** (commit `U-XRAY-RECONCILE-CANDIDATES`, slot:xray, 2026-06-23).

`scripts/lib/reconcile-candidate-adapters.mjs` (12/12 tests, 2-arm scrutiny PASS 0 P0/P1) -- the source-adapters that feed `DimCandidate[]` to `CrossSourceDimensionReconciliationEngine` (`prism_cad:cad_dimension_reconcile`, [[reference_xray_cross_source_dim_reconcile_2026_06_02]]). That engine fuses print+cad+cnc candidates into consensus dims + flagged conflicts but takes candidates IN; its documented NEXT-ITER was "build 3 thin source-adapters". This completes the trio:
- `cadGtToCandidates` -- (b) cad, lives in cad-dimension-gt-lib ([[reference_xray_cad_gt_triangulate_2026_06_23]]); re-exported here.
- `programGtToCandidates(programGT)` -- (c) cnc: clusteredDiametersIn (INCH) -> mm `diameter` + lengthIn -> `linear` overall_length. Rejects non-positive (never abs's garbage into a fake dim -- R12, a bug caught by the lib's own test).
- `printOcrToCandidates(dims)` -- (a) print: contract dims keep per-field confidence; bare numbers -> `unknown`.
- `buildPartCandidates({cadGT, programGT, ocrDimsMm})` -- merges available sources.

**Key design (verified by review):** confidence is OMITTED so the engine applies its per-source PRIOR (`DEFAULT_SOURCE_CONFIDENCE` cad 0.95 / cnc 0.90 / print 0.70; `CrossSourceDimensionReconciliationEngine.ts:179` `c.confidence != null ? ... : prior`) -- do NOT re-inline the prior (R8). DimType tokens emitted are canonical (`diameter`/`linear`/`unknown`); the engine clusters by EXACT type string + by `METRIC_SOURCES={print,cad}` vs `PRESENCE_SOURCES={cnc}` (a cnc-only dim is `presence_only`, `value_trusted:false`).

**R15 orphan closure:** wired `buildPartCandidates` into `validate-perfect-parts --cad-triangulate` -> it emits reconcile-ready candidates per part, making `cadGtToCandidates` a LIVE consumer (the prior 2-arm review had flagged it orphan-prone). LIVE: T-11BT-27-250-GR5 -> 13 candidates (10 cad diameters + 3 envelope linears L/W/H), all canonical DimCandidate, ready for the engine.

**REMAINING (capstone, fresh-context):** an executable adapters->engine->consensus integration test crosses the .mjs/.ts + mcp-server rootDir seam (tsc risk) -- the seam is review-verified (reviewer traced exact DimCandidate match + prior fallback) but an automated round-trip + a tsx runner that actually calls `reconcile()` on a live part is the documented next step. Part of the cross-source determination arc with [[reference_xray_cad_gt_triangulate_2026_06_23]] + [[reference_xray_extraction_contract_2026_06_23]].
