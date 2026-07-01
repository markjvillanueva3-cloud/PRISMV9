# BLUEPRINT-VISION-OCR/U-XRAY-IMPROVE-BACKLOG — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-IMPROVE-BACKLOG (slot:xray): data-grounded blueprint-reading improvement backlog (deep research)

**Commit:** `8199b56166f7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T11:08:35-05:00
**Tags:** blueprint-vision-ocr, u-xray-improve-backlog, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-IMPROVE-BACKLOG (slot:xray): data-grounded blueprint-reading improvement backlog (deep research)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-IMPROVE-BACKLOG (slot:xray): data-grounded blueprint-reading improvement backlog (deep research)

Operator: "deep research on what else we can add to improve blueprint reading."
Synthesized from THIS session's live failure data (the 15.2% ensemble-failed leak
on scanned/dense prints), not generic. Prioritized P0-P2:
  P0: 3rd VLM (qwen3-vl:32b, A/B in flight) + --retry-failed; region tiling for
      dense pages; scan-quality preprocessing (deskew/denoise/binarize).
  P1: GD&T-aware structured FCF prompting; layout-aware region routing (fixes the
      page-classify over-skip); recall-first ensemble fusion (keep 1-of-N as AL).
  P2: print<->CAD<->program ground-truth triangulation; symbol normalizers;
      per-feature-type calibration; tribal injection.
Logical-order sequencing, each gated on measured recall lift. Complements (not
dup of) the 05-30 OCR-upgrade roadmap -- this is grounded in the new diagnosis.
```

## Files touched (2)
- .../blueprint-reading-improvement-backlog-2026-06-19.md          | 79 ++++++++++++++++++++++++++++++
- 1 file changed, 79 insertions(+)

## Lessons surfaced in commit body
- tiling for

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8199b56166f7`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._