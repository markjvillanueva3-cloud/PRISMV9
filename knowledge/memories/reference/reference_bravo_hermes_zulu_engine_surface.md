---
name: reference_bravo_hermes_zulu_engine_surface
description: The 9 real Hermes*/Zulu* engines + MoonshotClientEngine (verified names, mcp-server/src/engines/)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.486Z
aliases: reference_bravo_hermes_zulu_engine_surface
---


The hermes-zulu galaxy's engine surface (glob-verified 2026-05-28, `mcp-server/src/engines/`):

- `HermesParallelFanoutPlannerEngine.ts` — plan parallel agent fan-out
- `HermesFileScopePartitionerEngine.ts` — partition file scope (no collide)
- `HermesParallelBudgetEnvelopeEngine.ts` — per-fanout token/turn budget
- `HermesParallelVerdictAggregatorEngine.ts` — aggregate parallel verdicts
- `HermesSelfCorrectionEngine.ts` — self-correction loop
- `ZuluTaskAuctionEngine.ts` — auction NATO-slot work orders
- `ZuluDashboardControlEngine.ts` — fleet dashboard control
- `ZuluFleetGovernorEngine.ts` — fleet directive synthesis
- `MoonshotClientEngine.ts` — Opus heavy-reasoning invocation (NOT "MoonshotInvocationEngine" — that name was a scaffold hallucination)

Surface is hooks/helpers/skills/state + these engines — see [[reference_bravo_dispatcher_map_zero_actions]].
