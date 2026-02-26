---
name: mfg-5axis-clearance
description: Check spindle head clearance for 5-axis machines at various tilt and rotation angles
---

## When To Use
- When programming 5-axis simultaneous or 3+2 positional machining
- Before running a 5-axis program to verify head clearance at all orientations
- When setting up tall workpieces on 5-axis machines
- NOT for 3-axis machines (use mfg-fixture-clearance or mfg-collision-check)

## How To Use
### Check 5-Axis Head Clearance
```
prism_safety action=check_5axis_head_clearance params={
  head_type: "fork",
  tilt_angle: 30,
  rotation: 45,
  workpiece_height: 100
}
```

### Check With Full Context
```
prism_safety action=check_5axis_head_clearance params={
  head_type: "swivel",
  tilt_angle: 45,
  rotation: 90,
  workpiece_height: 150,
  workpiece_width: 200,
  workpiece_length: 300,
  table_diameter: 500,
  fixture_height: 50
}
```

## What It Returns
```json
{
  "head_clearance_mm": 42.5,
  "collision_free": true,
  "rotation_limits": {
    "a_min": -120,
    "a_max": 120,
    "c_min": -360,
    "c_max": 360
  },
  "restricted_zones": [
    {
      "a_range": [85, 95],
      "c_range": [170, 190],
      "reason": "Head housing contacts workpiece corner"
    }
  ],
  "max_safe_tilt": 78.5,
  "recommendation": "Clear at A30 C45. Restricted zone near A90 C180 -- avoid or use B-axis approach"
}
```

## Examples
### Fork Head on Tall Part
- Input: `prism_safety action=check_5axis_head_clearance params={head_type: "fork", tilt_angle: 30, rotation: 45, workpiece_height: 100}`
- Output: Clear at A30 C45 with 42.5mm clearance. Max safe tilt is 78.5 degrees for this part height.
- Edge case: Fork heads have asymmetric envelopes -- clearance differs depending on C-axis orientation relative to fork arms

### Swivel Head Near Table Edge
- Input: `prism_safety action=check_5axis_head_clearance params={head_type: "swivel", tilt_angle: 60, rotation: 0, workpiece_height: 200, table_diameter: 500}`
- Output: WARNING -- at A60, head housing passes 8mm from table edge when machining at part perimeter. Restrict XY travel at high tilt angles.
- Edge case: Table rotation (C-axis) can move workpiece corners into head path at positions that seem safe at C0
