---
name: mfg-sfc-optimize
description: Optimize parameters to achieve target surface finish with minimum cost
---

# Surface Finish Optimizer

## When To Use
- Finding optimal feed and stepover to hit a target Ra specification
- Maximizing MRR while staying within a surface finish constraint
- Balancing tool life against surface finish quality
- Optimizing ball nose stepover for target scallop height

## How To Use
```
prism_intelligence action=sfc_optimize params={target_Ra: 0.8, tool_type: "ball_nose", R: 5, constraints: {max_fz: 0.2, max_ae: 1.0}}
```

## What It Returns
- `optimal_params` — recommended feed, stepover, and speed for target finish
- `achieved_Ra` — predicted Ra with optimal parameters
- `mrr` — material removal rate at optimal parameters
- `tool_life_impact` — estimated effect on tool life vs. baseline
- `sensitivity` — which parameter most affects surface finish

## Examples
- `sfc_optimize params={target_Ra: 0.8, tool_type: "ball_nose", R: 5, constraints: {max_fz: 0.2, max_ae: 1.0}}` — optimize for Ra 0.8 target
- `sfc_optimize params={target_Ra: 1.6, tool_type: "turning_insert", nose_radius: 0.8, objective: "max_mrr"}` — maximize MRR for Ra 1.6
- `sfc_optimize params={target_Ra: 0.4, tool_type: "end_mill", diameter: 10, material: "hardened_steel"}` — fine finish optimization
