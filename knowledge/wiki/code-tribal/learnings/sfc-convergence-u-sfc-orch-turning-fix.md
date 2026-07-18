# SFC-CONVERGENCE/U-SFC-ORCH-TURNING-FIX — [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ORCH-TURNING-FIX (slot:oscar): fix P0 LIVE turning bug -- orchestrator rpm/Vc now uses WORKPIECE diameter, not tool

**Commit:** `679a27226178` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T16:11:43-05:00
**Tags:** sfc-convergence, u-sfc-orch-turning-fix, auto-distilled

## Subject
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ORCH-TURNING-FIX (slot:oscar): fix P0 LIVE turning bug -- orchestrator rpm/Vc now uses WORKPIECE diameter, not tool

## Body
```
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ORCH-TURNING-FIX (slot:oscar): fix P0 LIVE turning bug -- orchestrator rpm/Vc now uses WORKPIECE diameter, not tool

The production SFC engine computed the turning rpm/Vc relationship from the TOOL diameter
(milling-centric core-physics step), collapsing turning Vc to ~1.8 m/min -- a P0 LIVE bug in
JM Die's primary domain (35K lathe programs). Traced end-to-end: the CalculatorPage lathe path
sends a correct workpiece_diameter (calculatorSpeedFeedContract.ts:781/904 -> api:219 -> compute),
which compute() then IGNORED. (reference_oscar_orchestrator_turning_broken_2026_06_21.)

FIX: introduce `rpmDiameter` = workpiece_diameter_mm for lathe ops (turning/boring/facing/grooving/
parting/threading) when > 0, else fall back to the tool diameter D (non-regression). Replaced D ->
rpmDiameter in all 6 in-compute() rpm/Vc conversion sites (rpm formula + maxRPM clamp recalc + 2
gear-clamp recalcs + safety-loop recompute + alternatives recompute). Milling/drilling UNCHANGED.

VALIDATED LIVE: steel-P OD turning (50mm workpiece) Vc 1.8 -> 54.2 m/min, rpm 345 self-consistent
(pi*50*345/1000=54.2); stainless 27.9; aluminum 303.7; milling steel 80.3 UNCHANGED. 5/5 R9
intent-encoding tests (Vc>10 not-garbage, rpm==1000*Vc/(pi*D_workpiece), inverse-diameter scaling,
missing-dia safe fallback, milling regression guard) -- the test the orchestrator was MISSING
(prior turning tests asserted only cache/clamp, never absolute Vc -> the 60x error passed CI).

MANDATORY REVIEW PASSED: physics-reviewer PASS (canonical ISO-3002 Vc=pi*D*N/1000, matches
constants.ts rpmFromVc, fallback safe, milling unchanged); safety-physics PASS S(x)=1.00 (SAFER --
garbage->correct + rpm DECREASES for larger diameter so overspeed risk drops; proven non-regression
via stash). This is the garbage->correct BUG FIX, decoupled from the gated milling over-deration
re-baseline (54 vs published ~120-185 is the SAME convergence philosophy issue, separate + gated).

SCOPED FOLLOW-ONS (#20, both reviewer-flagged, non-blocking): (a) boring uses workpiece OD not the
bore ID -> OD-based boring is approximate (conservative at the bore, improvement not regression) ->
needs a bore-diameter input; (b) PSO optimizeFn rpm (~L3789, separate method) still uses tool D;
(c) the turning chip-load/feed-per-tooth path stays milling-shaped.
```

## Files touched (3)
- mcp-server/src/__tests__/SpeedFeedOrchestrator-turning-workpiece-diameter.test.ts | 60 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts                             | 29 +++++++++++++++++++++++------
- 2 files changed, 83 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- till uses tool D;

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 679a27226178`
- Milestone envelope: `mcp-server/data/milestones/SFC-CONVERGENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._