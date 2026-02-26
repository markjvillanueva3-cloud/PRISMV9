---
name: mfg-sfc-compare
description: Compare surface finish across different parameter sets or processes
---

# Surface Finish Comparator

## When To Use
- Comparing surface finish between two or more parameter combinations
- Evaluating grinding vs. hard turning vs. milling for a finish requirement
- Benchmarking actual measured finish against theoretical predictions
- Selecting the most cost-effective process to meet a surface spec

## How To Use
```
prism_intelligence action=sfc_compare params={scenarios: [{tool_type: "ball_nose", R: 5, fz: 0.1, ae: 0.5}, {tool_type: "ball_nose", R: 8, fz: 0.08, ae: 0.3}]}
```

## What It Returns
- `comparison_table` — side-by-side Ra, Rz, Rt for each scenario
- `best_finish` — which scenario achieves the best surface finish
- `best_productivity` — which scenario has highest MRR while meeting finish
- `delta` — percentage difference between scenarios
- `recommendation` — suggested best scenario with reasoning

## Examples
- `sfc_compare params={scenarios: [{R: 5, fz: 0.1, ae: 0.5}, {R: 8, fz: 0.08, ae: 0.3}]}` — compare two ball nose setups
- `sfc_compare params={scenarios: [{process: "hard_turning", Ra: 0.4}, {process: "grinding", Ra: 0.2}], criteria: "cost"}` — compare processes by cost
- `sfc_compare params={predicted_Ra: 0.8, measured_Ra: 1.2, material: "316L"}` — compare predicted vs. actual finish
