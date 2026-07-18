---
name: reference-whiskey-rungc-step-brep-gap-2026-06-26
description: "R12 finding -- STEPGeometryParserEngine is an entity-COUNT parser, NOT a B-rep extractor, so it does NOT feed TurningCADImportEngine; the STEP->CADSolidInput stage is the real Rung C-CAD gap (slot:whiskey)"
type: reference
slot: whiskey
galaxy: lathe
source: prism-memory
synced: 2026-06-27T20:30:47.261Z
aliases: reference_whiskey_rungc_step_brep_gap_2026_06_26
---


# Rung C-CAD: STEP->turning-features is NOT a 2-engine wire (R12, 2026-06-26)

While building the lathe closed-loop geometry leg (Kienzle/Lathe-Wizard /goal), I assumed (and wrote in a handoff) that Rung C-CAD = `STEPGeometryParserEngine -> TurningCADImportEngine -> TurningInput`. **Verified false.**

## The shape mismatch
- **`STEPGeometryParserEngine.parseFile(path): STEPParseResult`** (`mcp-server/src/engines/STEPGeometryParserEngine.ts:118`) returns `STEPEntityCounts` (counts of STEP entities) + `InferredGeometry` (`has_freeform_surfaces`, axisymmetric heuristic via `evidenceForFeatureKinds`). It is a **lightweight entity-COUNTING / kind-inference** parser -- it does NOT extract real B-rep geometry with coordinates.
- **`TurningCADImportEngine.importSolid(input: CADSolidInput): TurningCADImportResult`** (`...TurningCADImportEngine.ts:230`) REQUIRES `CADSolidInput` = `faces: CADFace[]` (each with `axis{origin,direction}`, `radius_mm`, `area_mm2`, `sense`) + `edges: CADEdge[]` (with `start/end/center` `Vector3` + `radius_mm`) + vertices. It needs **real B-rep geometry with coordinates** to find the revolve axis (largest cylindrical face) + build the XZ silhouette.

The engine's own header says input comes from "Python CAD engine bridge, JS geometry parser, or user geometry data" -- the **Python cad-engine bridge** is what produces real B-rep; the JS `STEPGeometryParserEngine` only counts entities. So **the STEP->`CADSolidInput` B-rep extraction stage is MISSING** on the JS path.

## Real Rung C-CAD options (use these, not the dead-end)
- **(A) v1 = OCR/PDF path (COMPLETE today):** `BlueprintVisionOCREngine` (llama3.2-vision:11b) -> `TurningPrintIntakeEngine` (->`TurningInput`) -> `turningPrintToProgramEngine.runPipeline` -> score vs Rung A bands -> pair to source `.MIN` via `parsePartNumber` (`scripts/lib/lathe-part-number.mjs`). Closes the geometry loop for the **10 JM PDF prints** subset. Run via tsx (like the Rung B harness).
- **(B) STEP path:** wire the **Python `cad-engine/` B-rep bridge** to emit `CADSolidInput` for the **2,307 JM STEP files**, then `TurningCADImportEngine` -> `TurningInput`. Heavier; needs the Python bridge.

## Lesson
Before composing two engines, verify the OUTPUT shape of the upstream one matches the INPUT shape of the downstream one -- a same-domain name ("STEP parser" + "CAD import") does NOT guarantee shape compatibility. Here the upstream is a counts/heuristic parser and the downstream needs full B-rep.

Related: [[reference_whiskey_kienzle_closed_loop_u_w2_2026_06_26]] · [[feedback_verify_actual_contract_not_proxy]] · TurningPrintIntakeEngine (the OCR->TurningInput bridge that IS complete).
