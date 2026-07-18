# BLUEPRINT-VISION-OCR/U-XRAY-MILL-PROGRAM-GT — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-MILL-PROGRAM-GT (slot:xray): mill ground-truth -- broaden the OCR closed-loop measurement from lathe-only to mill parts

**Commit:** `d197fa6cd5c5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T08:15:30-05:00
**Tags:** blueprint-vision-ocr, u-xray-mill-program-gt, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-MILL-PROGRAM-GT (slot:xray): mill ground-truth -- broaden the OCR closed-loop measurement from lathe-only to mill parts

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-MILL-PROGRAM-GT (slot:xray): mill ground-truth -- broaden the OCR closed-loop measurement from lathe-only to mill parts

The print<->CAD<->program triangulation that measures TRUE OCR recall was LATHE-ONLY
(validate-perfect-parts skipped every mill program as program-non-lathe, X/Y being
positions not diameters). The whole MILL share of the perfect-parts corpus was invisible
to the closed loop -- the operator's "utilizing our prints and models and programs"
ground truth was blind to mill.

Adds extractMillProgramGT + pure helpers (fractionToDecimal, extractDiameterToken,
parseToolComment, extractMillHoleDiameters, extractMillBoreDiameters). Mill callout GT =
HOLE diameters from tool comments (.250 DRILL / 1/2 REAM / .531 C'BORE), decimal+fraction
-- tap-drill, end-mill/ball/face/chamfer cutter, and bare-SPOT spot drills EXCLUDED (R12,
not print callouts) -- plus BORE diameters from FULL-CIRCLE G2/G3 arcs (2*sqrt(I^2+J^2),
bounded). Same return shape as extractProgramGT so scorePartAgainstProgram + the runner
are unchanged; gtReliable=false when empty so the runner SKIPS (no fake recall=0).
validate-perfect-parts routes axis=mill to mill GT + surfaces program-mill-no-gt.

VALIDATED on live JM data: ALL STAR.NC -> dia .160 drill GT; TAPTITE electrode mills ->
honestly reliable=false. LATHE path byte-unchanged. Per-file 2-arm scrutiny caught+fixed
2 P1s (thread regex vs mixed-fraction drill 1-15/32; unbounded bore I999999) + 1 P2
(diameter-vs-depth). 29/29 tests, real reference values.
```

## Files touched (4)
- scripts/lib/cnc-program-gt-lib.mjs      | 544 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/cnc-program-gt-lib.test.mjs | 426 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/validate-perfect-parts.mjs      |  30 ++++-
- 3 files changed, 994 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- tilizing our prints and models and programs"

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d197fa6cd5c5`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._