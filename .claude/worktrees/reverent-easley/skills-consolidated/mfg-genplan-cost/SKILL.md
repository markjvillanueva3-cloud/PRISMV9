---
name: Plan Cost Estimator
description: Estimate cycle time and cost for generated process plan
---

## When To Use
- When estimating manufacturing cost for a process plan
- When calculating cycle time across all operations and setups
- When comparing cost of alternative process plans
- NOT for single-operation cost — use mfg-process-cost-calc instead
- NOT for speed/feed optimization — use mfg-cost-optimize instead

## How To Use
```
prism_intelligence action=genplan_cycle params={
  plan_id: "plan-bracket-001",
  include_setup_time: true,
  batch_size: 500
}
```
```
prism_intelligence action=genplan_cost params={
  plan_id: "plan-bracket-001",
  rates: { machine: 85, labor: 45 },
  batch_size: 500,
  include_tooling: true
}
```

## What It Returns
- Per-operation cycle time breakdown
- Total cycle time including setup and tool changes
- Cost breakdown: machine time, labor, tooling, material
- Per-part cost at specified batch size
- Batch economics with setup amortization

## Examples
- Input: `genplan_cycle params={plan_id: "plan-A1", batch_size: 100}`
- Output: 42.5 min/part cycle, 3.2 min setup amortized, 12 tool changes at 0.5 min each
- Input: `genplan_cost params={plan_id: "plan-A1", rates: {machine: 95, labor: 50}, batch_size: 100}`
- Output: $78.30/part (machine $52.10, labor $18.40, tooling $4.80, material $3.00)
