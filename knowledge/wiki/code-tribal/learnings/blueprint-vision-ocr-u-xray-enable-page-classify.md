# BLUEPRINT-VISION-OCR/U-XRAY-ENABLE-PAGE-CLASSIFY — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-ENABLE-PAGE-CLASSIFY (slot:xray): enable --page-classify on the nightly OCR run (operator 'enable and continue')

**Commit:** `b1bc1c58a71f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T12:05:53-05:00
**Tags:** blueprint-vision-ocr, u-xray-enable-page-classify, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-ENABLE-PAGE-CLASSIFY (slot:xray): enable --page-classify on the nightly OCR run (operator 'enable and continue')

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-ENABLE-PAGE-CLASSIFY (slot:xray): enable --page-classify on the nightly OCR run (operator 'enable and continue')

The JM corpus is heavy with scanned office paperwork ('Scanned Document - <date>.pdf')
that yields 0 trainable dims -- the 2-model ensemble was burning VLM time on non-drawings
(168 prints processed -> only 125 trainset records overnight). The pre-VLM page classifier
(num_ctx bug already fixed) skips CONFIDENT non-drawings before the ensemble.

Data-loss-safe by design: skips ONLY a confident not-a-drawing (0.70 conf floor); any
uncertain page still runs the full ensemble; a print is cursored 'skipped-all-paperwork'
only when EVERY page is confident paperwork (re-runnable without the flag if too aggressive).

Activates on the next scheduled fire (02:00); the current in-flight 5h window finishes
uninterrupted (avoids wasting its recalibration). Verify next run via the report's
this_run_pages_skipped_paperwork > 0 and 'page-classify SKIP' log lines.
```

## Files touched (2)
- scripts/run-ocr-training-loop-overnight.ps1 | 7 +++++++
- 1 file changed, 7 insertions(+)

## Lessons surfaced in commit body
- till runs the full ensemble; a print is cursored 'skipped-all-paperwork'

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b1bc1c58a71f`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._