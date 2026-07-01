# SFC-CONVERGENCE/U-SFC-TURNING-WIKI-FACTFIX — [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-TURNING-WIKI-FACTFIX (slot:oscar): R12 correct overstated severity -- fact-checker caught 3 citation/path errors

**Commit:** `21adb9624b47` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T14:46:39-05:00
**Tags:** sfc-convergence, u-sfc-turning-wiki-factfix, auto-distilled

## Subject
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-TURNING-WIKI-FACTFIX (slot:oscar): R12 correct overstated severity -- fact-checker caught 3 citation/path errors

## Body
```
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-TURNING-WIKI-FACTFIX (slot:oscar): R12 correct overstated severity -- fact-checker caught 3 citation/path errors

Ran the fact-checker on my session claims before the operator acts on them. It VERIFIED the
core bug (orchestrator turning rpm/Vc from tool.diameter_mm :2574/:2667; engine correct at
:2246-2248) but caught that I OVERSTATED the production severity as "confirmed live end-to-end":
- calcDispatcher:8651 (workpiece_diameter_mm) is the turning_force action, NOT sf_orchestrate
  (orchestrator is a raw params pass-through at :6795-6797).
- calculatorSpeedFeedContract.ts:781 DERIVES workpiece_diameter_mm from stock geometry, not
  directly from the SpeedFeedPage "Part dia mm" field -- two separate same-named paths.
So the bug is REAL + reproduced (live probe Vc 1.8 with workpiece_diameter set), but whether a
typical production UI turning request delivers a workpiece diameter to compute() is NOT traced --
that becomes step 1 of the fix. Corrected the wiki "Full path" -> "verified vs not". Honesty over
a tidy narrative.
```

## Files touched (2)
- knowledge/wiki/lessons/sfc-orchestrator-turning-tool-vs-workpiece-diameter.md | 22 ++++++++++++++--------
- 1 file changed, 14 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 21adb9624b47`
- Milestone envelope: `mcp-server/data/milestones/SFC-CONVERGENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._