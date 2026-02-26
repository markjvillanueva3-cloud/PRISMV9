---
name: Job Planner
description: Create complete job plans from part requirements to process sequence
---

## When To Use
- When starting a new manufacturing job from scratch
- When you need a complete process plan for quoting or production
- When converting part drawings into actionable machining sequences
- NOT for individual operation parameters — use mfg-speed-feed instead
- NOT for scheduling existing jobs — use mfg-shop-schedule instead

## How To Use
```
prism_intelligence action=job_plan params={
  part: "bracket-001",
  material: "6061-T6",
  quantity: 500,
  tolerance: "±0.005",
  features: ["pockets", "holes", "profile"]
}
```

## What It Returns
- Operation sequence with tool assignments per setup
- Estimated cycle time per operation and total
- Setup requirements and fixture recommendations
- Risk assessment for critical features
- Material removal strategy per feature

## Examples
- Input: `job_plan params={part: "housing-assembly", material: "304SS", quantity: 100}`
- Output: 3-setup plan with 12 operations, estimated 45 min cycle, 2 critical features flagged

- Input: `job_plan params={part: "shaft-drive", material: "4140", quantity: 50, features: ["turning", "threading", "keyway"]}`
- Output: Lathe-first plan, 2 setups, 8 operations, M6x1 thread flagged for gauge verification
