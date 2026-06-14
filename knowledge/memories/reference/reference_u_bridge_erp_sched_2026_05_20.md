---
name: u-bridge-erp-sched-2026-05-20
description: 2026-05-20 hotel /loop iter5 — WorkOrderScheduleBridgeEngine, generic ERP work-order→scheduling/capacity bridge wired into prism_business (commits 9918fc663b + b3a8dc315b)
aliases: reference_u_bridge_erp_sched_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.988Z
---


# U-BRIDGE-ERP-SCHED — generic ERP WO→scheduling bridge (2026-05-20, slot hotel)

Last p1 ERP-bridge gap closed. `/checkin-hotel /goal complete all remaining
hotel queue` /loop, iter 5. Two commits:
- `9918fc663b` — initial ship (5 files, 1015 LOC, 37 tests)
- `b3a8dc315b` — 3-of-3 P1 fixes (2 files, +83 LOC, +4 tests, 41 total)

## Shipped

`WorkOrderScheduleBridgeEngine` — process-agnostic bridge from
`OrderManagerEngine` work-orders to the scheduling/capacity engines. Two
public methods, both composing existing singletons (`orderManagerEngine` +
`schedulingEngine` + `capacityPlanningEngine`):

- `scheduleOpenWorkOrders(opts)` — map every open WO → `Job` shape, run
  `schedulingEngine.schedule()`, correlate `JobAssignment` → `WorkOrder` so
  the result is keyed on WO ids (not synthetic Job ids). Returns
  `ScheduledWorkOrder[]` + late list + utilization + orphans + bridge meta.
- `whatIfWorkOrder(woId, opts)` — capacity what-if for a single WO; routes
  `hours = estimatedTime / 60` to `capacityPlanningEngine.whatIfJob`.

Genuine field mapping (not passthrough):
`Order.priority 1..5 → Job enum (1=critical, 2=high, 3=normal, 4-5=low)`;
`WO.estimatedTime (min) → cycle = (total - setup) / qty` (re-multiplies in
`jobDuration` to original total — algebraically exact); `WO.machine →
required_machine_type`; `Order.dueDate → due_date` (defaults today+14);
`start_day/end_day → ISO date offsets`.

Wired into `prism_business` (`businessDispatcher.ts`): +2 actions
(`schedule_open_work_orders`, `what_if_work_order`), +2 Zod schemas with
strict fleet validation (`machines.min(1)` + `efficiency 0-1`), +1 `getEngine`
lazy-load case.

## 3-of-3 scrutiny + P1 fixes shipped in same unit

- **Arm A** (reviewer holistic) → PASS w/ 1 P1: `whatIfWorkOrder` swallowed
  capacity-fleet mismatch (machine not in fleet → bare error from wrong layer).
  **Fixed** — bridge pre-validates `wo.machine ∈ capacityPlanningEngine.getMachines()`
  and throws bridge-layer error.
- **Arm B** (reviewer independent) → PASS, 0 P0/P1. Verified: zero
  `toBeDefined/toBeTruthy/toBeUndefined/typeof` smells, action count strictly
  +2, schema/dispatcher/case alignment, non-mocked end-to-end dispatcher tests.
- **Arm C** (code-analyzer) → PASS w/ 2 P2. **Promoted P2-1 to P1 and fixed**:
  `listOpenWorkOrders` only excluded `complete`+`cancelled`; `setup`+`running`
  WOs would have been re-scheduled and double-booked active floor work.
  Switched to positive whitelist `pending|queued`.

41/41 vitest PASS, zero tsc errors in change set (36 pre-existing errors in
unrelated CAD/Agent engines unchanged).

## Convention note — singleton over static-method class (R7+R11)

Same call as [[reference_u_bridge_erp_quote_2026_05_20|U-BRIDGE-ERP-QUOTE]]: `engines/.claude/CLAUDE.md` says static
methods; `mcp-server/CLAUDE.md` says singletons. Per R7 (conflicting →
more recent/tested) + R11 (match neighbours), the three composed engines
(`OrderManager` + `Scheduling` + `CapacityPlanning`) are all singletons, so
this bridge is too. Flagged in the engine header for the reviewer.

## Lesson — peer-lock contention on shared `H:/prism` is severe

12+ peer chats + golf integrator + audit watchdog → `.git/index.lock` was
held continuously during this unit. Hit it 5×. The pattern that worked:
- Wait 12-25 s between attempts (peer cycles eventually release).
- Use `command stat -c '%Y' .git/index.lock` to differentiate "actively held"
  from "stale".
- Pathspec commit (`git commit <paths>`) lets you ignore other staged peer
  files instead of fighting for the index.
- A few `git add` retries got auto-unstaged by other hooks during peer
  commits — re-stage and immediately commit in a chained shot.

## Hotel queue remaining

iter 5/20 of the `/loop`. The two p1 ERP bridges ([[reference_u_bridge_erp_quote_2026_05_20|U-BRIDGE-ERP-QUOTE]] +
U-BRIDGE-ERP-SCHED) are now shipped. Per the operator's verbatim
directive (`finish last task before we pivot to wiki + tribal knowledge
high roi generation and system injection`), the next pickup is the
wiki + tribal-knowledge high-ROI pivot — not more ERP bridges. p2
items (U-APPW42A, U-APPW43, muS-*) defer.

Related: [[reference_u_bridge_erp_quote_2026_05_20]] (sibling unit, prior
iter), [[reference_u_bridge_wire_business_2026_05_20]],
[[feedback_high_roi_backend_first_slot_queue]],
[[feedback_always_close_out]].
