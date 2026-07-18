---
name: reference_tokenecon_roi_wire_2026_06_19
description: U-TOKENECON-ROI wired dormant TokenEconomyEngine.computeROI to prism_context:token_economy_compute_roi; the reusable gotcha = engine Infinity returns serialize to JSON null over the MCP envelope
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.222Z
aliases: reference_tokenecon_roi_wire_2026_06_19
---


**U-TOKENECON-ROI** (slot:alpha, 2026-06-19, commit `a7c9011bec`, branch cad-fusion-live-ms0) wired the dormant `TokenEconomyEngine.computeROI(taskClass, tokensSpent, capabilitiesDelivered)` (`mcp-server/src/engines/TokenEconomyEngine.ts:392`) to a new `prism_context:token_economy_compute_roi` MCP action. Additive only (81 insertions, 0 deletions): Zod schema in `contextActionSchemas.ts:563`, action in the `contextDispatcher` z.enum + a lazy-import case (~`:1331`), 9 round-trip tests in `contextDispatcher.token-economy-wire.test.ts`. tsc clean, per-file 2-arm + end 2-of-2 scrutiny PASS (0 findings).

**Reusable wiring gotcha (verify when wiring ANY engine that can return a non-finite number over MCP):** `computeROI` returns `cost_per_capability: Math.round(costPerCap)` where `costPerCap = capabilitiesDelivered > 0 ? tokensSpent/capabilitiesDelivered : Infinity`. The guarded ternary is correct (never computes `0/0=NaN` — a Sonnet discovery agent WRONGLY claimed NaN; the ternary returns Infinity for zero caps). But `Infinity` does NOT survive the MCP envelope: `responseSlimmer.ts:slimResponse` preserves it (it is a number, not null/undefined), then `ok()`'s `JSON.stringify(Infinity) === null`. So the round-trip test for the zero-capability boundary must assert `cost_per_capability` **toBeNull()** with rating "poor" — NOT `Infinity`, NOT `NaN`. The engine's OWN unit test (`TokenEconomyEngine.test.ts:152`) independently pins `=== Infinity` pre-serialization, which is why both layers are honest (R12). Rating bands are exact reference values tied to the engine thresholds `<10k`/`<25k`/`<50k` (4000=excellent, 15000=good, 35000=fair, 120000=poor).

Adversarial schema rejections fire because `validateActionParams` runs BEFORE the dispatcher switch: `z.number().min(0)` rejects NaN+negatives, `z.number().int()` rejects non-integers, `z.enum` rejects unknown task_class — all return `{success:false}`. The 9-member `task_class` enum mirrors the canonical `TaskClass` union (`AutomationChainEngine.ts:26`).

Sibling dormant diagnostics queued next: `SessionTokenLedgerEngine.mostExpensive` -> `prism_dev:token_ledger_most_expensive`. See [[reference_graph_autouse_relevance_gate_2026_06_19]] for the GRAPH-AUTOUSE work that preceded this in the same alpha loop.
