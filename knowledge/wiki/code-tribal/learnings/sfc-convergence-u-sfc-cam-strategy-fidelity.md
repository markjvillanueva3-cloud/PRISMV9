# SFC-CONVERGENCE/U-SFC-CAM-STRATEGY-FIDELITY — [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-CAM-STRATEGY-FIDELITY (slot:oscar): preserve operator CAM strategy label + recognize PRISM cam_system

**Commit:** `fd8df11f8150` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T21:17:49-05:00
**Tags:** sfc-convergence, u-sfc-cam-strategy-fidelity, auto-distilled

## Subject
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-CAM-STRATEGY-FIDELITY (slot:oscar): preserve operator CAM strategy label + recognize PRISM cam_system

## Body
```
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-CAM-STRATEGY-FIDELITY (slot:oscar): preserve operator CAM strategy label + recognize PRISM cam_system

Fixes 3 of the 4 pre-existing reds in speed-feed-orchestrator-dedicated.test.ts
(the cam-strategy fidelity trio). Two root causes in resolveCAMStrategy:

1. normalizeCAMSystem had no "prism" entry -> cam_system="PRISM" resolved to
   "generic". Added prism->prism (the strategy lookup still falls to generic via
   CAM_STRATEGY_DB["prism"] ?? generic; only the reported cam_system label changes).
2. The resolver discarded the operator's strategy name -- it set stratName to the
   matched DB key, or "conventional" on no match -- so "Surface Finish Parallel"
   / "Swarf" (absent from the DB) silently collapsed to "conventional", and
   "FeatureFlow Adaptive Roughing" became "adaptive". Now the operator's label is
   preserved (lowercased, spacing intact) while the PHYSICS record (ae_pct /
   speed_multiplier / feed_multiplier / is_adaptive) still comes from the
   best-matching record. LABEL-ONLY change -- no physics/number change.

Verified: speed-feed-orchestrator-dedicated 11/12 (was 8/12; the 3 cam-strategy
tests now green, only the separate cache test remains). MILL-HARD-MS1 baseline
PROVEN unchanged at 97 fail/1925 pass (reverted-and-reran) -- zero regressions
(strategy_name assertions there use toContain + physics; label-only is safe).
tsc clean.
```

## Files touched (2)
- mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts | 13 +++++++++++++
- 1 file changed, 13 insertions(+)

## Lessons surfaced in commit body
- till falls to generic via
- till comes from the

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fd8df11f8150`
- Milestone envelope: `mcp-server/data/milestones/SFC-CONVERGENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._