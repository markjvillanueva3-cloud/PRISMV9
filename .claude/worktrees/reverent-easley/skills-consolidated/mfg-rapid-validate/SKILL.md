---
name: mfg-rapid-validate
description: Validate G0 rapid moves for safety against machine limits, fixtures, and work offsets
---

## When To Use
- When reviewing G-code before first article run
- After hand-editing G-code with rapid positioning moves
- When changing work offsets or fixture setups on existing programs
- NOT for feed move validation (use mfg-collision-check for full toolpath)

## How To Use
### Validate Rapid Moves
```
prism_safety action=validate_rapid_moves params={
  gcode: "G0 X100 Y50 Z-5\nG0 Z50\nG0 X200 Y150",
  work_offset: "G54",
  machine: "haas_vf2"
}
```

### Validate With Fixture Context
```
prism_safety action=validate_rapid_moves params={
  gcode: "G28 G91 Z0\nG90 G0 X50 Y50\nG43 H01 Z5",
  work_offset: "G54",
  machine: "haas_vf2",
  fixture_height: 75,
  part_height: 50
}
```

## What It Returns
```json
{
  "safe": false,
  "risk_points": [
    {
      "line": 1,
      "gcode": "G0 X100 Y50 Z-5",
      "risk": "rapid_into_material",
      "severity": "critical",
      "detail": "G0 move to Z-5 will rapid into workpiece (top at Z0)",
      "suggestion": "Use G1 for Z approach below clearance plane"
    },
    {
      "line": 3,
      "gcode": "G0 X200 Y150",
      "risk": "exceeds_travel",
      "severity": "warning",
      "detail": "X200 exceeds VF-2 X travel (762mm from G54 origin at X381)"
    }
  ],
  "rapids_checked": 3,
  "safe_rapids": 1,
  "machine_envelope": {"x": [-381, 381], "y": [-254, 254], "z": [-508, 0]}
}
```

## Examples
### Post-Processor Output Check
- Input: `prism_safety action=validate_rapid_moves params={gcode: "G90 G54\nG0 Z50\nG0 X50 Y25\nG0 Z2\nG1 Z-10 F200", work_offset: "G54", machine: "haas_vf2"}`
- Output: All rapids safe -- G0 Z50 (clear), G0 X50 Y25 (within travel), G0 Z2 (above material)
- Edge case: G0 Z2 is safe only if clearance plane is above part top; with tall fixture clamps Z2 may collide

### Dangerous Rapid Down
- Input: `prism_safety action=validate_rapid_moves params={gcode: "G0 X0 Y0 Z-25", work_offset: "G54", machine: "haas_vf2"}`
- Output: CRITICAL -- rapid to Z-25 into material. Never rapid below Z0 (part top) without confirmed clearance
- Edge case: Some shops set Z0 at table, making Z-25 valid -- always verify work offset convention
