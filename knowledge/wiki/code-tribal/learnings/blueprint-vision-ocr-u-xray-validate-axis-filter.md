# BLUEPRINT-VISION-OCR/U-XRAY-VALIDATE-AXIS-FILTER — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-VALIDATE-AXIS-FILTER (slot:xray): --axis mill|lathe|all filter to target the closed-loop recall measurement by program axis

**Commit:** `3a2316206ca1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T09:01:38-05:00
**Tags:** blueprint-vision-ocr, u-xray-validate-axis-filter, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-VALIDATE-AXIS-FILTER (slot:xray): --axis mill|lathe|all filter to target the closed-loop recall measurement by program axis

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-VALIDATE-AXIS-FILTER (slot:xray): --axis mill|lathe|all filter to target the closed-loop recall measurement by program axis

The mill parts (now scoreable after U-XRAY-MILL-PROGRAM-GT) sort AFTER the neutral-STEP parts, so a
bounded --limit run never reached them. New --axis <mill|lathe|all> (default all, back-compat) skips an
off-axis part BEFORE the expensive OCR, so a bounded run isolates the mill subset and measures the
mill-GT recall lift without OCRing every lathe part. Additive: agg.axis_filtered + a report skip field.
Enables `node scripts/validate-perfect-parts.mjs --axis mill --fresh` (now running to validate mill GT).
```

## Files touched (2)
- scripts/validate-perfect-parts.mjs | 10 +++++++---
- 1 file changed, 7 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3a2316206ca1`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._