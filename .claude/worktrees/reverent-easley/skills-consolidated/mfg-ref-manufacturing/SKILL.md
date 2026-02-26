---
name: mfg-ref-manufacturing
description: Core manufacturing processes reference from MIT 2.810, 2.852, 2.854
---

# MIT Manufacturing Processes & Systems Reference

## When To Use
- Need chip formation theory and cutting mechanics fundamentals
- Applying tool wear models (Taylor, Kienzle) to process planning
- Designing production flow, scheduling, or lean manufacturing systems
- Understanding MRR-surface finish-tool life tradeoffs

## How To Use
```
prism_knowledge action=search params={
  query: "chip formation tool wear production scheduling lean manufacturing",
  registries: ["formulas", "courses", "materials"]
}
```

## What It Returns
- Merchant circle force model mapped to prism_calc cutting_force
- Taylor tool life equation mapped to prism_calc tool_life
- Kienzle specific cutting force mapped to prism_calc speed_feed
- Production scheduling theory mapped to prism_intelligence shop_schedule

## Key Course Mappings
- **MIT 2.810** (Mfg Processes): Chip formation, cutting forces, tool wear -> cutting_force, tool_life, speed_feed
- **MIT 2.852** (Mfg Systems): Process chains, factory physics -> shop_schedule, cycle_time_estimate
- **MIT 2.854** (Production Systems): Lean, scheduling, WIP control -> machine_utilization, shop_schedule

## Examples
- **Process planning**: Use 2.810 Merchant model via prism_calc cutting_force for force prediction
- **Tool life estimation**: Apply Taylor equation from 2.810 via prism_calc tool_life for insert changes
- **Line balancing**: Use 2.854 scheduling theory via prism_intelligence shop_schedule for cell design
- **MRR optimization**: Connect 2.810 tradeoffs through prism_calc mrr and prism_calc cost_optimize
