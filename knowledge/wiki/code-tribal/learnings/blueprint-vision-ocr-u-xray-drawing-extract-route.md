# BLUEPRINT-VISION-OCR/U-XRAY-DRAWING-EXTRACT-ROUTE — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-DRAWING-EXTRACT-ROUTE (slot:xray): Phase-1 POST /api/v1/drawing/extract -- upload->extract->contract chain

**Commit:** `ab018ccb857a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T20:35:13-05:00
**Tags:** blueprint-vision-ocr, u-xray-drawing-extract-route, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-DRAWING-EXTRACT-ROUTE (slot:xray): Phase-1 POST /api/v1/drawing/extract -- upload->extract->contract chain

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-DRAWING-EXTRACT-ROUTE (slot:xray): Phase-1 POST /api/v1/drawing/extract -- upload->extract->contract chain

The keystone the app-integration plan names: upload.ts set ready_for_ocr and nothing
consumed it. New routes/drawing.ts: pure extractDrawingChain(callTool, body) composes
prism_resource_extraction:drawing_extract (the now-real DXF producer) ->
prism_cad:blueprint_extract_and_route (or blueprint_extract_contract when route:false)
-> returns the versioned BlueprintExtractionContract + the confirm-gated 20-consumer
fan-out plan, in ONE HTTP call. PDF/raster -> 202 queued (async VLM OCR is a GPU job;
NOT faked synchronously, R12). Mounted /api/v1/drawing in routes/index.ts.

Per-file 2-arm scrutiny FAIL->fixed both P1s: (1) arbitrary-file-read/path-traversal --
an HTTP caller-supplied path was fs-read with no confinement, reachable unauthenticated
(optionalToken is non-blocking); added drawingExtractAllowRoots() + isWithinAllowedRoot()
(path.resolve + startsWith(root+sep), prefix-confusion-safe), 403 before the producer when
a .dxf would be read outside the upload staging dir (mirrors routes/ppg.ts); (2) added
adversarial 403 tests (out-of-root + traversal, both assert producer-not-called). Also
fixed an info-leak (generic 422 bodies, no raw dispatcher-error echo). Both arms PASS post-fix.

Pure-core + thin-glue (testable without express); 13 tests incl 2 adversarial; 80/80
across the full engine+dispatcher+contract+route chain; tsc-clean.
```

## Files touched (4)
- mcp-server/src/__tests__/drawingRoute.test.ts | 176 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/drawing.ts              | 155 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/index.ts                |   5 ++++
- 3 files changed, 336 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ab018ccb857a`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._