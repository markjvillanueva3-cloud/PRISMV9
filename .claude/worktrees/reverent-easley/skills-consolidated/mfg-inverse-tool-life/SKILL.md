---
name: Inverse Tool Life Solver
description: Given target tool life in minutes, find maximum allowable speed and feed
---

## When To Use
- You need a tool to last a specific number of minutes or parts before replacement
- Balancing productivity against tooling cost by targeting a specific tool life
- Setting up unattended or lights-out machining where tool must survive the full run
- Determining if a tool life target is realistic for a given material

## How To Use
```
prism_intelligence action=inverse_tool_life params={
  target_life_minutes: 45,
  material: "Ti-6Al-4V",
  tool_material: "carbide",
  tool_coating: "AlTiN",
  operation: "milling",
  depth_of_cut: 2.0
}
```

## What It Returns
- Maximum speed and feed that achieve the target tool life
- Taylor equation parameters used in the calculation
- Trade-off curve showing life vs productivity near the solution
- Confidence band accounting for material variability

## Examples
- Input: `inverse_tool_life params={ target_life_minutes: 60, material: "4140", tool_material: "carbide", operation: "turning" }`
- Output: Max speed 220 m/min at feed 0.25 mm/rev; exceeding 240 m/min drops life below 45 min

- Input: `inverse_tool_life params={ target_life_minutes: 15, material: "Inconel-718", tool_coating: "TiAlN" }`
- Output: Speed limited to 45 m/min, feed 0.15 mm/rev; 15 min target is aggressive for this material
