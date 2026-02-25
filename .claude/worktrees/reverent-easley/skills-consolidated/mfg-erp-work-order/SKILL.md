---
name: mfg-erp-work-order
description: Import and list work orders from ERP systems for production planning
---

# ERP Work Order Import

## When To Use
- Importing work orders from SAP, Oracle, or other ERP systems into PRISM
- Listing all active work orders for scheduling and planning
- Syncing ERP production orders with shop floor execution
- Pulling work order details (part number, quantity, due date) for job planning

## How To Use
```
prism_intelligence action=erp_import_wo params={erp_system: "SAP", wo_number: "WO-2026-001", sync_mode: "incremental"}
prism_intelligence action=erp_wo_list params={status: "open", sort_by: "due_date"}
```

## What It Returns
- `work_orders` — list of imported/matching work orders
- `wo_number` — work order identifier from ERP
- `part_number` — part to be manufactured
- `quantity` — required production quantity
- `due_date` — delivery deadline
- `status` — current work order status (open, in-progress, complete)

## Examples
- Import a specific work order: `erp_import_wo params={erp_system: "SAP", wo_number: "WO-2026-0145"}`
- List all open work orders: `erp_wo_list params={status: "open"}`
- List work orders due this week: `erp_wo_list params={due_before: "2026-02-28", status: "open"}`
