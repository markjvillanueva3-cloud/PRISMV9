---
name: u-bridge-wire-business-2026-05-20
description: 2026-05-20 hotel /loop — wired 3 unwired Business engines into prism_business (6 actions); COST-CASCADE-MS0 carryover closed
aliases: reference_u_bridge_wire_business_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.233Z
---


# U-BRIDGE-WIRE-BUSINESS + COST-CASCADE carryover (2026-05-20, slot hotel)

`/checkin-hotel /goal complete all remaining hotel queue + prior hotel chat` /loop.

## Shipped (2 commits, cad-fusion-live-ms0)

**Carryover — COST-CASCADE-MS0 close-out** — prior hotel chat `claude-d169c809`
ran a COST-CASCADE-MS0 /loop and shipped 7/8 units but left the envelope
top-level `status` at `not_started`. Reconciled: flipped to `in_progress`
(unit-level statuses already complete with close_out_notes citing real
commits). `U-CASCADE-CALIBRATE` registered in `CLOSE-OUT-DEFERRED.md` —
externally blocked by `K2-CLOUD-MS0::K2-K0` (K2 must be transport-callable
before cascade calibration probes it); cannot be built autonomously.

**U-BRIDGE-WIRE-BUSINESS** — wired 3 genuinely-unwired Business engines into
`prism_business` (`businessDispatcher.ts`). The 2026-05-07 unwired audit was
13 days stale — grepped all dispatchers; 3 of the 10 `prism_business`
candidates (`CostEstimationEngine`, `CostEstimatorEngine`,
`DocustrataCustomerIndexEngine`) were already wired → dropped. Wired:
- `EngineeringChangeOrderEngine` → `eco_validate`, `eco_stats`
- `QdrantCapacityPlannerEngine` → `qdrant_capacity_plan`, `qdrant_capacity_max_fraction`
- `ERPToolInventoryEngine` → `erp_tool_search`, `erp_tool_reorder_alerts`
  (static-method engine — `getEngine` returns the **class reference**, not a
  singleton instance; this is the key wiring subtlety)

+6 z.enum actions, +4 Zod schemas (`eco_stats` + `erp_tool_reorder_alerts`
take no params → no schema, per the `billing_stripe_status` precedent).
22/22 round-trip E2E tests through the dispatcher handler. tsc clean (0 new
errors — 30 pre-existing baseline errors in unrelated CAD/Agent engines).

## Lesson — stale unwired audit has false positives

`state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json` and BUILD_STATE
`NEEDS_WIRING` carry false positives (engines wired after the audit date).
ALWAYS `grep` the dispatchers dir for the engine class name before wiring —
3 of 10 candidates here were already live. Same lesson as
[[reference_u_wire_swarm_group]].

## Hotel queue remaining (next /loop iterations)

Priority queue (`priority-queue.mjs --pick --slot hotel`) had 12 units. Done: 1.
Remaining 11 — top 2 are p1 bridges, both need a full engine+wire+test build:
- `U-BRIDGE-ERP-QUOTE` — gap CONFIRMED: no generic (non-lathe) quote→ERP-order
  bridge exists (`lathe_job_from_quote` is lathe-specific; `from_quote`
  greps only to lathe code). Build: bridge `QuoteEstimatorEngine.estimate`
  ↔ `OrderManagerEngine.createOrder`/`createWorkOrder`.
- `U-BRIDGE-ERP-SCHED` — ERP work orders → scheduling/capacity engines.
- then `U-APPW42A`, `U-APPW43` (APPW-MS8 convergence, p2), `muS-*` ARC-MS
  customer-analytics units (p2).

Related: [[feedback_high_roi_backend_first_slot_queue]],
[[feedback_checkin_args_are_primary_work_order]].
