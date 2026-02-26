---
name: mfg-erp-cost
description: Send cost feedback to ERP and track manufacturing cost history
---

# ERP Cost Feedback

## When To Use
- Reporting actual manufacturing costs back to ERP after job completion
- Comparing estimated vs actual costs for continuous improvement
- Tracking cost trends across production runs for a given part number
- Building cost baselines for future quoting and estimation

## How To Use
```
prism_intelligence action=erp_cost_feedback params={wo_number: "WO-2026-001", actual_cost: {material: 45.00, labor: 120.00, tooling: 18.50, overhead: 35.00}}
prism_intelligence action=erp_cost_history params={part_number: "PN-7742", last_n: 10}
```

## What It Returns
- `wo_number` — work order the cost was reported against
- `cost_variance` — difference between planned and actual cost
- `cost_breakdown` — itemized cost categories (material, labor, tooling, overhead)
- `history` — historical cost records for trend analysis
- `trend` — cost trend direction (improving, stable, degrading)

## Examples
- Report job cost: `erp_cost_feedback params={wo_number: "WO-2026-0145", actual_cost: {material: 52.00, labor: 95.00, tooling: 12.00}}`
- Get cost history for a part: `erp_cost_history params={part_number: "PN-7742", last_n: 20}`
- Compare cost across work orders: `erp_cost_history params={part_number: "PN-7742", include_variance: true}`
