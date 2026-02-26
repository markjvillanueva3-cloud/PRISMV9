---
name: mfg-near-miss
description: Detect near-miss events in toolpath where tool passes dangerously close to obstacles
---

## When To Use
- After collision check passes but you want proactive safety margins
- When optimizing toolpaths to find tight clearance areas
- For setup sheet documentation of risky areas in a program
- NOT for collision detection (use mfg-collision-check first)

## How To Use
### Detect Near Miss Events
```
prism_safety action=detect_near_miss params={
  toolpath: [
    {type: "rapid", from: {x: 0, y: 0, z: 50}, to: {x: 100, y: 50, z: 50}},
    {type: "linear", from: {x: 100, y: 50, z: 5}, to: {x: 100, y: 50, z: -20}},
    {type: "linear", from: {x: 100, y: 50, z: -20}, to: {x: 5, y: 50, z: -20}}
  ],
  threshold_mm: 2.0
}
```

### Detect With Tool Assembly
```
prism_safety action=detect_near_miss params={
  toolpath: [{type: "linear", from: {x: 50, y: 2, z: -10}, to: {x: 50, y: 98, z: -10}}],
  threshold_mm: 3.0,
  tool_assembly: {diameter: 20, holder_diameter: 40, stickout: 60},
  fixture_model: "vise_6in"
}
```

## What It Returns
```json
{
  "near_miss_count": 2,
  "events": [
    {
      "segment_index": 2,
      "min_clearance_mm": 1.2,
      "closest_body": "vise_jaw_fixed",
      "location": {"x": 5, "y": 50, "z": -20},
      "severity": "warning",
      "recommendation": "Increase clearance at X5 -- tool passes 1.2mm from fixed jaw"
    },
    {
      "segment_index": 1,
      "min_clearance_mm": 1.8,
      "closest_body": "clamp_top",
      "location": {"x": 100, "y": 50, "z": 5},
      "severity": "caution"
    }
  ],
  "min_overall_clearance_mm": 1.2,
  "threshold_mm": 2.0
}
```

## Examples
### Roughing Near Jaw Edge
- Input: `prism_safety action=detect_near_miss params={toolpath: [{type: "linear", from: {x: 1, y: 0, z: -15}, to: {x: 1, y: 100, z: -15}}], threshold_mm: 2.0}`
- Output: Near miss at X1 -- tool edge passes 1.0mm from vise jaw (assuming 0mm jaw face at X0)
- Edge case: Thermal expansion of workpiece during machining can reduce clearance by 0.1-0.3mm on aluminum

### Holder Near Part Feature
- Input: `prism_safety action=detect_near_miss params={toolpath: [{type: "linear", from: {x: 50, y: 50, z: -45}, to: {x: 50, y: 50, z: -50}}], threshold_mm: 5.0, tool_assembly: {diameter: 10, holder_diameter: 32, stickout: 55}}`
- Output: Holder passes 3mm from part wall at Z-45 where pocket narrows. Tool tip clears but holder does not.
- Edge case: Collet nut diameter often exceeds holder body -- check collet nut clearance separately
