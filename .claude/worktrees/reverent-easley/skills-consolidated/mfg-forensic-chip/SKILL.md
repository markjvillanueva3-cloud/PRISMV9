---
name: Chip Morphology Analysis
description: Identify chip type and what it reveals about cutting conditions
---

## When To Use
- Evaluating chip form to assess whether cutting parameters are correct
- Troubleshooting poor chip evacuation or bird-nesting
- Validating that a new setup is producing acceptable chip shapes
- Using chip appearance as a diagnostic indicator of cutting conditions

## How To Use
```
prism_intelligence action=forensic_chip_analysis params={
  chip_description: "long continuous ribbon chips, blue-gold color, slight curl",
  material: "4140",
  operation: "turning",
  cutting_params: { speed: 200, feed: 0.15, depth: 2.0 },
  tool_geometry: { nose_radius: 0.8, chipbreaker: "none" }
}
```

## What It Returns
- Classified chip type (continuous, segmented, discontinuous, built-up edge)
- Assessment of chip formation quality (acceptable, marginal, problematic)
- What the chip morphology reveals about temperature, strain, and shear conditions
- Recommended changes to improve chip form if needed

## Examples
- Input: `forensic_chip_analysis params={ chip_description: "tight spiral 6-9 type, silver color", material: "AL-6061", operation: "turning" }`
- Output: Ideal chip form (ISO 6-9 spiral); parameters well-optimized for this aluminum alloy

- Input: `forensic_chip_analysis params={ chip_description: "long tangled ribbon wrapping around tool", material: "316L", feed: 0.08 }`
- Output: Continuous ribbon chip indicates feed too low; increase to 0.15+ mm/rev or add chipbreaker
