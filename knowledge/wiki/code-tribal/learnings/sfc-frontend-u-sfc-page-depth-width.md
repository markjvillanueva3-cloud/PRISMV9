# SFC-FRONTEND/U-SFC-PAGE-DEPTH-WIDTH — [MAIN-FORCE] [SFC-FRONTEND]/U-SFC-PAGE-DEPTH-WIDTH (slot:oscar): honor the SFC page's depth/width field names -- they were silently dropped (engine used toolDiam*0.5)

**Commit:** `e29b4ddd66c0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T20:51:14-05:00
**Tags:** sfc-frontend, u-sfc-page-depth-width, auto-distilled

## Subject
[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-PAGE-DEPTH-WIDTH (slot:oscar): honor the SFC page's depth/width field names -- they were silently dropped (engine used toolDiam*0.5)

## Body
```
[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-PAGE-DEPTH-WIDTH (slot:oscar): honor the SFC page's depth/width field names -- they were silently dropped (engine used toolDiam*0.5)

ACCURACY BUG (TDD-proven, found while wiring U-SFC-PAGE-MACHINE-LIMITS): SfcCalculatorPage posts
cut geometry as `depth`/`width` (SfcParams names), but ProductEngine.sfcCalculate read ONLY
`depth_of_cut`/`width_of_cut` with no mapping in the prism_product chain -> the customer's
depth/width were SILENTLY IGNORED (engine used toolDiam*0.5), so every page force/MRR/power/
tool-life/safety number was at the WRONG depth. Proven: depth:8 returned depth_of_cut_mm=6, not 8.

Fix: SFCInput declares `depth?`/`width?` aliases; all 4 SFCInput sfc functions read
`depth_of_cut ?? depth ?? toolDiam*0.5` (canonical wins). TDD red->green; tsc clean; 37/37 (no
regression); 2-arm scrutiny PASS (consumer-collision traced + cleared -- ACNC depth is a separate
acnc_* path; cross-galaxy consumers pass nested dimensions).
```

## Files touched (3)
- mcp-server/src/__tests__/sfc-page-depth-width-honored.test.ts | 44 ++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/ProductEngine.ts                       | 24 ++++++++++++++++--------
- 2 files changed, 60 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- WRONG depth. Proven: depth:8 returned depth_of_cut_mm=6, not 8.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e29b4ddd66c0`
- Milestone envelope: `mcp-server/data/milestones/SFC-FRONTEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._