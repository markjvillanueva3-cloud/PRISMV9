# SFC-CONVERGENCE/U-SFC-ORCH-INPUT-ADAPTER — [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ORCH-INPUT-ADAPTER (slot:oscar): P1 -- pure OrchestratorInput->UltimateSpeedFeedInput adapter for the engine convergence

**Commit:** `d80bda17d1ea` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T01:16:31-05:00
**Tags:** sfc-convergence, u-sfc-orch-input-adapter, auto-distilled

## Subject
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ORCH-INPUT-ADAPTER (slot:oscar): P1 -- pure OrchestratorInput->UltimateSpeedFeedInput adapter for the engine convergence

## Body
```
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ORCH-INPUT-ADAPTER (slot:oscar): P1 -- pure OrchestratorInput->UltimateSpeedFeedInput adapter for the engine convergence

P1 of the operator-approved convergence (reference_oscar_sfc_convergence_plan_2026_06_21): the
input-translation layer P2 will use when SpeedFeedOrchestratorEngine.compute() delegates its core
physics to UltimateSpeedFeedEngine.calculate(). Built + tested in ISOLATION first (R13 -- verifiable
core before integration).

src/engines/lib/orchestrator-input-adapter.ts: pure orchestratorToUltimateInput() maps the
physics-relevant fields 1:1, with two transforms -- mapCoolant (coolant_type case-normalize:
"MQL"->"mql") + mapOptimizeFor ("cost"->"balanced"; the engine has no cost objective). Drops
orchestrator-only fields (machine_name/tool_grade/cam_strategy/calibration_overrides -- resolved to
scalars or applied outside the engine core). tsc-clean.

10 tests: coolant case-normalize + valid keys + unknown->undefined; optimize cost->balanced +
passthrough; 1:1 field mapping; no orchestrator-field leak; + a ROUND-TRIP proving the adapted input
is engine-consumable (ultimateSpeedFeedEngine.calculate() -> positive Vc/force, finite life). INERT
until P2 wires it (staged build); P2 remains gated on operator sign-off of the production re-baseline
(P0 baseline U-SFC-ORCH-REGRESSION-BASELINE quantifies the shift).
```

## Files touched (3)
- mcp-server/src/__tests__/orchestrator-input-adapter.test.ts | 103 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/lib/orchestrator-input-adapter.ts    |  89 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 192 insertions(+)

## Lessons surfaced in commit body
- til P2 wires it (staged build); P2 remains gated on operator sign-off of the production re-baseline

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d80bda17d1ea`
- Milestone envelope: `mcp-server/data/milestones/SFC-CONVERGENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._