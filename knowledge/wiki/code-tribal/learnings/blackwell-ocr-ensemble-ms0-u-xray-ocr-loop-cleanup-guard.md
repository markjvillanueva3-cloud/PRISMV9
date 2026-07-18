# BLACKWELL-OCR-ENSEMBLE-MS0/U-XRAY-OCR-LOOP-CLEANUP-GUARD — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-OCR-LOOP-CLEANUP-GUARD (slot:xray): try/finally guarantees temp-PNG cleanup on parser throw

**Commit:** `260ffcd7e035` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T13:16:23-05:00
**Tags:** blackwell-ocr-ensemble-ms0, u-xray-ocr-loop-cleanup-guard, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-OCR-LOOP-CLEANUP-GUARD (slot:xray): try/finally guarantees temp-PNG cleanup on parser throw

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-OCR-LOOP-CLEANUP-GUARD (slot:xray): try/finally guarantees temp-PNG cleanup on parser throw

Scrutiny-C P2: the per-print page loop calls buildTrainsetRow/classifyActiveLearning which parse VLM output (a bug history: leading-dot/truncation/leading-+). A throw there skipped rast.cleanup() -> leaked up to 12 page PNGs in the OS temp dir (bounded, janitor-reclaimable, but avoidable). Wrap the page loop in try/finally so cleanup always fires. Syntax OK, 19/19 lib tests green; resume/durability ordering unchanged.
```

## Files touched (2)
- scripts/blueprint-ocr-training-loop.mjs | 49 +++++++++++++++++++++++++++----------------------
- 1 file changed, 27 insertions(+), 22 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 260ffcd7e035`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-OCR-ENSEMBLE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._