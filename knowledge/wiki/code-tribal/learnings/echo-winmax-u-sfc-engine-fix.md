# ECHO-WINMAX/U-SFC-ENGINE-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-SFC-ENGINE-FIX: fix SFC diameter plumbing so the closed loop optimizes against real physics

**Commit:** `4abd8d9156a5` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T14:11:40-05:00
**Tags:** echo-winmax, u-sfc-engine-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-SFC-ENGINE-FIX: fix SFC diameter plumbing so the closed loop optimizes against real physics

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-SFC-ENGINE-FIX: fix SFC diameter plumbing so the closed loop optimizes against real physics

ROOT CAUSE (not an engine bug): UltimateSpeedFeedEngine reads `tool_diameter_mm`, but the
calcDispatcher param normalizer only mapped `diameter`/`toolDiameter` -> `tool_diameter`, never
to `tool_diameter_mm`. So the diameter never reached the engine and it defaulted to a 12mm tool
(every diameter returned the same rpm — the "diameter-blind" symptom).

FIX: one additive normalization line — `tool_diameter` -> `tool_diameter_mm` (engine is mm-native).
Now ultimate_speed_feed is FULLY correct for ALL callers (post, CAM, academy): material-aware Vc
(steel 140 / Al 365 / Ti 46 m/min) AND diameter-correct, machine-rpm-clamped spindle_rpm. Verified
live on :3100 after rebuild+restart: tool_diameter 50.8->877, 25.4->1754, 12.7->3509, 6.35->7018
(impliedDia matches input exactly).

post-nc-conformance.mjs::sfcRecompute now TRUSTS the engine's spindle_rpm (diameter-correct +
machine-clamped), keeping n=Vc·1000/(π·D) only as a fallback. Conformance --live unchanged
(877/3509/4679) — confirms the prior local-math workaround agreed with the now-correct engine.

This unblocks SFC-correct closed-loop learning: the post's drift (mills 71-242% too fast for
P-steel) is now measured against a fully-correct SFC. speed_feed (material-blind) + sf_orchestrate
(broken) remain oscar's deeper fixes, but ultimate_speed_feed is now the trustworthy source.
```

## Files touched (3)
- mcp-server/src/tools/dispatchers/calcDispatcher.ts | 21292 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---------------------------------------------------------------
- scripts/post-nc-conformance.mjs                    |    17 +-
- 2 files changed, 10658 insertions(+), 10651 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4abd8d9156a5`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._