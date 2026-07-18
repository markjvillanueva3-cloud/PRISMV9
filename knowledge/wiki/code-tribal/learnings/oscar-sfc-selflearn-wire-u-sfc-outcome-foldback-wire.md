# OSCAR-SFC-SELFLEARN-WIRE/U-SFC-OUTCOME-FOLDBACK-WIRE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-SELFLEARN-WIRE]/U-SFC-OUTCOME-FOLDBACK-WIRE (slot:bravo): close the SFC self-learning fold-back loop -- wire SpeedFeedOutcomeFeedbackBridgeEngine (0 dispatchers) into calcDispatcher

**Commit:** `e436c2fc3f91` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T14:16:17-05:00
**Tags:** oscar-sfc-selflearn-wire, u-sfc-outcome-foldback-wire, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-SELFLEARN-WIRE]/U-SFC-OUTCOME-FOLDBACK-WIRE (slot:bravo): close the SFC self-learning fold-back loop -- wire SpeedFeedOutcomeFeedbackBridgeEngine (0 dispatchers) into calcDispatcher

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-SELFLEARN-WIRE]/U-SFC-OUTCOME-FOLDBACK-WIRE (slot:bravo): close the SFC self-learning fold-back loop -- wire SpeedFeedOutcomeFeedbackBridgeEngine (0 dispatchers) into calcDispatcher

Cross-galaxy build into oscar/SFC (operator directive: "accelerate self-learning,
self-improving system for sfc domain"). bravo galaxy_access:all-galaxies.

THE GAP (R8 finished-but-unwired): SpeedFeedOutcomeFeedbackBridgeEngine is the SFC
AI-ladder ring buffer. SpeedFeedNineAxisOrchestratorEngine pushes PREDICTIONS into it
via capture() (line 679), but recordActuals() (shop-floor actuals -> calibration
fold-back), stats(), and recentForKey() had ZERO dispatcher surface -> the calibration
loop was OPEN: predictions went in, actuals could never come back. The other 3 SFC
learning engines were dispatcher-wired; this one was not.

DEDUP-VERIFIED distinct from the persistent loops: india's U-SFC-LOOP-FEED (canonical
outcome bus -> LoRA) + romeo's shop_outcome_ingest are the heavy persistent pipeline;
THIS is the in-process AI-ladder ring buffer (its own comment: "the bus capture happens
upstream; this bridge is the AI-ladder-facing ring buffer"). The only other dispatcher
recordActuals is businessDispatcher's quoteAnalytics -- a different engine. Confirmed
0 prior dispatcher refs to this engine.

WIRE (calcDispatcher, cloning the speedfeed_dl_stats dynamic-import-in-case pattern):
  - speedfeed_outcome_record_actuals -> recordActuals(key, actuals). Key-validated (R12,
    no silent no-op) + guards content-free actuals (>=1 finite field required, else the
    calibration training-set would inflate with empty overrides -- reviewer P2).
  - speedfeed_outcome_stats -> stats() + actualsCount() (calibration-set introspection).
  - speedfeed_outcome_recent -> recentForKey(key, limit<=64) (recent records for the ladder).
R12-safe: exposes ring-buffer DATA + fold-back only, NEVER NN inference (the SFC NNs are
untrained until LoRA training ships -- same invariant the sibling speedfeed_*_stats wires honor).

TEST: 9/9 round-trip through the REAL dispatcher (registerCalcDispatcher mock-server harness).
Seeds via the engine's own capture() so fold-back is genuine. Covers: empty stats, folded:true,
folded:false (no-match), missing-key R12 error, recent-with-override, unique_keys introspection,
no cross-key leakage, machine_name->default_3axis_vmc capture/fold-key boundary, empty-actuals reject.
tsc: my files type-clean (the calcDispatcher:8219 error is a PRE-EXISTING omega_safety cast, not mine;
repo has pre-existing red in cad-validation-corpus + 3 algorithm files -- other lanes).
2-agent scrutiny: both PASS, no P0/P1; the 2 material P2s (empty-actuals + fallback boundary) fixed pre-commit.

NOTE for oscar: SpeedFeedOutcomeFeedbackBridgeEngine.tryBusCapture() is an unconditional
return true -> stats().bus_capture_success_rate_pct is hardwired 100% (pre-existing, your lane).
```

## Files touched (3)
- mcp-server/src/__tests__/calcDispatcher.speedfeed-outcome-wire.test.ts | 140 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/calcDispatcher.ts                     |  51 ++++++++++++++++++++++
- 2 files changed, 191 insertions(+)

## Lessons surfaced in commit body
- til LoRA training ships -- same invariant the sibling speedfeed_*_stats wires honor).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e436c2fc3f91`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-SELFLEARN-WIRE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._