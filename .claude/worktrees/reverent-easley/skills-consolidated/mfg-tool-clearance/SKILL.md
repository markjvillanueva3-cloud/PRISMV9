---
name: mfg-tool-clearance
description: Validate tool clearance for specific features (pockets, slots, bores)
---

## When To Use
- When selecting tools for pocket or slot operations
- Before programming narrow features where tool barely fits
- When checking if a tool can reach the bottom of a deep feature
- NOT for fixture clearance (use mfg-fixture-clearance)

## How To Use
### Validate Tool Clearance in Feature
```
prism_safety action=validate_tool_clearance params={
  tool_diameter: 20,
  tool_length: 80,
  pocket_depth: 30,
  pocket_width: 25
}
```

### Validate With Holder Geometry
```
prism_safety action=validate_tool_clearance params={
  tool_diameter: 12,
  tool_length: 50,
  pocket_depth: 45,
  pocket_width: 20,
  holder_diameter: 32,
  corner_radius: 3
}
```

## What It Returns
```json
{
  "clearance_status": "pass",
  "radial_clearance_mm": 2.5,
  "axial_clearance_mm": 50.0,
  "tool_fits_feature": true,
  "holder_interferes": false,
  "max_reachable_depth": 80.0,
  "corner_radius_achievable": true,
  "warnings": ["Radial clearance only 2.5mm -- tool deflection may cause wall contact"],
  "recommendation": "Tool fits but consider smaller diameter for better chip evacuation"
}
```

## Examples
### Tight Slot Machining
- Input: `prism_safety action=validate_tool_clearance params={tool_diameter: 20, tool_length: 80, pocket_depth: 30, pocket_width: 22}`
- Output: Radial clearance 1mm per side. CAUTION -- minimal chip evacuation space, high risk of recutting chips. Use air blast or through-tool coolant.
- Edge case: Tool runout of 0.01-0.03mm effectively reduces clearance -- factor in for very tight fits

### Deep Pocket With Holder Interference
- Input: `prism_safety action=validate_tool_clearance params={tool_diameter: 10, tool_length: 40, pocket_depth: 50, pocket_width: 30, holder_diameter: 32}`
- Output: FAIL -- tool reaches only 40mm deep but pocket is 50mm. Holder (32mm) enters pocket at 40mm depth and collides with 30mm pocket wall.
- Edge case: Shrink-fit holders have smaller diameter than collet chucks -- may gain clearance by changing holder type
