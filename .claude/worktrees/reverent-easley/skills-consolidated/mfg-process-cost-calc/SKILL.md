---
name: mfg-process-cost-calc
description: Calculate cost per part from speed/feed parameters with full breakdown — machining, tool, and overhead costs
---

## When To Use
- Have specific cutting parameters and need to calculate the resulting cost per part
- Evaluating cost impact of a parameter change (what happens to cost if I increase speed by 10%?)
- Building a cost estimate for quoting or production planning
- Need per-part breakdown of machining time, tool consumption, and overhead
- NOT for finding the optimal speed for minimum cost (use mfg-cost-optimize)
- NOT for multi-objective trade-offs (use mfg-multi-optimize)

## How To Use
### Calculate process cost from parameters
```
prism_calc action=process_cost_calc params={
  material: "4140_steel",
  Vc: 200,
  f: 0.15,
  batch_size: 50,
  machine_rate: 85
}
```

### Detailed cost calculation
```
prism_calc action=process_cost_calc params={
  material: "4140_steel",
  Vc: 200,
  f: 0.15,
  ap: 3.0,
  batch_size: 50,
  machine_rate: 85,
  tool_cost_per_edge: 8.50,
  tool_change_time_min: 2.5,
  cutting_length_mm: 150,
  overhead_rate_pct: 35,
  setup_time_min: 30
}
```

## What It Returns
```json
{
  "cost_per_part": 4.28,
  "breakdown": {
    "machining_cost": 2.55,
    "tool_cost": 0.82,
    "tool_change_cost": 0.31,
    "setup_cost_allocated": 0.60,
    "overhead": 1.50
  },
  "time_per_part": {
    "cutting_time_min": 1.80,
    "non_cutting_time_min": 0.40,
    "tool_change_allocated_min": 0.22,
    "total_floor_time_min": 2.42
  },
  "tool_consumption": {
    "tool_life_min": 28.5,
    "parts_per_edge": 15.8,
    "edges_per_batch": 3.2,
    "total_tool_cost_batch": 27.20
  },
  "batch_economics": {
    "total_batch_cost": 214.00,
    "setup_cost": 42.50,
    "production_cost": 171.50,
    "batch_time_hr": 2.52,
    "effective_parts_per_hr": 19.8
  }
}
```

## Examples
### Cost calculation for a 50-part batch of 4140 steel
- Input: `prism_calc action=process_cost_calc params={material: "4140_steel", Vc: 200, f: 0.15, batch_size: 50, machine_rate: 85}`
- Output: $4.28/part with breakdown: $2.55 machining, $0.82 tool, $0.31 tool change, $0.60 setup allocation
- Edge case: Setup cost allocation decreases with larger batches; at batch_size=500 setup cost drops to $0.06/part

### Compare cost at two different speeds
- Input: Run twice with Vc=200 and Vc=300
- Output: Higher speed: lower machining cost but higher tool cost; crossover depends on machine_rate vs tool_cost balance
- Edge case: At very high speeds, tool cost can exceed machining cost, making speed increases counterproductive
