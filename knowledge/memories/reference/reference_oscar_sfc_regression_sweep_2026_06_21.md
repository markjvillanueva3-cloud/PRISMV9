---
name: reference_oscar_sfc_regression_sweep_2026_06_21
description: "SFC regression sweep after oscar's 4 UI+engine units (2026-06-21): all oscar changes are regression-clean; the speed-feed-orchestrator-dedicated cam-strategy + cache reds are PRE-EXISTING (romeo stash-verified + oscar grep-verified), NOT caused by the turning/boring/UI work. Don't re-investigate whether they're oscar's."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.711Z
aliases: reference_oscar_sfc_regression_sweep_2026_06_21
---


**SFC regression sweep result (slot:oscar, 2026-06-21).** Ran after shipping 4 units this session (U-SFC-UI-UNCERTAINTY+P2, U-SFC-MILL-MCX-SKIP, U-SFC-ORCH-BORE-DIAMETER, U-SFC-UI-CV-RENDER).

## oscar's 4 units are REGRESSION-CLEAN (proven 3 ways, R12)
1. `git show 679a27226 e346512bac 3c26c7ae04 -- SpeedFeedOrchestratorEngine.ts | grep cam_strateg|cache` -> only a COMMENT hit; my diffs touch ONLY rpmDiameter (3 sites) + the bore_diameter_mm field. Zero cam-strategy / cache code.
2. All new oscar tests pass: turning 5/5, boring 5/5, mill mcx-skip 4/4, deriveAdvisory 14/14, UncertaintyAdvisoryBanner 5/5, formatCvBreakdown 5/5.
3. The WEB SFC suite is 41/41 (deriveAdvisory + banner + formatCv + sfc-api + useOrchestrator).

## The mcp-server suite reds are PRE-EXISTING (NOT oscar, NOT romeo)
- `speed-feed-orchestrator-dedicated.test.ts`: 4 fail -- (1) cache "does not reuse a higher-RPM cached result for a lower-RPM machine"; (2-4) cam-strategy fidelity: `resolved_cam_strategy.cam_system` collapses 'mastercam'->'conventional', 'prism'->'generic', 'fusion swarf'->'conventional'. **romeo's commit 3131f8ccae note: "4 pre-existing failures ... cache/CAM-strategy fidelity ... NOT from this change -- stash-verified they fail without it."** A REAL open bug in the cam-strategy resolver, pre-existing.
- Broader baseline reds (unrelated engines, not SFC physics): MillingAILearningOrchestrator (MultiAxisAggregator), MillMasterOrchestratorFacade (mill_turn/multi_axis routing), QuoteToShipOrchestrator (27-stage), speed-feed-advanced-ai (confidence), speed-feed-autopilot-wire + SpeedFeedAutopilotEngine (material resolution), ultimate-speed-feed (getMaterialProfile), WireEDMAGIOrchestrator. These are the session-baseline reds (task #1 "triage red").

## Action
Filed as a FIX candidate (cam-strategy resolver fidelity). Do NOT re-litigate whether oscar's turning/boring/UI work caused these -- it did not.

## RESOLVED 2026-06-22 (same session, #22 fully closed -> dedicated 12/12)
All 4 dedicated reds fixed (2 commits, 3-of-3 PASS, findings:none):
- **cam-strategy fidelity trio** (fd8df11f81, U-SFC-CAM-STRATEGY-FIDELITY): TWO root causes in `resolveCAMStrategy` -- (1) `normalizeCAMSystem` had no `prism` entry -> "PRISM" resolved to "generic"; added `prism:"prism"`. (2) the resolver set `stratName` to the matched DB key / "conventional", DISCARDING the operator's strategy label -> "Surface Finish Parallel"/"Swarf" (absent from `CAM_STRATEGY_DB`) collapsed to "conventional". Fix: preserve `input.cam_strategy.trim().toLowerCase()` as `stratName` while the PHYSICS record (`stratRec`: ae_pct/speed_multiplier/feed_multiplier/is_adaptive) still comes from the best-match. **LABEL-ONLY** -- `strategy_name` (line 1827) has ZERO physics/control-flow consumers (only a frontend display label at `calculatorSpeedFeedContract.ts:1121`). MILL-HARD-MS1 baseline PROVEN unchanged (97 fail/1925 pass reverted == with-fix) -> 0 regressions (its strategy_name assertions use `.toContain`, not `toBe`).
- **cache test** (b359d166a5, U-SFC-CACHE-API): failed with `TypeError: clearCache is not a function` -- an aspirational test for an API the engine never had. The engine is PROVABLY STATELESS (zero instance fields; `compute()` pure), so the "no stale higher-rpm reuse" invariant holds by construction. Added a documented no-op `clearCache()` (honest, not a facade); the test's REAL rpm-clamp assertions (turning rpm clamps to machine_max_rpm) then run + pass.
LESSON: a "pre-existing red, not mine" is still worth root-causing -- this one was a clean in-domain fix, not the multi-session lift I first estimated. The cam-strategy resolver discarding the user's label was a real fidelity bug (CAD/CAM-aware S/F lost which strategy the operator chose).
