---
name: reference_xray_drawing_extract_normalizer_2026_06_24
description: Geometry-producer normalizer (normalizeDrawingExtractToContract) closing the drawing_extract->BlueprintExtractionContract silent-loss seam; two producer shapes now reach the contract.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.271Z
aliases: reference_xray_drawing_extract_normalizer_2026_06_24
---


# xray drawing-extract -> contract normalizer (2026-06-24, slot xray)

**U-XRAY-DRAWING-EXTRACT-CONTRACT-NORMALIZER.** Phase-1 backend keystone of the
[[blueprint-vision-app-integration-plan-2026-06-23]]: the BlueprintExtractionContract
(`mcp-server/src/schemas/BlueprintExtractionContract.ts`) had ONE normalizer
(`normalizeFusedToContract`, for the VLM `fuseEnsemble` shape) and was ORPHANED — no producer
reached it. R8 reading-first surfaced the real gap.

## The silent-loss seam (R12 win — found by reading, not assuming)
The dispatcher-reachable `drawing_extract` (`resourceExtractionDispatcher.ts:175` ->
`Drawing2DExtractionEngine.extractDrawing`) returns a DISTINCT producer shape:
`ExtractionResult.dimensions[] = {value:number, unit:'mm'|'in', type:'linear'|'angular'|'radial'|'diameter', text}`
— each dim carries its OWN unit, NOT a pre-normalized `value_mm`. Piping it through
`normalizeFusedToContract` would have **silently dropped every dimension** (`d.value_mm` is
`undefined` -> `NaN` -> filtered) AND lost the inch->mm conversion (xray's #1 refuse). This is
exactly the silent-loss class the versioned contract exists to prevent.

## Fix
Added sibling `normalizeDrawingExtractToContract` (same module):
- **UNITS-FIRST:** per-dim convert recognized inch ('in'/'inch'/'in.') *25.4 -> mm; recognized
  'mm' passes through; **unrecognized/missing unit is KEPT (no data loss) but forced
  `needs_confirm`** — never silently trusted as mm (the 25.4x dangerous direction).
- **value guard:** accept a number or non-empty numeric string ONLY; ''/null/false/[] DROPPED
  (never `Number("")===0` coerced to a fake value_mm:0).
- `radial`->`radius` type map; geometry-confidence 1.0 on a successful deterministic parse / 0.5
  if a producer signals `success:false` (current engine always success:true — the 0.5 branch is a
  defensive guard, locked by test); `annotations`->`notes`; `partInfo`->`title_block`; `n_models:0`;
  `status:'unknown'` (ensemble corroboration is VLM-only).
- Extracted a shared private `finalizeContract` (summary rollup + needs_confirm count) so BOTH
  normalizers' envelope lives in one place; refactored `normalizeFusedToContract` onto it,
  behavior-identical (14 prior tests stay green).

## Verification
28 tests (14 new), tsc-clean, 3-arm per-file scrutiny PASS (code-analyzer + test-review-agent +
reviewer); the two P2s (units-leak for non-conforming unit strings, `Number()` 0-coercion) were
hardened in-pass.

## State / next
Both producer paths (VLM ensemble via `normalizeFusedToContract` + CAD-drawing geometry via
`normalizeDrawingExtractToContract`) now reach the versioned contract. The Phase-1
`POST /api/v1/drawing/extract` route (owner papa/quebec) is now a thin follow-on: call the producer
dispatcher, pick the normalizer by producer, validate, return. Producer-side gaps the route owner
resolves: `drawing_extract` is currently simulated-data-driven (real DXF parse not implemented);
`createUploadRouter` is not yet registered in `routes/index.ts`.

Related: [[reference_xray_extraction_contract_2026_06_23]] ·
[[reference_xray_cross_source_dim_reconcile_2026_06_02]] · [[feedback_check_units_first]]
