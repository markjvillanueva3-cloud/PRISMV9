# SFC-CONVERGENCE/U-SFC-ORCH-BORE-DIAMETER — [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ORCH-BORE-DIAMETER (slot:oscar): boring rpm/Vc uses the BORE diameter (optional bore_diameter_mm input)

**Commit:** `3c26c7ae0459` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T17:07:34-05:00
**Tags:** sfc-convergence, u-sfc-orch-bore-diameter, auto-distilled

## Subject
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ORCH-BORE-DIAMETER (slot:oscar): boring rpm/Vc uses the BORE diameter (optional bore_diameter_mm input)

## Body
```
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ORCH-BORE-DIAMETER (slot:oscar): boring rpm/Vc uses the BORE diameter (optional bore_diameter_mm input)

Closes the boring CAVEAT left by U-SFC-ORCH-TURNING (#20a). Boring's surface
speed is set by the BORE diameter (the hole being enlarged), so for boring
rpm = 1000*Vc/(pi*D_bore). The orchestrator was using the workpiece OD for
boring (conservative but wrong).

- new optional input bore_diameter_mm; for operation==="boring" the rpm<->Vc
  diameter prefers bore_diameter_mm, else falls back to the workpiece OD, else
  the tool D (never divide by zero). Applied at both rpm sites (compute() +
  PSO optimizeFn).
- turning/facing/grooving/parting keep the workpiece OD; milling/drilling keep D.

ADDITIVE: with NO bore_diameter_mm the result is byte-identical to the prior
workpiece-OD fallback -- existing callers (the UI does not yet send this field)
are unchanged; the new input only takes effect when provided. So this is not a
production-number change, it is a new capability + correctness for boring.

10/10 tests (5 boring + 5 turning regression); tsc clean. Mandatory physics +
safety review (Vc/rpm change per oscar soul).
```

## Files touched (3)
- mcp-server/src/__tests__/SpeedFeedOrchestrator-boring-bore-diameter.test.ts | 74 +++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts                       | 36 ++++++++++++------
- 2 files changed, 99 insertions(+), 11 deletions(-)

## Lessons surfaced in commit body
- wrong).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3c26c7ae0459`
- Milestone envelope: `mcp-server/data/milestones/SFC-CONVERGENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._