---
name: mfg-fixture-clearance
description: Check tool clearance against fixture components (vise jaws, clamps, parallels)
---

## When To Use
- When selecting tools for a setup with known fixture geometry
- Before programming Z-depth passes near vise jaws or clamps
- When thin-wall machining close to fixture elements
- NOT for full toolpath simulation (use mfg-collision-check)

## How To Use
### Check Fixture Clearance
```
prism_safety action=check_fixture_clearance params={
  tool_diameter: 50,
  tool_length: 100,
  fixture_type: "vise",
  jaw_height: 40
}
```

### Check With Specific Geometry
```
prism_safety action=check_fixture_clearance params={
  tool_diameter: 25,
  tool_length: 75,
  fixture_type: "clamp",
  clamp_height: 30,
  clamp_overhang: 15,
  part_stickup: 25
}
```

## What It Returns
```json
{
  "clearance_mm": 60.0,
  "collision_risk": "low",
  "tool_reach_below_jaw": 60.0,
  "holder_clearance_mm": 35.0,
  "max_safe_depth": -60.0,
  "warnings": [],
  "recommendation": "Tool clears fixture. Max depth 60mm below jaw top."
}
```

## Examples
### Face Mill Near Vise Jaws
- Input: `prism_safety action=check_fixture_clearance params={tool_diameter: 50, tool_length: 40, fixture_type: "vise", jaw_height: 40}`
- Output: clearance_mm: 0, collision_risk: critical -- 50mm face mill cannot clear 40mm jaws with only 40mm tool length. Holder will collide.
- Edge case: Face mill inserts extend below holder face -- actual cutting depth may be less than flute length

### Long Reach Endmill in Deep Pocket
- Input: `prism_safety action=check_fixture_clearance params={tool_diameter: 10, tool_length: 80, fixture_type: "vise", jaw_height: 30}`
- Output: clearance_mm: 50, collision_risk: low, tool reaches 50mm below jaw top. Check deflection at full extension.
- Edge case: Tool deflection at long overhang may cause dimensional issues before collision becomes a concern
