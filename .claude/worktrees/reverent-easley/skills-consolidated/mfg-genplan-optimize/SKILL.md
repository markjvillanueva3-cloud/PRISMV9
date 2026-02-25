---
name: Process Plan Optimizer
description: Optimize generated process plan for cost, time, or quality objectives
---

## When To Use
- When refining an existing process plan for better performance
- When minimizing cycle time, cost, or maximizing quality
- When comparing optimization strategies (cost vs speed vs quality)
- NOT for generating a plan from scratch — use mfg-genplan instead
- NOT for single-parameter optimization — use mfg-param-optimize instead

## How To Use
```
prism_intelligence action=genplan_optimize params={
  plan_id: "plan-bracket-001",
  objective: "minimize_cost",
  constraints: {
    max_cycle_time: 60,
    min_surface_finish: 1.6,
    available_tools: ["registry-standard"]
  }
}
```

## What It Returns
- Optimized plan with before/after comparison
- Savings summary (time, cost, tool changes)
- Trade-off analysis across objectives
- Operations modified with justification
- Constraint satisfaction report

## Examples
- Input: `genplan_optimize params={plan_id: "plan-A1", objective: "minimize_time"}`
- Output: Cycle reduced 52 to 38 min by combining roughing passes, parallel operations, and tool path optimization

- Input: `genplan_optimize params={plan_id: "plan-B2", objective: "minimize_cost", constraints: {max_cycle_time: 45}}`
- Output: Cost reduced 18% by switching to longer-life tools, consolidating 2 setups into 1, within 43 min cycle
