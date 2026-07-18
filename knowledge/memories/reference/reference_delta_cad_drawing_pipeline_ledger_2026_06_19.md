---
name: reference_delta_cad_drawing_pipeline_ledger_2026_06_19
description: "Comprehensive CAD-drawing pipeline design + keystone CADFeatureCompletenessLedgerEngine shipped (slot:delta, root-cause fix for \"missed features\")"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.540Z
aliases: reference_delta_cad_drawing_pipeline_ledger_2026_06_19
---


# CAD-drawing pipeline (assess + design + keystone) — slot:delta, 2026-06-19

Operator /goal: assess Fusion CAD-drawing, design a more comprehensive pipeline (sketch-first, tribal-fed-during-draw, print-regen dimension-by-dimension validation, secondary-op stock), local-LLM draws / Claude failsafe. Commit `37e5d383f0` on `cad-fusion-live-ms0`.

## Root cause of "we missed several features" (ground truth, 4 cited agents)
The yesterday-test was a **stepped-bore/bushing print** read by the **Ollama VLM ensemble** (`scripts/blueprint-ocr-training-loop.mjs` + `scripts/lib/ollama-vision-extract-lib.mjs`). It missed the **far-side smaller bore diameter** + the **internal lead-in transition chamfer**. Root cause = an **OCR/VLM prompt omission** (never told the model bores can be multi-diameter), patched narrowly in `84a78522f8`. **It was an EXTRACTION miss, not a drawing miss.** Generalized: features drop silently at every stage because nothing ENUMERATES the print's full feature set and RECONCILES every downstream artifact against it.

## What is BUILT now (this commit)
`CADFeatureCompletenessLedgerEngine.ts` (pure) — the keystone backbone:
- `build(extraction, partNumber)` enumerates a `DimensionExtractionResult` into one entry PER feature (stepped bore = N entries, NEVER collapsed); inch->mm x25.4; malformed numerics flagged `invalid` (loud), never dropped.
- `reconcile(ledger, modelFeatures)` → MISSING / EXTRA / MISMATCHED (fail-loud); `complete` requires missing=0 AND mismatched=0 AND invalid=0.
- `advance()` forward-only lifecycle (extracted->sketched->modeled->validated), non-mutating.
- WIRED: `cadDispatcher` actions `cad_feature_ledger_{build,reconcile,status}` (enum+getEngine+case+schema). 22 tests pass incl. dispatcher round-trip + the keystone (stepped bore -> 1-bore model -> exactly 2 MISSING). tsc clean for changed files.
- KNOWN P2 (honest): `reconcile` matches by featureType + nearest-value and IGNORES the `label` field; `ModelFeature` JSDoc overclaims "label enables feature-paired matching." Follow-up: use label/datum to disambiguate same-type features.

## Verified current-state (cite-backed) for the rest of the pipeline
- Ollama->CAD lane EXISTS (`scripts/cad-text-to-cadquery.mjs`, qwen2.5-coder:32b -> CadQuery) but STEP **blocked** (no cadquery/build123d in portable Python; unblock `U-QUEBEC-MCP-CADQUERY-MERGE`); unwired (no dispatcher action).
- Fusion bridge is `Fusion360LiveBridgeEngine.ts` on **:18360** (NOT :18365), sketch/extrude/loft present but **geometry-only (no 2D constraints)**, never verified live.
- `AISystemRouterEngine` has **no CAD/drawing task class** -> no Ollama-first/Claude-fallback chain for CAD gen.
- Geometry-fidelity validation EXISTS (`CADGeometryComparisonEngine` Hausdorff/Chamfer/volume); **print-regen same-layout dimension-by-dimension compare is entirely NET-NEW** (model->drawing gen + view-match + dim-extract + pairing + tolerance table) — the biggest build.
- CAD per-feature tribal-feed-during-draw absent (CAM has `CAMTribalKnowledgeInjectionEngine`); secondary-op stock exists only as CAM toolpath params, not baked into CAD geometry.

## Design spec + dependency-ordered build units
`state/shared/specs/CAD-DRAWING-PIPELINE-COMPREHENSIVE-2026-06-19.md` (+ .html twin). 6-stage pipeline (BUILT/PARTIAL/NET-NEW), 7 build units. Order after the ledger (#1, DONE):
2. U-CADDRAW-SKETCH-DIM-GATE (sketch-first first-line-of-defense; diff sketch dims vs ledger before 3D)
3. U-CADDRAW-TRIBAL-INJECT (clone `CAMTribalKnowledgeInjectionEngine` to CAD per-feature)
4. U-CADDRAW-STOCK-OFFSET (geometry stock allowance incl. spark-gap from `constants.ts:643-668`)
5. U-CADDRAW-ROUTE-CLASS (cad_drawing task class + Ollama-first/Claude-fallback in AISystemRouterEngine)
6. U-CADDRAW-PRINT-REGEN-VALIDATE (the final gate, multi-unit, biggest NET-NEW)
7. U-CADDRAW-STEPPED-BORE-FEATURE (extend `CADFeatureRecognitionEngine` enum: counterbore/stepped_bore/transition_chamfer)

Related: [[reference_delta_closed_loop_replication_methodology_2026_06_10]] · [[feedback_model_validate_against_print_loop]] · [[reference_delta_step_inch_unit_convention]] · [[reference_delta_jm_spark_gap_convention]]
