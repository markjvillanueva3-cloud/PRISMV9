---
name: reference_charlie_quoting_engine_map
description: "Quoting surface — 78 cost/quote engines flat at engines/ + 2 dispatchers (prism_business, prism_quoting)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.055Z
aliases: reference_charlie_quoting_engine_map
---


Quoting engines live FLAT at `mcp-server/src/engines/` (Cost*/Quote*/Estimat*/Pricing*/Freight*/Import* — 78 files), NOT under `quoting/` (that subdir is just the galaxy sentinel).

Orchestrators: InstantQuoteEngine(38K), BlueprintToQuoteBridgeEngine(15K), QuoteToShipOrchestratorEngine, JMDieQuoteTrainingPipelineEngine. Per-process: Additive/Casting/InjectionMold/SheetMetalQuoteEngine. Cost: JobCostingEngine(22K), ActualCostEngine(17K), CycleTimeEstimatorEngine(48K). Reconciliation: LatheActualCostReconciliation(↔whiskey), ERPCostFeedback(↔hotel), CostSavingsTracker, CostAlarm.

Dispatchers (PREFER over inlining): `prism_business` (businessDispatcher.ts — quote_estimate/instant_quote/actual_cost_*/analytics_*), `prism_quoting` (quotingDispatcher.ts — camera_intake_route/quote_xometry_style/jm_die_quote_training_pipeline/quoting_calibration_*). Full atlas: `engines/quoting/PATHS.md`. Enumerate: `rtk grep -l "Quote\|Cost\|Estimat" mcp-server/src/engines/*.ts`.
