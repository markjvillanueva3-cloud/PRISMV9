---
name: mfg-param-optimize
description: Optimize cutting parameters and operation sequence for a given objective — max MRR, min cost, min time (MIT 6.231 DP)
---

## When To Use
- Need optimal Vc, feed, DOC for a specific material/tool/machine combination
- Want to optimize the sequence of operations to minimize total cycle time
- Applying dynamic programming to find globally optimal multi-pass strategies
- Tuning parameters for a specific objective (max MRR, min cost, best finish)
- NOT for simple speed/feed lookup (use mfg-speed-feed)
- NOT for multi-objective Pareto analysis (use mfg-multi-optimize)

## How To Use
### Optimize parameters for a single operation
```
prism_calc action=optimize_parameters params={
  material: "4140_steel",
  tool: "CNMG120408",
  machine: "haas_vf2",
  objective: "max_mrr"
}
```

### Optimize operation sequence
```
prism_calc action=optimize_sequence params={
  operations: [
    {type: "rough_turn", stock_mm: 5, length_mm: 100},
    {type: "finish_turn", target_Ra_um: 1.6, length_mm: 100},
    {type: "groove", width_mm: 3, depth_mm: 8},
    {type: "thread", pitch_mm: 1.5, length_mm: 25}
  ],
  material: "4140_steel",
  machine: "haas_st20",
  objective: "min_cycle_time"
}
```

## What It Returns
```json
{
  "optimized_parameters": {
    "Vc_m_min": 310,
    "f_mm_rev": 0.35,
    "ap_mm": 3.5,
    "ae_mm": null,
    "objective_value": {
      "MRR_cm3_min": 68.2,
      "unit": "cm3/min"
    }
  },
  "constraints_checked": {
    "spindle_power": {"required_kW": 14.8, "available_kW": 22.4, "status": "OK"},
    "spindle_torque": {"required_Nm": 85, "available_Nm": 122, "status": "OK"},
    "tool_deflection": {"value_mm": 0.02, "limit_mm": 0.05, "status": "OK"},
    "surface_finish": {"estimated_Ra_um": 2.8, "limit_um": null, "status": "unconstrained"}
  },
  "optimal_sequence": [
    {"step": 1, "operation": "rough_turn", "passes": 2, "ap_mm": [3.5, 1.5], "time_min": 1.8},
    {"step": 2, "operation": "groove", "plunges": 3, "time_min": 0.6},
    {"step": 3, "operation": "finish_turn", "passes": 1, "ap_mm": 0.3, "time_min": 2.1},
    {"step": 4, "operation": "thread", "passes": 6, "time_min": 0.8}
  ],
  "total_optimized_time_min": 5.3,
  "improvement_vs_default_pct": 22
}
```

## Examples
### Maximize MRR for turning 4140 on Haas VF-2
- Input: `prism_calc action=optimize_parameters params={material: "4140_steel", tool: "CNMG120408", machine: "haas_vf2", objective: "max_mrr"}`
- Output: Vc=310, f=0.35, ap=3.5, MRR=68.2 cm3/min, all constraints satisfied, 22% improvement over defaults
- Edge case: Machine power limit is the binding constraint at high MRR; optimizer backs off Vc to stay within power

### Optimize turning sequence with DP
- Input: `prism_calc action=optimize_sequence params={operations: [...4 ops...], material: "4140_steel", machine: "haas_st20", objective: "min_cycle_time"}`
- Output: Optimal sequence puts grooving before finishing (avoids re-fixturing), DP finds 2-pass roughing strategy
- Edge case: Threading must always be last in sequence; optimizer respects hard sequencing constraints
