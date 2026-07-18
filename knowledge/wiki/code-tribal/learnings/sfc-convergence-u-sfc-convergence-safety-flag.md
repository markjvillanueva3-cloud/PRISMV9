# SFC-CONVERGENCE/U-SFC-CONVERGENCE-SAFETY-FLAG — [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-CONVERGENCE-SAFETY-FLAG (slot:oscar): auto-surface safety-critical cases in the convergence diff report

**Commit:** `ffada3966124` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T14:26:46-05:00
**Tags:** sfc-convergence, u-sfc-convergence-safety-flag, auto-distilled

## Subject
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-CONVERGENCE-SAFETY-FLAG (slot:oscar): auto-surface safety-critical cases in the convergence diff report

## Body
```
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-CONVERGENCE-SAFETY-FLAG (slot:oscar): auto-surface safety-critical cases in the convergence diff report

The convergence-diff report tabulated the numbers but buried the safety signal. Added a
tested pure classifyCaseSafety(prodM, targetM, lifeFloorMin=15) that reads each case's
tool life and flags the safety-material cases so the operator cannot miss them:
  - production-overspeed-engine-safer: production life < floor AND engine life >2x longer
    -> the convergence FIXES a hazard (production runs hot).
  - convergence-introduces-short-life: engine life < floor AND shorter than production
    -> the convergence runs HOTTER here -> REVIEW before approving.

Live report now flags (state/shared/SFC-CONVERGENCE-DIFF.md):
  [!] OVER-SPEED FIX x2 -- Steel P finish (prod 280 m/min / 2min life -> engine 170 / 69min)
                       -- Hardened HB500 finish (prod 226 / 6min -> engine 42.8 / 185min)
  [!] REVIEW x1        -- Cast iron K rough (prod 94 / 50min -> engine 170 / 5min): the engine
                          is aggressive on cast iron; converging would run it hot. Operator review.

So the convergence is NOT universally safe -- it fixes 2 production over-speed hazards but
introduces 1 (cast iron rough). The report makes this explicit per-case for the gated sign-off.
+6 classifier tests (over-speed-fix, hotter-engine, ok, sub-2x-not-a-fix, unknown, custom floor);
14/14 total. Pure helper -- no production change.
```

## Files touched (4)
- mcp-server/scripts/sfc-convergence-diff.mjs      | 49 +++++++++++++++++++++++++++++++++++++++++++++----
- mcp-server/scripts/sfc-convergence-diff.test.mjs | 30 +++++++++++++++++++++++++++++-
- state/shared/SFC-CONVERGENCE-DIFF.md             | 37 ++++++++++++++++++++++++++++++-------
- 3 files changed, 104 insertions(+), 12 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ffada3966124`
- Milestone envelope: `mcp-server/data/milestones/SFC-CONVERGENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._