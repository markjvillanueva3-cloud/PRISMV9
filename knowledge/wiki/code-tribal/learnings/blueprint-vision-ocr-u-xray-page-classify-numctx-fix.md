# BLUEPRINT-VISION-OCR/U-XRAY-PAGE-CLASSIFY-NUMCTX-FIX — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PAGE-CLASSIFY-NUMCTX-FIX (slot:xray): fix silent empty-response (num_ctx 4096 too small -> 8192)

**Commit:** `e3fababc9069` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T21:47:13-05:00
**Tags:** blueprint-vision-ocr, u-xray-page-classify-numctx-fix, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PAGE-CLASSIFY-NUMCTX-FIX (slot:xray): fix silent empty-response (num_ctx 4096 too small -> 8192)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PAGE-CLASSIFY-NUMCTX-FIX (slot:xray): fix silent empty-response (num_ctx 4096 too small -> 8192)

R12 silent failure: page-classify returned EMPTY responses (done_reason=undefined,
len 0) on every page -> every page silently fell through to extract = the gate
provided ZERO skip value. Root cause: the real 1320-char classifier prompt plus a
150dpi page image's vision tokens OVERFLOW num_ctx 4096, leaving no room for
generation. Measured live 2026-06-16: ctx 4096 = empty; ctx 8192 = valid JSON
(done_reason=stop). Fix = bump default num_ctx 4096 -> 8192 in
buildClassifierRequestBody.

Post-fix measurement (4-PDF sample, qwen3-vl:8b-instruct): single-page real
drawings -> EXTRACT (0% skip, correctly kept); multi-page scanned bundles ->
40-67% skip (table/bom/blank pages skipped at conf 0.95-0.98, drawing pages
kept). No false skips. 29/29 tests.
```

## Files touched (3)
- scripts/lib/page-classifier-lib.mjs      | 7 ++++++-
- scripts/lib/page-classifier-lib.test.mjs | 4 ++--
- 2 files changed, 8 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e3fababc9069`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._