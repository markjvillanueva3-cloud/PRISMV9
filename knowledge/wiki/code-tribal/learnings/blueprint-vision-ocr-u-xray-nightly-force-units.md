# BLUEPRINT-VISION-OCR/U-XRAY-NIGHTLY-FORCE-UNITS — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-NIGHTLY-FORCE-UNITS (slot:xray): the continuous corpus-training cron now passes --force-units in (adopts the multi-page units fix)

**Commit:** `661f3db76d7e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T13:15:09-05:00
**Tags:** blueprint-vision-ocr, u-xray-nightly-force-units, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-NIGHTLY-FORCE-UNITS (slot:xray): the continuous corpus-training cron now passes --force-units in (adopts the multi-page units fix)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-NIGHTLY-FORCE-UNITS (slot:xray): the continuous corpus-training cron now passes --force-units in (adopts the multi-page units fix)

The `PRISM OCR Training Loop` scheduled task (run-ocr-training-loop-overnight.ps1) grinds the full ~7,419
JM drawing corpus continuously but did NOT pass --force-units, so every multi-page print (96% of the corpus)
kept emitting WRONG-SCALE weak labels on pages 2+ (which lose the title block -> the VLM guesses the unit).
Adding `--force-units in` (the flag shipped in U-XRAY-TRAINLOOP-FORCE-UNITS) makes the ongoing corpus
training force the known JM-INCH global unit on every page, so the trainset stops accumulating wrong-unit
labels -- durable, picked up on the task's next run/resume.

JM Die convention is INCH (units-first doctrine) and this worklist is JM drawings, so `in` is correct for
the corpus. CAVEAT documented inline (R12): a rare metric print would be forced to inch on all pages; the
trainset is weak-labels (calibration + AL-queue absorb outliers), so the net is strongly positive on this
inch-dominant corpus. The principled units-first follow-up (detect page-1 units, propagate to pages 2+ per
PRINT -- handles inch AND metric) is noted in the runner comment; drop the two args to revert.

PS parse OK. No code/test change (a documented, revertible runner-config flag). The foreground GPU batch was
stopped (R14) -- corpus training belongs to this cron, which runs when the GPU is free.
```

## Files touched (2)
- scripts/run-ocr-training-loop-overnight.ps1 | 10 ++++++++++
- 1 file changed, 10 insertions(+)

## Lessons surfaced in commit body
- WRONG-SCALE weak labels on pages 2+ (which lose the title block -> the VLM guesses the unit).
- wrong-unit

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 661f3db76d7e`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._