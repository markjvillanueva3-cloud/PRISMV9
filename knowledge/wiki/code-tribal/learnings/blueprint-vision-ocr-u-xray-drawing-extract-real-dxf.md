# BLUEPRINT-VISION-OCR/U-XRAY-DRAWING-EXTRACT-REAL-DXF — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-DRAWING-EXTRACT-REAL-DXF (slot:xray): un-fake Drawing2DExtractionEngine -- real DXF parse feeds the app extraction contract

**Commit:** `e036b2d353a5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T19:56:54-05:00
**Tags:** blueprint-vision-ocr, u-xray-drawing-extract-real-dxf, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-DRAWING-EXTRACT-REAL-DXF (slot:xray): un-fake Drawing2DExtractionEngine -- real DXF parse feeds the app extraction contract

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-DRAWING-EXTRACT-REAL-DXF (slot:xray): un-fake Drawing2DExtractionEngine -- real DXF parse feeds the app extraction contract

Drawing2DExtractionEngine.extractDrawing was a pure stub (app-integration plan
flagged it "simulated-data-driven") that only echoed injected simulatedData, so the
drawing_extract producer dropped every dimension on a DXF upload. New pure
parseDxfContent(content) extracts REAL entities + DIMENSION values (group 42), type
(group 70 & 7), layers (group 8), TEXT/MTEXT annotations, bounds, and $INSUNITS
(1=inch/4=mm), reusing parseDXFGroups (now exported from DXFGeometryParserEngine).
Engine stays I/O-free; dispatcher does the guarded fs.readFileSync (64MB cap) and
passes content; simulatedData kept as back-compat override.

Per-file 2-arm scrutiny caught + fixed a NET-NEW units-trust gap: unknown-$INSUNITS
dims were collapsed to unit:'mm' -> contract normalizer trusted them (needs_confirm
false), the 25.4x scale class the contract exists to prevent. Fixed: Dimension.unit
widened to 'mm'|'in'|'unknown'; 'unknown' propagates so the normalizer's unitAmbiguous
branch forces needs_confirm. Also size-capped the untrusted read (DoS guard).

LIVE-validated on a real tool DXF (3105249 ... DXF-inch.dxf): units=in detected
(25.4x trap avoided), 1311 entities, 6 real dims. 29 engine tests + 28 contract tests,
tsc-clean, 2-arm scrutiny PASS. Feeds normalizeDrawingExtractToContract ->
blueprintExtractionRouter (already wired). Memory reference_xray_drawing_extract_real_dxf_2026_06_24.
```

## Files touched (6)
- knowledge/wiki/architecture/blueprint-vision-app-integration-plan-2026-06-23.md |  18 ++++++++++
- mcp-server/src/__tests__/Drawing2DExtractionEngine.test.ts                      | 182 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- mcp-server/src/engines/DXFGeometryParserEngine.ts                               |   2 +-
- mcp-server/src/engines/Drawing2DExtractionEngine.ts                             | 154 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++----
- mcp-server/src/tools/dispatchers/resourceExtractionDispatcher.ts                |  25 ++++++++++++++
- 5 files changed, 372 insertions(+), 9 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e036b2d353a5`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._