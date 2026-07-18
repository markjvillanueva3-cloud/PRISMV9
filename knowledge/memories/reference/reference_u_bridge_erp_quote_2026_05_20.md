---
name: u-bridge-erp-quote-2026-05-20
description: 2026-05-20 hotel /loop iter4 — QuoteToOrderBridgeEngine, generic quote→ERP-order bridge wired into prism_business (commit 0489e701)
aliases: reference_u_bridge_erp_quote_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.233Z
---


# U-BRIDGE-ERP-QUOTE — generic quote→ERP-order bridge (2026-05-20, slot hotel)

`/checkin-hotel /goal complete all remaining hotel queue` /loop, iter 4.
Commit `0489e70146` on `cad-fusion-live-ms0`.

## Shipped

`QuoteToOrderBridgeEngine` — a new process-agnostic ERP↔quoting bridge. Two
public methods, both composing the existing `QuoteEstimatorEngine` +
`OrderManagerEngine`:

- `estimateAndCreateOrder(input, opts)` — run `quoteEstimatorEngine.estimate`,
  then create an `OrderManagerEngine` order + per-operation work orders.
- `createOrderFromQuote(quote, opts)` — bridge an already-computed
  `QuoteEstimateResult` (generic counterpart of the lathe-only
  `lathe_job_from_quote`).

Genuine mapping logic (not a passthrough): lead-time→due-date derivation
(rush picks `total_rush_days`), rush→priority (rush=1, standard=3),
per-operation work-order time = `cycle_time_min × quantity + setup_time_min`,
and a quote-traceable `order.notes` string. `customer` is required — a quote
estimate carries none.

Wired into `prism_business` (`businessDispatcher.ts`): +2 actions
(`quote_to_order`, `order_from_quote`), +2 Zod schemas, +1 `getEngine`
lazy-load case. 5 files, 43/43 vitest PASS (32 engine-direct + 11 dispatcher
round-trip), tsc clean (0 errors in changed files), 3-of-3 scrutiny PASS.

## Lesson — `quote_to_ship_run` is NOT a quote→order bridge

A close-out audit could mistake `quote_to_ship_run` for covering this gap. It
does NOT: `QuoteToShipOrchestratorEngine.runFullPipeline` is a **26-stage
print-to-SHIP pipeline** (INTAKE→FEATURE_RECOGNITION→…→SHIPPING) with **no
`OrderManagerEngine` integration** — it has a `JOB_LIFECYCLE` stage but never
creates an ERP order. `lathe_job_from_quote` is lathe-only
(`latheScheduler.jobFromQuote`). So the lightweight generic quote→ERP-order
gap was real — verified by reading the 26-stage `STAGE_ORDER` list before
building.

## Convention note — singleton over static-method class

The repo's engine-convention docs conflict: `engines/.claude/CLAUDE.md` +
`H:/.claude/rules/engines.md` say "static methods"; `mcp-server/CLAUDE.md`
says "export singletons". Per R7 (conflicting rules → pick the more
recent/tested) + R11 (match the neighbours), the bridge is a singleton —
`QuoteEstimatorEngine` + `OrderManagerEngine` (the two it composes) are both
`export const ...Engine`. The choice is flagged in an in-code comment so a
reviewer doesn't bounce it on the static-method rule.

## Hotel queue remaining

iter 4/20, loop `running`. ~10 units remain — next is `U-BRIDGE-ERP-SCHED`
(ERP work orders → scheduling/capacity engines), then `U-APPW42A`/`U-APPW43`
(APPW-MS8 convergence, p2) and the `muS-*` ARC-MS customer-analytics units.

Related: [[reference_u_bridge_wire_business_2026_05_20]] (sibling unit, same
loop), [[feedback_high_roi_backend_first_slot_queue]],
[[feedback_checkin_args_are_primary_work_order]].
