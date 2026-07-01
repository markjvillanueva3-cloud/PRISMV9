---
name: prism-broaching
description: 'Broaching guide. Use when the user needs broach design parameters, TPI calculations, surface broaching setup, or keyway/spline broaching parameters.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M111
  process: broaching
---

# Broaching

## When to Use
- Keyway and spline broaching parameter selection
- Broach design: tooth geometry, pitch, rise per tooth (RPT)
- Surface broaching for slots and flat surfaces
- Estimating broaching force and machine tonnage requirements

## How It Works
1. Define feature geometry (keyway width/depth, spline specs, slot dims)
2. Calculate broach design via `prism_calc→broach_design`
3. Estimate force: F = RPT × width × specific cutting force × simultaneous teeth
4. Verify machine capacity (tonnage, stroke length)
5. Select coolant and speed for material

## Returns
- Broach specification (pitch, RPT, tooth geometry, length)
- Force calculation and machine tonnage requirement
- Speed and coolant recommendation
- Expected surface finish and dimensional capability

## Example
**Input:** "Broach 8mm keyway, 30mm deep, in 4340 steel (HRC 28)"
**Output:** Broach: 8mm keyway, HSS, 25 roughing teeth (RPT 0.06mm), 5 semi-finish (RPT 0.025mm), 3 finish (0.01mm). Pitch: 12mm (√(30×6)). Simultaneous teeth: 3. Force: 0.06 × 8 × 2800 × 3 = 4,032N (0.9 tons). Speed: 6 m/min. Coolant: sulfurized cutting oil. Surface finish: Ra 0.8 μm. Cycle: 8 seconds/part. Machine: 5-ton vertical broach minimum.
