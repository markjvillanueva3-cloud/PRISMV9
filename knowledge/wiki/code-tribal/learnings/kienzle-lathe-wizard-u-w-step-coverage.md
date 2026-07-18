# KIENZLE-LATHE-WIZARD/U-W-STEP-COVERAGE — [MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-STEP-COVERAGE (slot:whiskey): STEP corpus coverage run -- honest finding: STEP CAD is electrode/mold-dominated, turned bodies rare

**Commit:** `412bd3ecaba7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T11:11:47-05:00
**Tags:** kienzle-lathe-wizard, u-w-step-coverage, auto-distilled

## Subject
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-STEP-COVERAGE (slot:whiskey): STEP corpus coverage run -- honest finding: STEP CAD is electrode/mold-dominated, turned bodies rare

## Body
```
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-STEP-COVERAGE (slot:whiskey): STEP corpus coverage run -- honest finding: STEP CAD is electrode/mold-dominated, turned bodies rare

Ran the STEP closed-loop over 21 corpus files: 1 scored (AGRATI 9070219 OP2, SAFE,
both-in-band 100%), the rest correctly skipped as suspect-not-revolution (electrodes,
molds, toolholders, multi-body OP-setups). R12: the JM STEP corpus yields few turnable
bodies of revolution -- turned-part ground-truth lives in the 34,993 .MIN (Rung A), not
STEP CAD. The geometry leg is proven CLOSED; STEP-corpus turned-part yield is inherently low.
```

## Files touched (5)
- state/shared/dashboards/lathe-closed-loop-full.json |   4 +-
- state/shared/dashboards/lathe-closed-loop-full.md   |   2 +-
- state/shared/dashboards/lathe-rungc-step.json       | 128 ++++++++++++++++++++++++++++++++++++++++++++++++++++++--
- state/shared/dashboards/lathe-rungc-step.md         |   4 +-
- 4 files changed, 129 insertions(+), 9 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 412bd3ecaba7`
- Milestone envelope: `mcp-server/data/milestones/KIENZLE-LATHE-WIZARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._