# BRIDGE-DEEP/U-BRIDGE-ERP-SCHED — [MAIN] [BRIDGE-DEEP]/U-BRIDGE-ERP-SCHED (slot:hotel): WorkOrderScheduleBridgeEngine — generic ERP work-order to scheduling/capacity bridge

**Commit:** `9918fc663b12` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T20:32:45-05:00
**Tags:** bridge-deep, u-bridge-erp-sched, auto-distilled

## Subject
[MAIN] [BRIDGE-DEEP]/U-BRIDGE-ERP-SCHED (slot:hotel): WorkOrderScheduleBridgeEngine — generic ERP work-order to scheduling/capacity bridge

## Body
```
[MAIN] [BRIDGE-DEEP]/U-BRIDGE-ERP-SCHED (slot:hotel): WorkOrderScheduleBridgeEngine — generic ERP work-order to scheduling/capacity bridge

Closes the last p1 ERP-bridge gap. OrderManagerEngine emits work-orders but nothing schedules them onto the capacity model. schedulingEngine.schedule() / capacityPlanningEngine.whatIfJob() both take their own job-shapes; this bridge does the field mapping + correlates results back to WO ids.

Singleton per R7+R11. Two methods: scheduleOpenWorkOrders(opts) maps open WO -> Job and schedules onto supplied machines, returns ScheduledWorkOrder[] keyed on WO ids + late_work_orders + utilization + orphans. whatIfWorkOrder(woId, opts) routes hours=estimatedTime/60 to capacityPlanningEngine.whatIfJob.

Mapping: Order.priority 1-5 -> Job enum (1=critical, 2=high, 3=normal, 4-5=low); WO.estimatedTime -> cycle=(total-setup)/qty; WO.machine -> required_machine_type; Order.dueDate -> due_date (defaults today+14); start_day/end_day -> ISO date offsets.

Wired into prism_business: +2 actions, +2 Zod schemas (machines min(1), efficiency 0-1), +1 getEngine case.

Tests 37/37 PASS (26 engine-direct + 11 dispatcher round-trip). Real-value assertions only. R12 fail-loud on bad inputs. Zero tsc errors in change set.
```

## Files touched (6)
- .../WorkOrderScheduleBridgeEngine.test.ts          | 429 +++++++++++++++++++++
- .../businessDispatcher.erp-sched-bridge.test.ts    | 221 +++++++++++
- .../src/engines/WorkOrderScheduleBridgeEngine.ts   | 274 +++++++++++++
- mcp-server/src/schemas/businessActionSchemas.ts    |  22 ++
- .../src/tools/dispatchers/businessDispatcher.ts    |  26 ++
- 5 files changed, 972 insertions(+)

## Lessons surfaced in commit body
- tilization + orphans. whatIfWorkOrder(woId, opts) routes hours=estimatedTime/60 to capacityPlanningEngine.whatIfJob.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9918fc663b12`
- Milestone envelope: `mcp-server/data/milestones/BRIDGE-DEEP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._