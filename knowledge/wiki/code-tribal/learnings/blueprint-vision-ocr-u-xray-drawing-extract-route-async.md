# BLUEPRINT-VISION-OCR/U-XRAY-DRAWING-EXTRACT-ROUTE-ASYNC — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-DRAWING-EXTRACT-ROUTE-ASYNC (slot:xray): wire the async-OCR job engine into POST /api/v1/drawing/extract + add the poll endpoint + the real out-of-process OCR exec

**Commit:** `7db54c683c5a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T22:15:26-05:00
**Tags:** blueprint-vision-ocr, u-xray-drawing-extract-route-async, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-DRAWING-EXTRACT-ROUTE-ASYNC (slot:xray): wire the async-OCR job engine into POST /api/v1/drawing/extract + add the poll endpoint + the real out-of-process OCR exec

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-DRAWING-EXTRACT-ROUTE-ASYNC (slot:xray): wire the async-OCR job engine into POST /api/v1/drawing/extract + add the poll endpoint + the real out-of-process OCR exec

Removes the job-engine orphan from last commit (5282a059e1): the PDF/raster branch of
extractDrawingChain now ENQUEUES a real durable job (ExtractionJobStore.create + fire-and-forget
runExtractionJob) instead of the inert 202 stub, returns 202 {jobId, poll_url}, and GET
/api/v1/drawing/extract/job/:jobId polls it. The runner's `ocr` dep is the new
scripts/ocr-extract-one.mjs -- a THIN exec (not a dup of vision-ensemble-extract): it adds only
the PDF->PNG raster step (pdf-to-png.py) and reuses the shared runEnsembleOverImage core +
VISION_FAMILY_LEADERS pulled-gate, emitting the slim {fused,models_ok,error} tuple the runner reads.

R15 chain now closed: route -> jobDeps.enqueue -> runExtractionJob -> ocrViaSubprocess ->
ocr-extract-one.mjs -> prism_cad:blueprint_extract_and_route (cadDispatcher accepts {fused}).

Security (both arms of per-file scrutiny PASS): path confinement (isWithinAllowedRoot) now guards
the async branch too -- the OCR exec fs-reads effPath, so an out-of-root .pdf is 403'd BEFORE
create/enqueue (closes the same arbitrary-read hole as the .dxf branch); poll jobId traversal is
backstopped by the store's sanitizeJobId (-> 404); spawn is argv-array + windowsHide:true; failed
spawn/parse keeps python stderr server-side (console.error) and returns a generic client error.

Tests: 60 green -- 16 drawingRoute (5 new async: 202+jobId+poll_url+created/enqueued recording,
out-of-root 403, no-jobDeps 503, create-throw 500) + 13 runner + 15 store + 16 ocr-extract-one
(node:test pure cores: arg-parse, raster-plan, model-choice incl R9-fixed cap + thinking-trap).
tsc-clean on all touched files. Per-file 2-arm scrutiny: script arm-B caught a vacuous cap test
(R9) -> fixed via injectable leaders+cap; route both arms PASS.

Deferred P2s (logged): schedule store.prune (unbounded tmp job files); GET-poll-handler has no
direct test (logic covered indirectly); tighten "durable" doc (tmp default is process- not
reboot-durable); genericize the exec's own raster-fail error (references only confined effPath).
```

## Files touched (5)
- mcp-server/src/__tests__/drawingRoute.test.ts |  70 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-------
- mcp-server/src/routes/drawing.ts              | 145 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++----------
- scripts/ocr-extract-one.mjs                   | 172 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/ocr-extract-one.test.mjs              | 122 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 492 insertions(+), 17 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7db54c683c5a`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._