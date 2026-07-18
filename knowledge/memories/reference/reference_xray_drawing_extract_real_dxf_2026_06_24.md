---
name: reference_xray_drawing_extract_real_dxf_2026_06_24
description: Un-faked Drawing2DExtractionEngine to parse real DXF (entities + DIMENSION group-42 values); scrutiny caught a new silent units-trust gap the un-faking introduced
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.271Z
aliases: reference_xray_drawing_extract_real_dxf_2026_06_24
---


# Drawing2DExtractionEngine un-faked for real DXF parse (slot:xray, 2026-06-24)

**U-XRAY-DRAWING-EXTRACT-REAL-DXF.** `Drawing2DExtractionEngine.extractDrawing` was a pure stub
(the app-integration plan flagged it "simulated-data-driven") -- it only echoed injected
`simulatedData`. The `drawing_extract` dispatcher producer therefore returned empty, so the
`BlueprintExtractionContract` (the Phase-1 app keystone) dropped every dimension on a DXF upload.

**Fix:** new pure `Drawing2DExtractionEngine.parseDxfContent(content)` that tokenizes DXF
(reuses `parseDXFGroups`, now exported from `DXFGeometryParserEngine`) and extracts REAL entities +
DIMENSION values (group 42), type (group 70 & 7: 0/1 linear, 2/5 angular, 3 diameter, 4 radius),
layers (group 8), TEXT/MTEXT annotations, bounds (10/20), and header units ($INSUNITS 1=inch/4=mm).
Engine stays I/O-free; the dispatcher does the guarded `fs.readFileSync` (64MB cap) and passes
`content`. `simulatedData` kept as a back-compat override. Wire was already there: producer ->
`normalizeDrawingExtractToContract` -> `blueprintExtractionRouter`.

**LIVE-validated** on a real tool DXF (`3105249 ... DXF-inch.dxf`): units=in correctly detected,
1311 entities, 6 real dims (1.4999in, 2.000in, 3.369in). Inch detection = the 25.4x trap avoided.

**LESSON (the scrutiny catch -- arm B FAIL):** un-faking a stub can introduce a NEW silent-trust
path downstream. My first cut collapsed an unknown-`$INSUNITS` DXF to `unit:'mm'`, which made the
contract normalizer's `unitAmbiguous` branch see a recognized 'mm' -> `needs_confirm=false` -> an
unknown-units drawing flowed into quote/program consumers as CONFIDENT mm (the exact 25.4x scale
class the contract exists to prevent). Before the un-faking the path produced 0 dims, so the gap
was NET-NEW. Fix: widen `Dimension.unit` to `'mm'|'in'|'unknown'` and propagate `'unknown'` so the
normalizer forces `needs_confirm`. Locked by an integration test asserting unknown->confirm-gated,
mm->trusted, inch->value*25.4. **When you make a previously-empty producer emit real data, audit
every downstream gate that keys on the field you now populate -- "empty" was its own safety.**

**FOLLOW-ON same session -- `U-XRAY-DRAWING-EXTRACT-ROUTE` (`ab018ccb85`):** the Phase-1 keystone
`POST /api/v1/drawing/extract` (`routes/drawing.ts`, pure `extractDrawingChain`) -- producer ->
`prism_cad:blueprint_extract_and_route` -> versioned contract + 20-consumer fan-out in ONE HTTP call;
DXF synchronous, PDF/raster -> honest 202 queued (async VLM OCR not faked). **2ND SCRUTINY LESSON
(both arms FAIL):** un-faking the file-reading producer and then EXPOSING it via an HTTP route created
a NET-NEW arbitrary-file-read / path-traversal -- a caller-supplied `path` was `fs.readFileSync`'d with
no confinement, reachable unauthenticated (`optionalToken` middleware is non-blocking). Fixed with
`drawingExtractAllowRoots()` + `isWithinAllowedRoot` (path.resolve + `startsWith(root+path.sep)`, prefix-
confusion-safe; 403 before the producer; mirrors `routes/ppg.ts`) + adversarial 403 tests + generic 422
bodies (no raw-error leak). **Doctrine: when you expose a producer that does file I/O via an HTTP route,
confine the path to an allowlisted root -- the internal MCP dispatcher's trusted-caller assumption does
NOT hold at the HTTP boundary.** Sibling of the units-trust lesson above (both are "what becomes reachable
when a producer goes from empty/internal to real/exposed").

Files: `mcp-server/src/engines/Drawing2DExtractionEngine.ts` (+`parseDxfContent`),
`DXFGeometryParserEngine.ts` (export `parseDXFGroups`), `resourceExtractionDispatcher.ts`
(drawing_extract fs-read + size cap), `__tests__/Drawing2DExtractionEngine.test.ts` (29 tests).
Pairs with [[reference_xray_drawing_extract_normalizer_2026_06_24]] (the contract normalizer this feeds).
Related: [[blueprint-vision-app-integration-plan-2026-06-23]] Phase 1; [[feedback_check_units_first]].
