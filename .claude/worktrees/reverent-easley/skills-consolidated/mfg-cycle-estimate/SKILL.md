---
name: Cycle Time Estimator
description: Estimate cycle time for quoting before detailed CAM programming
---

## When To Use
- When quoting a job and need rough cycle time without full CAM
- When estimating delivery lead times for customer commitments
- When comparing different process approaches by time
- When capacity planning for shop floor scheduling
- NOT for precise cycle time from G-code — use mfg-cycle-time instead

## How To Use
```
prism_intelligence action=cycle_time_estimate params={
  part: "bracket-001",
  material: "6061-T6",
  features: ["3 pockets", "12 holes", "profile"],
  envelope: { x: 150, y: 100, z: 25 },
  tolerance: "±0.01",
  quantity: 500
}
```

## What It Returns
- Estimated cycle time per part (min/max range)
- Time breakdown by feature type
- Setup time estimate per operation
- Confidence level of the estimate (low/medium/high)
- Comparison to similar historical jobs when available

## Examples
- Input: `cycle_time_estimate params={part: "plate", material: "304SS", features: ["6 holes", "2 pockets"], envelope: {x: 200, y: 150, z: 12}}`
- Output: 8-12 min/part estimated, medium confidence, pocket milling dominant at 65% of cycle

- Input: `cycle_time_estimate params={part: "shaft", material: "4140", features: ["turning", "threading", "groove"], envelope: {x: 50, y: 50, z: 200}}`
- Output: 6-9 min/part, lathe operation, threading adds 2 min, suggest bar feed for volume
