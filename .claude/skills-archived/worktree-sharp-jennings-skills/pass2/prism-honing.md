---
name: prism-honing
description: 'Honing guide. Use when the user needs bore honing parameters, crosshatch angle selection, stone/diamond specification, or plateau honing for cylinder bores.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M112
  process: honing
---

# Bore Honing

## When to Use
- Bore honing for size, roundness, and surface finish
- Crosshatch angle specification for oil retention
- Stone/diamond selection for specific materials
- Plateau honing for automotive cylinder bores

## How It Works
1. Define bore specifications (diameter, tolerance, roundness, finish)
2. Calculate stroke parameters (speed, expansion rate, overrun)
3. Select abrasive via `prism_data→tool_search` (stone grade, diamond size)
4. Configure crosshatch angle (typically 22-32° included per side)
5. Plan multi-stage sequence (rough, semi-finish, finish, plateau)

## Returns
- Stone/diamond specification (grit, bond, concentration)
- Stroke parameters (RPM, stroke rate, overrun, expansion pressure)
- Crosshatch angle achievable with given parameters
- Expected roundness, cylindricity, and surface finish (Rk, Rpk, Rvk for plateau)

## Example
**Input:** "Hone cylinder bore 86.000 +0.012/-0.000 mm, crosshatch 45° included, Ra 0.4μm"
**Output:** 3-stage: (1) Rough — 150-grit CBN, 200 RPM, 40 strokes/min, expand 0.005mm/stroke, remove 0.08mm stock. (2) Semi-finish — 280-grit diamond, 180 RPM, 35 str/min, remove 0.02mm. (3) Finish — 500-grit diamond, 150 RPM, 30 str/min, remove 0.005mm. Crosshatch: 22.5° per side (45° included) via RPM/stroke ratio. Expected: roundness 2μm, cylindricity 4μm, Ra 0.35μm. Cycle: 45 seconds total.
