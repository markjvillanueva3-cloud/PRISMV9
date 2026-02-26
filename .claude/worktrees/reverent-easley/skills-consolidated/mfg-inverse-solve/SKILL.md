---
name: Inverse Problem Solver
description: General inverse problem solver — given desired output, find required inputs
---

## When To Use
- You have a target outcome (surface finish, tool life, dimension) and need to find what inputs achieve it
- Traditional "forward" calculations go input-to-output; you need the reverse direction
- Exploring what parameter combinations yield a specific manufacturing result
- The specific inverse tools (surface, tool life, etc.) do not cover your case

## How To Use
```
prism_intelligence action=inverse_solve params={
  target_type: "mrr",
  target_value: 25.0,
  target_unit: "cm3/min",
  constraints: { material: "Ti-6Al-4V", tool_diameter: 12 },
  fixed_params: { depth_of_cut: 2.0 }
}
```

## What It Returns
- Recommended input parameter sets that achieve or approach the target
- Confidence level for each solution
- Sensitivity analysis showing which inputs most affect the target
- Warnings when target is infeasible or near physical limits

## Examples
- Input: `inverse_solve params={ target_type: "power", target_value: 5.0, target_unit: "kW", constraints: { material: "316L" } }`
- Output: Speed/feed/depth combinations that consume approximately 5 kW, ranked by productivity

- Input: `inverse_solve params={ target_type: "mrr", target_value: 50, constraints: { tool_diameter: 20, material: "AL-6061" } }`
- Output: Multiple parameter sets achieving 50 cm3/min MRR with safety margins
