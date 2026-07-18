---
name: reference_xproc_neural_milestone_drift_2026_06_23
description: XPROC-NEURAL-OPTIMIZE-MS0 has MILESTONE_PROGRESS drift -- >=2 units shipped but marked pending; the true next india gap is the orchestrator defaultInvoker stub (real tier fan-out unwired)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.268Z
aliases: reference_xproc_neural_milestone_drift_2026_06_23
---


# XPROC-NEURAL-OPTIMIZE-MS0 drift + true next gap (verified 2026-06-23, slot:india)

The india /loop `next` keeps rolling to **U-NN-TIER05** (XPROC-NEURAL-OPTIMIZE-MS0) but that unit is **already shipped** -- MILESTONE_PROGRESS drift, not real remaining work. Verified by reading the actual code, not the status field (existence/title != done, so I read the bodies):

- **U-NN-TIER05** ("T12 HierarchicalNeuralOrchestrator routes queries through tier stack") = DONE. `mcp-server/src/engines/CrossProcessHierarchicalNeuralOrchestratorEngine.ts` routes via `CrossProcessTierRouterEngine.route()` -> fans out per available tier -> aggregates with full provenance + surfaces `unavailable_tiers` with dependency chains. Wired into `aiReasoningDispatcher.ts` + `intelligenceDispatcher.ts`. Test `CrossProcessHierarchicalNeuralOrchestratorEngine.test.ts` = **22/22 green**.
- **"Wire CrossProcessOutcomeStore to publish on FeedbackBus"** = DONE. `mcp-server/src/engines/CrossProcessOutcomeStore.ts:272` publishes `outcome.recorded` and `:310` publishes `outcome.completed` to the real `feedbackBusEngine` (`FeedbackBusEngine.ts`, async queueMicrotask fan-out, per-subscriber try/catch, wildcard `*` tap).

Both are marked `status:pending` in `state/shared/specs/ROADMAP-CONSOLIDATED.json` and the milestone in `mcp-server/data/roadmap-index.json:10628` shows `completed_units:0` -- classic "envelope says pending but units already shipped" drift (CLAUDE.md MILESTONE_PROGRESS warning). The generator (`scripts/build-milestone-progress.mjs`) likely can't see them because the shipping commits' subjects don't carry the `[XPROC-NEURAL-OPTIMIZE-MS0]/U-...` scope it keys on.

## TRUE next india gap in this milestone (real, india-solo, but a MULTI-SESSION unit)

`CrossProcessHierarchicalNeuralOrchestratorEngine.ts:80-90` ships a `defaultInvoker` that returns a **stub echo** ("Tier X acknowledged via default stub invoker; supply tier_invoker for real fan-out"). The orchestrator's ROUTING is real, but the per-tier FAN-OUT only calls real engines when a `tier_invoker` is supplied (tests inject one). The code itself defers the retrofit: "The real orchestrator can be retrofit with actual engine imports once cross-tier [prerequisites met]".

To finish it (R13/R15 wire-it-whole): import + invoke the real engine for each AVAILABLE tier and keep graceful degradation for the rest. The available set (`CrossProcessTierRouterEngine.ts:84 AVAILABLE_TIERS`) is **10 tiers**: `T8-01, T8-03, T9-01..04, T11-01..04`; each maps to a `CrossProcess*Engine` via `ENGINE_BY_TIER` (line 90+). Each engine has its own primary method + payload contract -> research-heavy, ~10-engine blast radius. This is correctly a multi-session unit; do NOT start it at <GREEN budget (a half-wired fan-out is worse than none).

## How to apply
- When the india loop suggests U-NN-TIER05 or the FeedbackBus unit again: it is DONE -- do not rebuild; advance past it.
- The real backlog in this milestone is the `defaultInvoker` real-engine fan-out retrofit (scoped above) -- pick it up only with a fresh GREEN runway, all-or-clean-`[SCOPED]`.
- Sibling drift pattern: read the code body to confirm a `pending` unit is genuinely unbuilt before claiming it as remaining work. [[feedback_read_full_content_not_titles]]
