---
name: Inverse Surface Finish Solver
description: Given Ra target, find required speed, feed, and nose radius to achieve it
---

## When To Use
- A drawing specifies a surface finish (Ra, Rz, Rt) and you need cutting parameters to hit it
- Current surface finish is out of spec and you need to know what to change
- Comparing how different nose radii affect achievable surface finish
- Planning finish passes where surface quality is the primary constraint

## How To Use
```
prism_intelligence action=inverse_surface params={
  target_ra: 0.8,
  material: "4140",
  operation: "turning",
  tool_nose_radius: 0.4,
  constraints: { max_speed: 300, min_feed: 0.05 }
}
```

## What It Returns
- Feed rate and speed combinations that achieve the target Ra
- Theoretical vs expected actual Ra (accounting for material and vibration factors)
- Nose radius recommendations if current geometry cannot achieve the target
- Warning flags when target requires unusual or risky parameters

## Examples
- Input: `inverse_surface params={ target_ra: 1.6, material: "316L", operation: "turning", tool_nose_radius: 0.8 }`
- Output: Feed 0.12-0.18 mm/rev at 180-220 m/min yields Ra 1.4-1.8 um with 0.8mm nose radius

- Input: `inverse_surface params={ target_ra: 0.4, material: "AL-6061", operation: "facing" }`
- Output: Requires nose radius >= 0.8mm, feed <= 0.08 mm/rev; wiper insert recommended
