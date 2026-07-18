---
name: reference_xray_extraction_contract_2026_06_23
description: "Versioned app-facing blueprint extraction contract (BlueprintExtractionContract.ts) -- the app-integration keystone; normalizeFusedToContract maps fuseEnsemble output + needs_confirm 0.70 floor; xray owns contract, papa/quebec own the route"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.272Z
aliases: reference_xray_extraction_contract_2026_06_23
---


**XRAY versioned extraction contract** (commit `U-XRAY-EXTRACTION-CONTRACT`, slot:xray, 2026-06-23).

Built `mcp-server/src/schemas/BlueprintExtractionContract.ts` (Zod v4, 14/14 tests, tsc-clean, 2-arm scrutiny PASS) -- the app-integration keystone from [[blueprint-vision-app-integration-plan-2026-06-23]]. The blueprint backend is mature but the app stops at "file uploaded"; every consumer (upload->extract route, quote autopopulate, drawing-view panel) needs ONE stable shape. This is it.

Exports:
- `BLUEPRINT_EXTRACTION_CONTRACT_VERSION = "1.0.0"` + `blueprintExtractionContractSchema` = `{schemaVersion, units:"mm", dimensions[], gdt[], notes[], profiles[], surface_finishes[], title_block?, confirm_floor, summary}`. The `schemaVersion` is a `z.literal` -> a producer change forces a bump+migration, never a silent consumer break.
- `OCR_PER_FIELD_CONFIRM_FLOOR = 0.70` -- the verified-shipped operator-confirm floor (PRINT-TO-INSPECTION-PIPELINE-V2; [[reference_xray_confidence_thresholds_reconciled]]). An OCR domain threshold, NOT a physics constant -> correctly lives WITH the contract, not physics/constants.ts.
- `normalizeFusedToContract(fused, opts)` -- maps the live `fuseEnsemble` output (vision-ensemble-fuse.mjs) into the contract; per-field `needs_confirm = confidence < floor`; drops non-finite dims; null-safe.
- `validateBlueprintExtractionContract(obj)` -- Zod safeParse wrapper, returns `{ok, data}` or `{ok:false, errors[]}`, never throws.

**Per-file scrutiny caught + FIXED 2 producer-drift P1s** (the contract had drifted from its own producer -- the exact bug a contract prevents): (1) `calloutText` read keys the VLM ensemble never emits -> it now reads the REAL reps (gdt->`raw_text` full FCF, profiles->`name`, notes->`text`, surface_finishes->`raw_text`); (2) notes/surface_finishes carry NO per-field confidence (extractNote/extractSurfaceFinish), so `calloutConfidence` now derives the corroboration fraction (corroboration/n_models, which `fuseNonDimField` DOES attach) instead of a hardcoded 0 that flagged every real note `needs_confirm`. Lesson: test a contract against the REAL producer shapes, never synthetic fixtures -- the analyst arm FAILed the synthetic-fixture version.

**[SCOPED] ownership:** xray owns the contract; papa/quebec own the `POST /api/v1/drawing/extract` route (Phase 1) -- it should `import normalizeFusedToContract`, call it on the `drawing_extract`/ensemble output, and return+validate the versioned envelope. NOTE: `drawing_extract` (resourceExtractionDispatcher) currently routes via Drawing2DExtractionEngine -- verify its output matches the fuseEnsemble shape (or add an adapter) before wiring the normalizer there.

Pairs with [[reference_xray_cad_gt_triangulate_2026_06_23]] (same session) + the app plan.
