# HOTEL/U-HOTEL-WIRE-PM-ASSET — [MAIN-FORCE] [HOTEL]/U-HOTEL-WIRE-PM-ASSET (slot:hotel): wire Vertical 1 -- 16 dead PreventiveMaintenance + EquipmentAsset client calls to existing prism_business actions (pm_schedule/work_order/overdue + asset_list/register/transfer/calibration/depreciation) via rfqRoute envelope-unwrap. Fixes P0 maintenance-complete wo_id->work_order_id mapping (per-file scrutiny caught). Dead client calls 73->56.

**Commit:** `e4760f2dbeef` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T07:34:25-05:00
**Tags:** hotel, u-hotel-wire-pm-asset, auto-distilled

## Subject
[MAIN-FORCE] [HOTEL]/U-HOTEL-WIRE-PM-ASSET (slot:hotel): wire Vertical 1 -- 16 dead PreventiveMaintenance + EquipmentAsset client calls to existing prism_business actions (pm_schedule/work_order/overdue + asset_list/register/transfer/calibration/depreciation) via rfqRoute envelope-unwrap. Fixes P0 maintenance-complete wo_id->work_order_id mapping (per-file scrutiny caught). Dead client calls 73->56.

## Body
```
[MAIN-FORCE] [HOTEL]/U-HOTEL-WIRE-PM-ASSET (slot:hotel): wire Vertical 1 -- 16 dead PreventiveMaintenance + EquipmentAsset client calls to existing prism_business actions (pm_schedule/work_order/overdue + asset_list/register/transfer/calibration/depreciation) via rfqRoute envelope-unwrap. Fixes P0 maintenance-complete wo_id->work_order_id mapping (per-file scrutiny caught). Dead client calls 73->56.
```

## Files touched (3)
- mcp-server/src/__tests__/erp-rfq-routes.test.ts | 136 ++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/erp.ts                    |  59 ++++++++++++++++++++
- 2 files changed, 195 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e4760f2dbeef`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._