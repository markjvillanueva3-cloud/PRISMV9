---
name: mfg-sfc-calculate
description: Calculate achievable surface finish from process parameters using multiple models
---

# Surface Finish Calculator

## When To Use
- Calculating theoretical Ra/Rz from feed, nose radius, and tool geometry
- Comparing predicted surface finish across different parameter sets
- Validating whether a process can meet a drawing surface finish requirement
- Selecting between ball nose, insert nose radius, and end mill models

## How To Use
```
prism_intelligence action=sfc_calculate params={tool_type: "ball_nose", R: 5, fz: 0.1, ae: 0.5}
```

## What It Returns
- `Ra` — arithmetic mean roughness in micrometers
- `Rz` — mean peak-to-valley roughness in micrometers
- `Rt` — maximum peak-to-valley height
- `model_used` — which surface finish model was applied (kinematic, empirical, ball_nose)
- `scallop_height` — cusp height for ball nose or stepover calculations

## Examples
- `sfc_calculate params={tool_type: "ball_nose", R: 5, fz: 0.1, ae: 0.5}` — ball nose finish with 5mm radius, 0.1mm feed, 0.5mm stepover
- `sfc_calculate params={tool_type: "turning_insert", nose_radius: 0.8, feed: 0.15}` — turning finish from insert geometry
- `sfc_calculate params={tool_type: "end_mill", diameter: 10, fz: 0.05, flutes: 4, runout: 0.005}` — milling finish including runout effect
