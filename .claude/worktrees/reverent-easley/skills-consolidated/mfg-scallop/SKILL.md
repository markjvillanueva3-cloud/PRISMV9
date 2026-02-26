---
name: mfg-scallop
description: Calculate scallop height and optimal stepover for 3D surface finishing operations
---

## When To Use
- Need to know the scallop height from a given stepover and tool diameter
- Calculating optimal stepover to achieve a target scallop height
- 3D surface finishing with ball-nose or bull-nose end mills
- NOT for flat surface finish calculation (use mfg-surface-finish)
- NOT for general toolpath strategy selection (use mfg-strategy-select)

## How To Use
### Calculate Scallop Height
```
prism_calc action=scallop params={
  tool_diameter: 10,
  stepover: 2,
  surface_curvature_radius: 50
}
```

### Calculate Stepover for Target Scallop
```
prism_calc action=stepover params={
  target_scallop: 0.005,
  tool_radius: 5,
  surface_curvature_radius: 50
}
```

### Scallop on Concave Surface
```
prism_calc action=scallop params={
  tool_diameter: 6,
  stepover: 1.5,
  surface_curvature_radius: -30
}
```

## What It Returns
```json
{
  "tool_diameter_mm": 10,
  "tool_radius_mm": 5,
  "stepover_mm": 2,
  "surface_curvature_radius_mm": 50,
  "scallop_height_mm": 0.0204,
  "scallop_height_um": 20.4,
  "cusp_width_mm": 2.0,
  "effective_radius_mm": 4.545,
  "surface_type": "convex",
  "Ra_equivalent_um": 5.1,
  "notes": "Convex surface increases effective tool radius, reducing scallop height"
}
```

## Examples
### Convex Surface Finishing
- Input: `prism_calc action=scallop params={tool_diameter: 10, stepover: 2, surface_curvature_radius: 50}`
- Output: 20.4 um scallop height, equivalent to ~Ra 5.1 um before polishing
- Edge case: On steep walls, scallop increases — use 3+2 axis or 5-axis to keep tool normal to surface

### Target Scallop Height for Mold
- Input: `prism_calc action=stepover params={target_scallop: 0.005, tool_radius: 5, surface_curvature_radius: 50}`
- Output: 0.45mm stepover required for 5 um scallop on R50 convex surface
- Edge case: Sub-5 um scallop on complex surfaces may require adaptive stepover (variable across regions)

### Concave Surface (Negative Radius)
- Input: `prism_calc action=scallop params={tool_diameter: 6, stepover: 1.5, surface_curvature_radius: -30}`
- Output: Higher scallop on concave surfaces — tool radius must be less than surface curvature radius
- Edge case: If tool radius exceeds concave curvature, tool gouges the surface — always verify clearance
