# BLUEPRINT-VISION-OCR/U-XRAY-DRAWING-EXTRACT-POLL-PRUNE — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-DRAWING-EXTRACT-POLL-PRUNE (slot:xray): close the two P2 gaps from the async-route unit -- test the poll handler + schedule prune (R16 don't one-shot)

**Commit:** `d350e3818ae7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T22:23:16-05:00
**Tags:** blueprint-vision-ocr, u-xray-drawing-extract-poll-prune, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-DRAWING-EXTRACT-POLL-PRUNE (slot:xray): close the two P2 gaps from the async-route unit -- test the poll handler + schedule prune (R16 don't one-shot)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-DRAWING-EXTRACT-POLL-PRUNE (slot:xray): close the two P2 gaps from the async-route unit -- test the poll handler + schedule prune (R16 don't one-shot)

Closes the deferred P2s a 2-arm scrutiny flagged on 7db54c683c:
 1. The GET /api/v1/drawing/extract/job/:jobId poll handler was UNTESTED (R15-TEST gap). Extracted
    its logic into a pure exported pollJobResponse(store, jobId) -> {status, body} (the express GET
    handler is now a one-liner) + 7 real tests: 404 unknown, traversal->404 backstop, queued/running
    status-only, done-surfaces-result-not-error, failed-surfaces-error-not-result, and a falsy-but-
    present null result (locks the result-!==-undefined semantics vs a truthiness simplification).
 2. store.prune was never scheduled (unbounded tmp job-file growth). Now pruned on each enqueue
    (terminal jobs older than the TTL) -- NO background timer, so no R14 orphan; best-effort try/catch
    never blocks the new job; the fresh queued job is younger than the TTL so it is never swept.
    TTL = PRISM_EXTRACTION_JOBS_TTL_MS clamped to a >=60s floor (default 1h) so a malformed/tiny env
    can't prune a just-done result before a client polls (arm-B P2 hardening).

pollJobResponse verified behavior-identical to the prior inline handler (arm A diffed it vs the base
commit). 23/23 drawingRoute tests (was 16), tsc-clean. Per-file 2-arm scrutiny PASS.
```

## Files touched (3)
- mcp-server/src/__tests__/drawingRoute.test.ts | 60 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- mcp-server/src/routes/drawing.ts              | 44 +++++++++++++++++++++++++++++++++-----------
- 2 files changed, 92 insertions(+), 12 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d350e3818ae7`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._