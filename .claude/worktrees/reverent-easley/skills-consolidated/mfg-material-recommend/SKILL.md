---
name: Material Recommender
description: AI-powered material recommendation based on requirements and constraints
---

## When To Use
- When choosing material for a new part design based on requirements
- When a customer asks "what material should I use for X?"
- When optimizing material selection for cost, weight, or machinability
- When finding alternatives to a specified material that is unavailable
- NOT for material property lookup — use mfg-material-lookup for known materials
- NOT for substitution of existing material — use mfg-material-substitute instead

## How To Use
```
prism_intelligence action=material_recommend params={
  application: "hydraulic manifold",
  requirements: {
    tensile_strength_min: 500,
    corrosion_resistance: "moderate",
    machinability: "good",
    operating_temp_max: 150
  },
  constraints: {
    cost: "medium",
    availability: "domestic"
  }
}
```

## What It Returns
- Top 3-5 material recommendations ranked by fit score
- Property match table showing how each meets requirements
- Machinability rating and recommended cutting approach
- Cost comparison (relative $/kg) across options
- Risk flags for any requirements not fully met

## Examples
- Input: `material_recommend params={application: "aerospace bracket", requirements: {strength_to_weight: "high", fatigue: "excellent"}}`
- Output: 1) 7075-T6 (92% fit, best machinability), 2) Ti-6Al-4V (98% fit, 3x cost), 3) 2024-T3 (85% fit, budget option)

- Input: `material_recommend params={application: "food processing shaft", requirements: {corrosion: "excellent", hardness_min: 30}}`
- Output: 1) 316SS (95% fit), 2) 17-4PH H900 (90% fit, higher hardness), 3) Duplex 2205 (88% fit, premium)
