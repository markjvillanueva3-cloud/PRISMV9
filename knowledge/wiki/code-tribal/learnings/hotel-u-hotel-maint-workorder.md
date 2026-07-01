# HOTEL/U-HOTEL-MAINT-WORKORDER — [MAIN-FORCE] [HOTEL]/U-HOTEL-MAINT-WORKORDER (slot:hotel): wire the dead MaintenanceWorkOrderPage -- GET /maintenance/work-orders (pm_work_order_list + PMWorkOrder->WorkOrder adapter) + POST refresh + migrate the FE off raw fetch onto api/client (auth header)

**Commit:** `17915175e273` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T18:24:40-05:00
**Tags:** hotel, u-hotel-maint-workorder, auto-distilled

## Subject
[MAIN-FORCE] [HOTEL]/U-HOTEL-MAINT-WORKORDER (slot:hotel): wire the dead MaintenanceWorkOrderPage -- GET /maintenance/work-orders (pm_work_order_list + PMWorkOrder->WorkOrder adapter) + POST refresh + migrate the FE off raw fetch onto api/client (auth header)

## Body
```
[MAIN-FORCE] [HOTEL]/U-HOTEL-MAINT-WORKORDER (slot:hotel): wire the dead MaintenanceWorkOrderPage -- GET /maintenance/work-orders (pm_work_order_list + PMWorkOrder->WorkOrder adapter) + POST refresh + migrate the FE off raw fetch onto api/client (auth header)
```

## Files touched (5)
- mcp-server/src/__tests__/erp-rfq-routes.test.ts    | 58 ++++++++++++++++++++++
- mcp-server/src/routes/erp.ts                       | 35 +++++++++++++
- mcp-server/web/src/api/client.ts                   | 10 ++++
- .../web/src/pages/MaintenanceWorkOrderPage.tsx     | 49 ++++++++++--------
- 4 files changed, 131 insertions(+), 21 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 17915175e273`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._