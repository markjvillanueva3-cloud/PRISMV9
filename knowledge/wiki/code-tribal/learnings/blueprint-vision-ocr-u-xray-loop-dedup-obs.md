# BLUEPRINT-VISION-OCR/U-XRAY-LOOP-DEDUP-OBS — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-LOOP-DEDUP-OBS (slot:xray): split skippedDone into worklist-dup vs cursor-done + surface TRUE corpus denominator

**Commit:** `a2c58ef3667d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T17:29:06-05:00
**Tags:** blueprint-vision-ocr, u-xray-loop-dedup-obs, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-LOOP-DEDUP-OBS (slot:xray): split skippedDone into worklist-dup vs cursor-done + surface TRUE corpus denominator

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-LOOP-DEDUP-OBS (slot:xray): split skippedDone into worklist-dup vs cursor-done + surface TRUE corpus denominator

Shared-tree assets: nightly PRISM OCR Training Loop cron is hardcoded to
H:\prism\scripts\blueprint-ocr-training-loop.mjs; these files exist only on
cad-fusion-live-ms0 (absent on slot/xray) -> [MAIN-FORCE] per slot-commit-enforce.

partitionByResumeCursor returns skippedWorklistDup (re-filed-scan basename dups,
correct dedup) + skippedCursorDone (genuine prior-run progress) + distinctTotal
(TRUE denominator = 7142 distinct prints, NOT 7418 worklist lines). skippedDone
kept as back-compat SUM. Loop log/report surface the split + corpus_percent_complete
(0.77% live). Observability-only; OCR/VLM path byte-untouched. 21/21 tests (2 new);
live invariants pass. 2-reviewer scrutiny PASS/PASS; arm-A P2 fixed inline.
```

## Files touched (4)
- scripts/blueprint-ocr-training-loop.mjs    | 12 +++++++++---
- scripts/lib/ocr-training-loop-lib.mjs      | 26 +++++++++++++++++++++-----
- scripts/lib/ocr-training-loop-lib.test.mjs | 22 ++++++++++++++++++++++
- 3 files changed, 52 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a2c58ef3667d`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._