---
name: mfg-cycle-time
description: Calculate total cycle time with breakdown by operation including cutting, rapid, and non-productive time (MIT 2.852)
---

## When To Use
- Estimating total machining time for a part with multiple operations
- Breaking down cycle time to identify bottleneck operations
- Quoting lead times or calculating machine utilization for production planning
- Comparing cycle times between different toolpath strategies or parameter sets
- NOT for cost analysis (use mfg-cost-optimize or mfg-process-cost-calc)
- NOT for cutting parameter optimization (use mfg-param-optimize)

## How To Use
### Calculate cycle time for multiple operations
```
prism_calc action=cycle_time params={
  operations: [
    {type: "face_mill", area: 200, mrr: 50},
    {type: "pocket", volume: 100, mrr: 30}
  ]
}
```

### Detailed cycle time with rapids and tool changes
```
prism_calc action=cycle_time params={
  operations: [
    {type: "face_mill", area_cm2: 200, depth_mm: 3, mrr_cm3_min: 50},
    {type: "rough_pocket", volume_cm3: 85, mrr_cm3_min: 30},
    {type: "finish_pocket", area_cm2: 120, doc_mm: 0.5, mrr_cm3_min: 15},
    {type: "drill", holes: 8, depth_mm: 25, feed_mm_min: 200},
    {type: "tap", holes: 8, depth_mm: 20, feed_mm_min: 150}
  ],
  machine: "haas_vf2",
  include_rapids: true,
  include_tool_changes: true
}
```

## What It Returns
```json
{
  "total_cycle_time_min": 12.45,
  "breakdown": [
    {
      "operation": "face_mill",
      "cutting_time_min": 1.20,
      "rapid_time_min": 0.15,
      "subtotal_min": 1.35,
      "pct_of_total": 10.8
    },
    {
      "operation": "rough_pocket",
      "cutting_time_min": 2.83,
      "rapid_time_min": 0.45,
      "subtotal_min": 3.28,
      "pct_of_total": 26.3
    },
    {
      "operation": "finish_pocket",
      "cutting_time_min": 4.00,
      "rapid_time_min": 0.30,
      "subtotal_min": 4.30,
      "pct_of_total": 34.5
    },
    {
      "operation": "drill_8x",
      "cutting_time_min": 1.00,
      "rapid_time_min": 0.20,
      "subtotal_min": 1.20,
      "pct_of_total": 9.6
    },
    {
      "operation": "tap_8x",
      "cutting_time_min": 1.07,
      "rapid_time_min": 0.15,
      "subtotal_min": 1.22,
      "pct_of_total": 9.8
    }
  ],
  "non_cutting_time": {
    "tool_changes": {"count": 4, "time_min": 0.70},
    "rapids_total_min": 1.25,
    "load_unload_min": 0.40
  },
  "bottleneck": "finish_pocket (34.5% of cycle)",
  "cutting_efficiency_pct": 81.1
}
```

## Examples
### Estimate cycle time for a prismatic part
- Input: `prism_calc action=cycle_time params={operations: [{type: "face_mill", area: 200, mrr: 50}, {type: "pocket", volume: 100, mrr: 30}]}`
- Output: Total 12.45 min, bottleneck is finish pocket at 34.5%, 81% cutting efficiency
- Edge case: If MRR is not provided, it is estimated from material and tool defaults (less accurate)

### Identify bottleneck for optimization
- Input: Same as above, review bottleneck field
- Output: "finish_pocket (34.5%)" — suggests focusing optimization effort on finishing parameters
- Edge case: Multiple operations near the same percentage indicate a well-balanced cycle with no single bottleneck
