---
name: mfg-deflection
description: Calculate tool deflection and stiffness from cutting force, tool geometry, and overhang
---

## When To Use
- User asks about tool bending, deflection, or dimensional accuracy from tool flex
- Evaluating if a long tool can hold tolerance for a pocket or wall
- Comparing solid carbide vs indexable for rigidity
- NOT for chatter/vibration (use mfg-chatter-predict)
- NOT for workpiece deflection from clamping (use prism_safety calculate_part_deflection)

## How To Use
### Calculate Tool Deflection
```
prism_calc action=deflection params={
  tool_diameter: 10,
  overhang: 50,
  Fc: 500,
  tool_material: "carbide"
}
```

### With Detailed Geometry
```
prism_calc action=deflection params={
  tool_diameter: 6,
  shank_diameter: 6,
  overhang: 45,
  Fc: 300,
  tool_material: "carbide",
  holder_type: "shrink_fit"
}
```

## What It Returns
```json
{
  "deflection_mm": 0.032,
  "stiffness_N_mm": 15625,
  "tool_E_GPa": 620,
  "moment_of_inertia_mm4": 490.87,
  "L_over_D": 5.0,
  "model": "cantilever_beam",
  "tolerance_achievable_mm": 0.064,
  "recommendation": "Deflection is 0.032mm — acceptable for +/-0.05mm tolerance",
  "warnings": []
}
```

## Examples
### 10mm Carbide Endmill at 50mm Overhang
- Input: `prism_calc action=deflection params={tool_diameter: 10, overhang: 50, Fc: 500, tool_material: "carbide"}`
- Output: 0.032mm deflection, stiffness=15625 N/mm, L/D=5.0
- Edge case: Deflection scales with L^3 — reducing overhang by 20% cuts deflection by ~50%

### Long-Reach 6mm Tool for Deep Pocket
- Input: `prism_calc action=deflection params={tool_diameter: 6, overhang: 45, Fc: 200, tool_material: "carbide"}`
- Output: 0.089mm deflection at L/D=7.5 — likely too much for tight tolerances
- Edge case: Tapered neck tools reduce deflection 30-40% vs straight shank at same reach
