---
name: mfg-formulas-economics
description: Manufacturing economics formulas including cost models, batch sizing, and make/buy analysis
---

# Manufacturing Economics Formulas

## When To Use
- Need cost-per-part calculations with material, machining, tooling breakdown
- Economic batch size and EOQ (economic order quantity) determination
- Make vs buy analysis and tooling ROI calculations
- Learning curve effects on production cost
- NOT for process parameter optimization — use mfg-cost-optimize
- NOT for shop quoting — use mfg-shop-quote

## How To Use
```
prism_calc action=cost_optimize params={
  material_cost: 12.50,
  machine_rate: 45.00,
  cycle_time: 8.5,
  tool_cost_per_edge: 8.00,
  tool_life_minutes: 20,
  batch_size: 500
}
prism_calc action=process_cost_calc params={
  material: "steel_4140",
  cutting_speed: 200,
  feed: 0.25,
  depth: 2.0,
  batch_size: 500
}
```

## What It Returns
- `formulas`: ~20 formulas covering cost models, EOQ, learning curve, breakeven
- `cost_per_part`: Total = material + machining_time*rate + tooling + overhead
- `economic_speed`: Cutting speed that minimizes cost per part
- `eoq`: Economic order quantity = sqrt(2*D*S / H)
- `learning_curve`: Unit cost at Nth unit = C1 * N^(ln(r)/ln(2))

## Examples
- **Cost at 500 qty**: $12.50 material + $6.38 machining + $3.40 tooling + $4.50 overhead = $26.78/part
- **Economic tool change**: At $45/hr, $8/edge, 2min change gives Topt=18 min
- **EOQ**: Demand=1000/yr, setup=$200, holding=$5/yr gives EOQ=283 parts
- **Learning curve**: 85% curve, first unit 10hr, 100th unit = 10 * 100^(-0.234) = 3.4hr
