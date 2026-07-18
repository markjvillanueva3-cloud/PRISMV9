---
name: reference_alpha_token_engines_inventory
description: The 10 token-optimization engines owned by slot:alpha and their paths
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.471Z
aliases: reference_alpha_token_engines_inventory
---


Token-optimization galaxy engines (all `H:/prism/mcp-server/src/engines/*.ts`, verified 2026-05-29 via Bash ls):
`TokenAwarenessEngine` (zone GREEN/YELLOW/RED), `TokenBudgetAllocatorEngine` (per-task budget), `TokenEconomyEngine` (fleet economy), `TokenEconomyTrackerEngine` (spend telemetry), `TokenAccountingEngine` (record+route), `SessionTokenLedgerEngine` (per-session ledger), `DiffTokenEstimatorEngine` (diff cost), `HookEfficiencyEngine` (hook profiling), `CADTokenRepresentationEngine` (CAD efficiency, echo/delta bridge), `CostEfficiencyBridgeEngine` (cost↔$ , hotel bridge).

Dispatcher actions: `prism_context:{token_budget_*, token_economy_*, token_ledger_*, diff_token_*}`. Full atlas: `mcp-server/src/engines/token-optimization/PATHS.md`. Hooks (~30): `cag-*`, `ollama-*`, `mcp-route-suggest`, `prompt-rewriter-ollama`.
