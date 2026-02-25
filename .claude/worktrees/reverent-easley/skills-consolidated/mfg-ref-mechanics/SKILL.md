---
name: mfg-ref-mechanics
description: Mechanics and dynamics reference from MIT 2.001, 2.003, 2.032 for machining applications
---

# MIT Mechanics & Dynamics Reference

## When To Use
- Need beam deflection theory for tool or workpiece stiffness analysis
- Applying vibration and modal analysis to chatter prediction
- Connecting dynamics fundamentals to machining force models
- Understanding natural frequency, damping, forced response in cutting

## How To Use
```
prism_knowledge action=search params={
  query: "beam deflection vibration natural frequency dynamics",
  registries: ["formulas", "courses"]
}
```

## What It Returns
- Euler-Bernoulli beam equations mapped to prism_calc deflection
- Natural frequency formulas mapped to prism_calc stability
- Forced vibration response linked to prism_calc chatter_predict
- Modal analysis concepts for prism_calc cutting_force dynamic components

## Key Course Mappings
- **MIT 2.001** (Mechanics & Materials): Stress, strain, beam bending -> deflection, tool_stress
- **MIT 2.003** (Dynamics & Control I): Free/forced vibration -> stability, chatter_predict
- **MIT 2.032** (Dynamics): Lagrangian mechanics, multi-DOF -> advanced stability lobes

## Examples
- **Tool deflection**: Use Euler-Bernoulli cantilever model with prism_calc deflection for end-mill stiffness
- **Chatter onset**: Apply single-DOF forced vibration from 2.003 via prism_calc stability with lobes
- **Workpiece dynamics**: Multi-DOF modal from 2.032 for thin-wall machining via prism_calc chatter_predict
- **Cutting force decomposition**: Newton-Euler from 2.001 feeds prism_calc cutting_force components
