---
name: mfg-cost-optimize
description: Find optimal cutting speed for minimum cost per part with full cost breakdown — MIT 15.060 machining economics
---

## When To Use
- Need to find the cutting speed that minimizes cost per part (economic optimum)
- Balancing tool cost against machine time cost for batch production
- Evaluating whether current cutting parameters are economically optimal
- Justifying speed changes to reduce manufacturing cost
- NOT for multi-objective optimization with competing goals (use mfg-multi-optimize)
- NOT for cycle time estimation without cost analysis (use mfg-cycle-time)

## How To Use
### Optimize for minimum cost
```
prism_calc action=cost_optimize params={
  material: "4140_steel",
  operation: "milling",
  batch_size: 100,
  machine_rate_hr: 85
}
```

### Optimize with detailed inputs
```
prism_calc action=cost_optimize params={
  material: "4140_steel",
  operation: "turning",
  batch_size: 500,
  machine_rate_hr: 85,
  tool_cost: 8.50,
  tool_change_time_min: 2.5,
  taylor_C: 350,
  taylor_n: 0.25,
  non_cutting_time_min: 1.5
}
```

## What It Returns
```json
{
  "optimal": {
    "Vc_min_cost_m_min": 215,
    "cost_per_part": 3.42,
    "cycle_time_min": 2.85,
    "tool_changes_per_batch": 8,
    "tools_consumed": 8.3
  },
  "cost_breakdown": {
    "machining_time_cost": 2.18,
    "tool_cost": 0.71,
    "tool_change_cost": 0.28,
    "non_productive_cost": 0.25,
    "total": 3.42
  },
  "sensitivity": {
    "Vc_max_production_m_min": 295,
    "cost_at_max_production": 4.15,
    "Vc_max_tool_life_m_min": 140,
    "cost_at_max_tool_life": 5.80,
    "economic_range_m_min": [180, 260]
  },
  "parameters": {
    "taylor_C": 350,
    "taylor_n": 0.25,
    "tool_life_at_optimal_min": 28.5,
    "MRR_at_optimal_cm3_min": 45.2
  }
}
```

## Examples
### Optimize milling cost for 4140 steel batch
- Input: `prism_calc action=cost_optimize params={material: "4140_steel", operation: "milling", batch_size: 100, machine_rate_hr: 85}`
- Output: Optimal Vc = 215 m/min, $3.42/part, economic range 180-260 m/min (flat cost curve in this range)
- Edge case: Very small batches (< 10) shift optimum toward max production speed since setup cost dominates

### Compare minimum cost vs. maximum production
- Input: Same as above but compare optimal.Vc_min_cost vs sensitivity.Vc_max_production
- Output: 215 m/min ($3.42/part) vs. 295 m/min ($4.15/part) — 21% cost increase for 37% faster cycle
- Edge case: When machine_rate_hr is very high (> $150), min cost and max production speeds converge
