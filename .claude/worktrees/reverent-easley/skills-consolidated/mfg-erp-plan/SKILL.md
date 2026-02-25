---
name: mfg-erp-plan
description: Get production plans from ERP integration for scheduling and resource allocation
---

# ERP Production Plan

## When To Use
- Retrieving the production plan for a specific work order or time period
- Checking scheduled operations, machine assignments, and material requirements
- Aligning shop floor execution with ERP-generated production sequences
- Validating that machine capacity matches planned production load

## How To Use
```
prism_intelligence action=erp_get_plan params={wo_number: "WO-2026-001"}
prism_intelligence action=erp_get_plan params={date_range: {from: "2026-02-23", to: "2026-02-28"}, machine_id: "DMG-5X-01"}
```

## What It Returns
- `plan_id` — production plan identifier
- `operations` — ordered list of operations with routing, machine, and time estimates
- `materials` — required materials and current availability status
- `schedule` — planned start/end times for each operation
- `dependencies` — predecessor/successor operation relationships

## Examples
- Get plan for a work order: `erp_get_plan params={wo_number: "WO-2026-0145"}`
- Get weekly production plan: `erp_get_plan params={date_range: {from: "2026-02-23", to: "2026-03-01"}}`
- Get plan for a specific machine: `erp_get_plan params={machine_id: "HAAS-VF2-03", date_range: {from: "2026-02-23", to: "2026-02-24"}}`
