---
name: Process Cost Calculator
description: Calculate complete process cost with labor, tooling, machine time, and overhead
---

## When To Use
- When quoting a job and need accurate per-part cost breakdown
- When comparing cost of different process approaches
- When building a cost model for make-vs-buy decisions
- When tracking actual vs estimated cost for job closeout
- NOT for quick cycle time estimates — use mfg-cycle-estimate instead

## How To Use
```
prism_intelligence action=process_cost params={
  part: "bracket-001",
  material: "6061-T6",
  quantity: 500,
  operations: [
    { type: "mill", time_min: 12, tools: 4 },
    { type: "drill", time_min: 3, tools: 2 }
  ],
  labor_rate: 65,
  machine_rate: 95
}
```

## What It Returns
- Per-part cost breakdown: material, labor, machine, tooling, overhead
- Total job cost with setup amortization
- Cost per operation for identifying expensive steps
- Margin analysis at given sell price
- Batch size sensitivity showing cost vs quantity curve

## Examples
- Input: `process_cost params={part: "housing", material: "304SS", quantity: 100, operations: [{type: "turn", time_min: 8}, {type: "mill", time_min: 15}]}`
- Output: $42.30/part (material $8.20, labor $12.50, machine $14.80, tooling $3.60, overhead $3.20)

- Input: `process_cost params={part: "pin", material: "4140", quantity: 5000, labor_rate: 55}`
- Output: $3.85/part at volume, setup amortized to $0.02/part, tooling dominant at 35%
