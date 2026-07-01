# CAD-COMPLETION/U-CAD-SHEETMETAL-VALIDATE — [MAIN-FORCE] [CAD-COMPLETION]/U-CAD-SHEETMETAL-VALIDATE (slot:delta): scrutiny P2 -- guard flat_pattern thickness/radius/legs (no silent nonsense length)

**Commit:** `aadf1ad05918` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T04:57:55-05:00
**Tags:** cad-completion, u-cad-sheetmetal-validate, auto-distilled

## Subject
[MAIN-FORCE] [CAD-COMPLETION]/U-CAD-SHEETMETAL-VALIDATE (slot:delta): scrutiny P2 -- guard flat_pattern thickness/radius/legs (no silent nonsense length)

## Body
```
[MAIN-FORCE] [CAD-COMPLETION]/U-CAD-SHEETMETAL-VALIDATE (slot:delta): scrutiny P2 -- guard flat_pattern thickness/radius/legs (no silent nonsense length)

Both 2-arm reviewers independently flagged: the flat_pattern path didn't validate thickness_mm/
bend_radius_mm (a negative thickness -> finite-but-nonsense developed length, success:true, no warning)
and default-masked when legs were omitted (engine [50,30,50] defaults -> a length the caller never
described). Fix: require leg_lengths_mm (>=2 legs) + guard thickness_mm>0 / bend_radius_mm>=0 before
delegating (mirrors the bend_allowance guard). +3 regression tests (no-legs/1-leg/neg-thickness/neg-radius
all fail). Also strengthened the bend_allowance full-result assert to bend_deduction_mm reference value
3.717 (was a weak isFinite on the engine's hardcoded flat_length_mm placeholder -- arm B). 12/12; tsc-clean.
```

## Files touched (3)
- mcp-server/src/__tests__/CADSheetMetalEngine.test.ts | 17 ++++++++++++++---
- mcp-server/src/engines/CADSheetMetalEngine.ts        | 13 ++++++++++++-
- 2 files changed, 26 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show aadf1ad05918`
- Milestone envelope: `mcp-server/data/milestones/CAD-COMPLETION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._