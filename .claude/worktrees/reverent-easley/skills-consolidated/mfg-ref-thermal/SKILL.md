---
name: mfg-ref-thermal
description: Heat transfer and thermodynamics reference from MIT 16.050 and 8.334
---

# MIT Heat Transfer & Thermodynamics Reference for Machining

## When To Use
- Need thermal analysis fundamentals for cutting zone temperature prediction
- Applying conduction/convection models to tool and workpiece heating
- Designing coolant strategies based on heat transfer coefficients
- Understanding thermal expansion and compensation for dimensional accuracy

## How To Use
```
prism_knowledge action=search params={
  query: "heat transfer conduction convection thermal diffusivity moving heat source",
  registries: ["formulas", "courses"]
}
```

## What It Returns
- Fourier's law and conduction equations mapped to prism_calc thermal
- Convection coefficient models for prism_calc coolant_strategy design
- Moving heat source solutions for prism_calc thermal cutting zone analysis
- Thermal expansion coefficients for prism_calc thermal_compensate corrections

## Key Course Mappings
- **MIT 16.050** (Thermal Energy): Conduction, convection, radiation, fins -> thermal, coolant_strategy
- **MIT 8.334** (Statistical Mechanics): Partition functions, thermal equilibrium -> thermal diffusivity models

## Examples
- **Cutting temperature**: Use 16.050 moving heat source model via prism_calc thermal for tool-chip interface
- **Coolant design**: Apply 16.050 forced convection (Nu/Re/Pr) via prism_calc coolant_strategy for flow rate
- **Thermal compensation**: Use 16.050 linear expansion via prism_calc thermal_compensate for spindle growth
- **Tool coating effect**: Apply 16.050 thermal resistance layers via prism_calc thermal for coated inserts
- **Workpiece distortion**: Use 16.050 transient conduction via prism_calc thermal for thin-wall heating
