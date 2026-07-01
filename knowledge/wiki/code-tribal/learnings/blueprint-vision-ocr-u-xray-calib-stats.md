# BLUEPRINT-VISION-OCR/U-XRAY-CALIB-STATS — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-CALIB-STATS (slot:xray): observability CLI for the accumulated calibration corpus (the VALIDATE leg of Units A+B)

**Commit:** `198d811ef4dc` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T09:04:35-05:00
**Tags:** blueprint-vision-ocr, u-xray-calib-stats, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-CALIB-STATS (slot:xray): observability CLI for the accumulated calibration corpus (the VALIDATE leg of Units A+B)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-CALIB-STATS (slot:xray): observability CLI for the accumulated calibration corpus (the VALIDATE leg of Units A+B)

Units A+B (U-XRAY-CALIB-ACCUMULATE / U-XRAY-PROGRAM-GT-CALIB) grow a durable calibration-
sample store across nightly runs, but the corpus was invisible until a full run printed its
report. This makes it checkable on demand so an operator can SEE the closed-loop calibration
accruing toward trustworthy tiers.

- New pure `summarizeCalibrationStore(samples)` (calibration-sample-store.mjs): total + correct
  rate + per-source breakdown (synthetic-gt vs program-gt vs unknown), invalid rows filtered.
- New `scripts/calibration-store-stats.mjs` CLI: reads (never writes) the store, pairs the
  summary with calibrateAgreement for the reliability verdict + samples-to-reliable, --json or
  human output. Thin reuse of the already-scrutinized store lib + the isotonic calibrator.

TEST: 19/19 (calibration-sample-store.test.mjs, +2 summarize tests). LIVE smoke: a seeded
40 synthetic-gt + 20 program-gt store ->
  "calibration corpus: 60 samples -- RELIABLE, by source {synthetic-gt:40,program-gt:20}, correctRate 0.6833"
exactly the operator-facing observability intended. Proportionate single-pass (trivial pure
counter + thin CLI over 2-arm-passed primitives); end-of-session 3-of-3 is the backstop.
```

## Files touched (4)
- scripts/calibration-store-stats.mjs           | 55 +++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/calibration-sample-store.mjs      | 26 ++++++++++++++++++++++++++
- scripts/lib/calibration-sample-store.test.mjs | 28 ++++++++++++++++++++++++++++
- 3 files changed, 109 insertions(+)

## Lessons surfaced in commit body
- til a full run printed its

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 198d811ef4dc`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._