# SFC-BACKEND/U-OSC9-SPEEDFEED-MATERIAL-AWARE — [MAIN-FORCE] [SFC-BACKEND]/U-OSC9-SPEEDFEED-MATERIAL-AWARE (slot:oscar): fix material-blind prism_calc:speed_feed -- delegate to UltimateSpeedFeedEngine

**Commit:** `986b36a2b16d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T21:01:52-05:00
**Tags:** sfc-backend, u-osc9-speedfeed-material-aware, auto-distilled

## Subject
[MAIN-FORCE] [SFC-BACKEND]/U-OSC9-SPEEDFEED-MATERIAL-AWARE (slot:oscar): fix material-blind prism_calc:speed_feed -- delegate to UltimateSpeedFeedEngine

## Body
```
[MAIN-FORCE] [SFC-BACKEND]/U-OSC9-SPEEDFEED-MATERIAL-AWARE (slot:oscar): fix material-blind prism_calc:speed_feed -- delegate to UltimateSpeedFeedEngine

BUG (diagnosed reference_oscar_speedfeed_material_blind_diagnosis_2026_06_01, task #52, verified still open): the calc dispatcher 'speed_feed' action called calculateSpeedFeed, which keys Vc off TOOL material + hardness ONLY and never reads the workpiece -- it returned the SAME cutting speed for steel, aluminum and titanium. Safety-relevant: Al(N) should run ~2.6x steel(P) Vc, Ti(S) ~0.33x; an Al speed on Ti burns the tool. The UltimateSpeedFeedEngine was made material-aware on 2026-06-02 but the dispatcher ACTION was never wired to it -- this connects them.

FIX: the speed_feed case delegates to ultimateSpeedFeedEngine.calculate() (material alias->ISO/hardness table) and remaps the OptimizedValue result back to the {cutting_speed,spindle_speed,feed_per_tooth,feed_rate,axial_depth,radial_depth} contract the compact map reads (spindle_rpm->spindle_speed rename verified). Finite-guards the whole Vc/rpm/fz/vf quartet -> fail-LOUD fallback to the legacy util with a material-BLIND warning on any engine error (R12). The legacy util is left untouched (12 callers; route-contract-sfc-speedfeed.test.ts tests it directly and stays green 25/25 -- no physics fragmentation).

VERIFIED: new sfc-speed-feed-material-aware.test.ts 5/5 (Al/steel=2.28x, Ti/steel=0.29x per canonical CUTTING_PARAMS; finite remap fields; name-only ISO resolution; util-blind regression anchor) + contract 25/25; physics-reviewer PASS + independent reviewer PASS (2-arm per-file gate). My files type-clean; the 19 tsc errors are PRE-EXISTING in unrelated CAD/CAM peer files (cad-validation-corpus / PowerMillAIOrchestration / ReinforcementLearningCAMFeedback), not this change. Only direct action consumer routes/milling.ts:/speed-feed is additive-safe.
```

## Files touched (3)
- mcp-server/src/__tests__/sfc-speed-feed-material-aware.test.ts | 79 ++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/calcDispatcher.ts             | 76 ++++++++++++++++++++++++++++++++++++++++++------
- 2 files changed, 146 insertions(+), 9 deletions(-)

## Lessons surfaced in commit body
- till open): the calc dispatcher 'speed_feed' action called calculateSpeedFeed, which keys Vc off TOOL material + hardness ONLY and never reads the workpiece -- it returned the SAME cutting speed for steel, aluminum and titanium. Safety-relevant: Al(N) should run ~2.6x steel(P) Vc, Ti(S) ~0.33x; an Al speed on Ti burns the tool. The UltimateSpeedFeedEngine was made material-aware on 2026-06-02 but the
- til with a material-BLIND warning on any engine error (R12). The legacy util is left untouched (12 callers; route-contract-sfc-speedfeed.test.ts tests it directly and stays green 25/25 -- no physics fragmentation).
- til-blind regression anchor) + contract 25/25; physics-reviewer PASS + independent reviewer PASS (2-arm per-file gate). My files type-clean; the 19 tsc errors are PRE-EXISTING in unrelated CAD/CAM peer files (cad-validation-corpus / PowerMillAIOrchestration / ReinforcementLearningCAMFeedback), not this change. Only direct action consumer routes/milling.ts:/speed-feed is additive-safe.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 986b36a2b16d`
- Milestone envelope: `mcp-server/data/milestones/SFC-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._