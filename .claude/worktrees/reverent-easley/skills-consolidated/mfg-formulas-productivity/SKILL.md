---
name: mfg-formulas-productivity
description: Metal removal rate, cycle time, and machine utilization formulas
---

# Productivity & MRR Formulas

## When To Use
- Need metal removal rate calculations for roughing/finishing
- Cycle time estimation and breakdown (cutting vs non-cutting)
- Machine utilization and OEE calculations
- Comparing productivity across different strategies or machines
- NOT for cost analysis — use mfg-formulas-economics
- NOT for toolpath strategy selection — use mfg-strategy-select

## How To Use
```
prism_calc action=mrr params={
  depth_of_cut: 3.0,
  width_of_cut: 15.0,
  feed_rate: 5000
}
prism_calc action=cycle_time params={
  operations: ["facing", "roughing", "finishing"],
  material: "aluminum_6061",
  volume_to_remove: 450
}
```

## What It Returns
- `formulas`: ~15 formulas covering MRR, cycle time, OEE, utilization
- `mrr`: MRR = ap * ae * Vf (cm3/min) for milling, MRR = ap * f * Vc for turning
- `cycle_time`: Total = cutting_time + rapid_time + tool_change + setup
- `oee`: OEE = Availability * Performance * Quality (target > 85%)
- `utilization`: Spindle utilization = cutting_time / total_time

## Examples
- **Roughing aluminum**: ap=3, ae=15, Vf=5000 gives MRR=225 cm3/min
- **Cycle time breakdown**: 60% cutting, 15% rapid, 10% tool change, 15% other
- **OEE calculation**: A=0.90, P=0.95, Q=0.99 gives OEE=84.6%
- **Non-cutting reduction**: Optimized rapids and tool changes save 20% cycle time
