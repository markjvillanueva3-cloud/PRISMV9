---
name: mfg-safe-approach
description: Calculate safe Z approach heights and retract positions for tool entry
---

## When To Use
- When programming initial approach moves for any operation
- When setting clearance planes in CAM software
- After tool changes to determine safe Z positioning
- NOT for lateral (XY) approach strategies (use CAM lead-in settings)

## How To Use
### Calculate Safe Approach
```
prism_safety action=calculate_safe_approach params={
  z_surface: 0,
  tool_length: 80,
  clearance_plane: 5
}
```

### Calculate With Fixture Context
```
prism_safety action=calculate_safe_approach params={
  z_surface: 0,
  tool_length: 80,
  clearance_plane: 5,
  fixture_highest_point: 35,
  tool_change_z: 50,
  holder_length: 40
}
```

## What It Returns
```json
{
  "safe_approach_z": 5.0,
  "retract_z": 5.0,
  "tool_change_z": 50.0,
  "rapid_to_z": 5.0,
  "feed_start_z": 2.0,
  "clearance_above_fixture": 15.0,
  "warnings": [],
  "recommendation": "Rapid to Z5, switch to feed rate at Z2 for approach"
}
```

## Examples
### Standard Milling Approach
- Input: `prism_safety action=calculate_safe_approach params={z_surface: 0, tool_length: 80, clearance_plane: 5}`
- Output: Rapid to Z5, feed from Z2, retract to Z5 between passes. Clearance plane 5mm above part.
- Edge case: If part has bosses or raised features, z_surface should be the highest point on the part, not the datum

### Deep Pocket With Tall Clamps
- Input: `prism_safety action=calculate_safe_approach params={z_surface: 0, tool_length: 60, clearance_plane: 5, fixture_highest_point: 45}`
- Output: Retract Z must clear clamps at Z45. Recommend clearance_plane of 50mm minimum, not 5mm.
- Edge case: Multiple operations at different Z levels in same program need separate clearance calculations
