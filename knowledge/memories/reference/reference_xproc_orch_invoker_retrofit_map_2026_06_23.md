---
name: reference_xproc_orch_invoker_retrofit_map_2026_06_23
description: "Running-start map for the orchestrator real-engine tier fan-out retrofit -- the 10 AVAILABLE tiers, their CrossProcess engines + primary methods (heterogeneous = per-tier adapters, multi-session)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.269Z
aliases: reference_xproc_orch_invoker_retrofit_map_2026_06_23
---


# Orchestrator real-engine fan-out retrofit -- the 10-tier adapter map (running start)

The next india unit after U-XPROC-ORCH-FANOUT-HONESTY (`884542bc`): replace `CrossProcessHierarchicalNeuralOrchestratorEngine.defaultInvoker` (a placeholder echo) with **engine-side real per-tier invocation**, so `orchestrate()` without a caller `tier_invoker` returns real tier outputs (fan_out_mode flips `default_stub` -> `supplied`). The invoker MUST be engine-side because functions can't cross the MCP/JSON boundary (the `prism_intelligence`/`aiReasoning` dispatcher paths strip `tier_invoker`).

## Why it's MULTI-SESSION (verified 2026-06-23)
The 10 `AVAILABLE_TIERS` engines (`CrossProcessTierRouterEngine.ts:84`, map at `:90 ENGINE_BY_TIER`) have HETEROGENEOUS contracts -- NO uniform entry method -- so each needs its own adapter (generic `payload: Record<string,unknown>` -> the engine's typed input -> its primary static method):

| Tier | Engine | Primary method (static) |
|------|--------|--------------------------|
| T8-01 | CrossProcessSymbolicConstraintEnforcerEngine | `project(ProjectionInput)` (+ `violations()`) |
| T8-03 | CrossProcessNeuroSymbolicSafetyVerifierEngine | `verify(VerifyInput)` (+ `escalate()`) |
| T9-01 | CrossProcessCausalGraphLearnerEngine | `learnDAG(LearnDAGInput)` (+ `testIndependence`,`exportGraph`) |
| T9-02 | CrossProcessDoCalculusEngine | (read its export -- not yet sampled) |
| T9-03 | CrossProcessCounterfactualPredictorEngine | (read its export) |
| T9-04 | CrossProcessMediationAnalyzerEngine | (read its export) |
| T11-01 | CrossProcessUncertaintyDrivenSamplerEngine | `select(SelectInput)` |
| T11-02 | CrossProcessNoveltyDetectorEngine | `score(ScoreInput)` |
| T11-03 | CrossProcessCuriosityDrivenExplorationEngine | (read its export) |
| T11-04 | CrossProcessBayesianDOEPlannerEngine | (read its export) |

5 of 10 contracts sampled; the other 5 (T9-02/03/04, T11-03/04) still need their primary method + input type read before wiring.

## How to build it (next session, fresh GREEN runway)
1. Build an engine-side `TIER_INVOKERS: Record<TierId, (payload)=>unknown>` map (one adapter per available tier; map the orchestrator payload to each engine's typed input + call its static method; wrap each in try/catch so one tier's bad payload doesn't sink the fan-out -- the orchestrator already records per-tier `status:"error"`).
2. Make it the orchestrator's default (replace `defaultInvoker`), keeping the caller-`tier_invoker` override for tests.
3. fan_out_mode (shipped `884542bc`) then reports `supplied` for the real default; consider a per-tier `wired` flag if some tiers stay stubbed (don't over-claim).
4. R13/R15 wire-it-whole: do ALL 10 in the unit (or mark `[SCOPED]` if only a subset). Real-value tests: each tier's adapter produces the engine's real output shape, not the echo.
Pairs with [[stub-fallback-must-signal-mode-not-pose-as-real]] · [[reference_xproc_neural_milestone_drift_2026_06_23]] (U-NN-TIER05 routing already done).
