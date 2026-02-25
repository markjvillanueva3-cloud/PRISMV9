---
name: mfg-ref-materials
description: Materials science reference from MIT 3.11, 3.22, 3.21 for machinability
---

# MIT Materials Science Reference for Machining

## When To Use
- Need stress-strain behavior for cutting force prediction
- Applying strain hardening and flow stress models to chip formation
- Selecting materials based on machinability, hardness, thermal properties
- Understanding fracture mechanics for tool breakage or chip segmentation

## How To Use
```
prism_knowledge action=search params={
  query: "stress strain hardening flow stress machinability fracture",
  registries: ["formulas", "materials", "courses"]
}
```

## What It Returns
- Johnson-Cook constitutive model mapped to prism_calc flow_stress
- Material property lookups mapped to prism_data material_get
- Comparative machinability ratings via prism_data material_compare
- Strain-rate sensitivity data for high-speed machining analysis

## Key Course Mappings
- **MIT 3.11** (Mechanics of Materials): Stress-strain, yield criteria -> flow_stress, cutting_force
- **MIT 3.22** (Mechanical Behavior): Plastic deformation, creep, fatigue -> wear_prediction, tool_life
- **MIT 3.21** (Kinetics of Materials): Diffusion, phase transformations -> thermal, tool wear mechanisms

## Examples
- **Flow stress modeling**: Use J-C model from 3.22 via prism_calc flow_stress for Ti-6Al-4V
- **Material selection**: Apply 3.11 property charts via prism_data material_compare for alloy tradeoffs
- **Tool wear mechanisms**: Connect 3.21 diffusion theory to prism_calc wear_prediction at high temps
- **Chip segmentation**: Use 3.22 adiabatic shear band theory with prism_calc cutting_force for hard metals
