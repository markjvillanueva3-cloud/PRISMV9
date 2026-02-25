---
name: mfg-collision-check
description: Check toolpath for collisions against workpiece, fixtures, and machine envelope
---

## When To Use
- Before running any new CNC program for the first time
- After CAM post-processing to verify toolpath safety
- When fixtures or workholding change on an existing program
- NOT for real-time collision avoidance during machining (use machine controller)

## How To Use
### Check Toolpath Collision
```
prism_safety action=check_toolpath_collision params={
  toolpath: [
    {type: "rapid", from: {x: 0, y: 0, z: 50}, to: {x: 100, y: 50, z: 50}},
    {type: "linear", from: {x: 100, y: 50, z: 50}, to: {x: 100, y: 50, z: -5}},
    {type: "linear", from: {x: 100, y: 50, z: -5}, to: {x: 0, y: 50, z: -5}}
  ],
  workpiece_bounds: {x_min: 0, x_max: 150, y_min: 0, y_max: 100, z_min: -25, z_max: 0},
  fixture_model: "vise_6in"
}
```

### Check With Tool Assembly
```
prism_safety action=check_toolpath_collision params={
  toolpath: [{type: "linear", from: {x: 50, y: 25, z: 5}, to: {x: 50, y: 25, z: -30}}],
  workpiece_bounds: {x_min: 0, x_max: 100, y_min: 0, y_max: 50, z_min: -25, z_max: 0},
  fixture_model: "vise_6in",
  tool_assembly: {diameter: 20, flute_length: 40, overall_length: 80, holder_diameter: 40}
}
```

## What It Returns
```json
{
  "collision_detected": true,
  "collision_points": [
    {
      "segment_index": 1,
      "collision_type": "fixture",
      "point": {"x": 100, "y": 50, "z": -5},
      "severity": "critical",
      "penetration_mm": 3.2,
      "colliding_body": "vise_jaw_fixed"
    }
  ],
  "safe_segments": [0, 2],
  "affected_segments": [1],
  "total_segments": 3,
  "recommendation": "Raise approach height or reposition part in vise"
}
```

## Examples
### Roughing Pass Near Vise Jaws
- Input: `prism_safety action=check_toolpath_collision params={toolpath: [{type: "linear", from: {x: -5, y: 0, z: -10}, to: {x: 160, y: 0, z: -10}}], workpiece_bounds: {x_min: 0, x_max: 150, y_min: 0, y_max: 100, z_min: -25, z_max: 0}, fixture_model: "vise_6in"}`
- Output: Collision at x=-5 with fixed jaw and x=155 with movable jaw, severity critical
- Edge case: Tool holder collision above part surface even when cutter clears -- check tool_assembly parameter

### 5-Axis Simultaneous Toolpath
- Input: `prism_safety action=check_toolpath_collision params={toolpath: [{type: "5axis", from: {x: 50, y: 50, z: 10, a: 0, c: 0}, to: {x: 50, y: 50, z: 10, a: 30, c: 45}}], workpiece_bounds: {x_min: 0, x_max: 100, y_min: 0, y_max: 100, z_min: -50, z_max: 0}, fixture_model: "5axis_tombstone"}`
- Output: Head clearance warning at A30 C45, minimum clearance 4.2mm to tombstone face
- Edge case: Rotary axis wrapping (C=359 to C=1) can cause unexpected full rotation through obstacles
