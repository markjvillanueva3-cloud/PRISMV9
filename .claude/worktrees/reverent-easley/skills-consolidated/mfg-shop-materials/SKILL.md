---
name: Shop Material Tracker
description: Shop material inventory and consumption tracking
---

## When To Use
- When checking material stock before quoting or starting a job
- When tracking material consumption against job estimates
- When planning material purchases for upcoming jobs
- When analyzing material waste and yield rates
- NOT for material property lookup — use mfg-material-lookup instead

## How To Use
```
prism_intelligence action=shop_materials params={
  action: "inventory",
  material: "6061-T6",
  form: "plate",
  dimensions: { thickness: 25 }
}
```

## What It Returns
- Current stock levels by material, form, and size
- Consumption history and burn rate trends
- Allocated vs available inventory for active jobs
- Reorder recommendations based on upcoming demand
- Yield analysis showing material utilization percentage

## Examples
- Input: `shop_materials params={action: "inventory", material: "304SS"}`
- Output: 12 bars (1.5" round), 4 plates (0.5" x 12x24), 800 lbs total, 3 jobs allocated

- Input: `shop_materials params={action: "consumption", job_id: "JOB-2024-0142"}`
- Output: Estimated 45 lbs, actual 52 lbs consumed, 86% yield, offcuts logged for small parts
