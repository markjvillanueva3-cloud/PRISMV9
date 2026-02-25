---
name: mfg-toolpath-params
description: Calculate detailed machining parameters for a selected toolpath strategy
---

## When To Use
- Already selected a strategy and need specific stepover, DOC, feed, and entry method
- Fine-tuning parameters for a known toolpath approach
- Generating CAM-ready parameter values for adaptive, trochoidal, HSM, or other strategies
- NOT for choosing which strategy to use (use mfg-strategy-select)
- NOT for basic speed and feed calculation (use mfg-speed-feed)

## How To Use
### Adaptive Clearing Parameters
```
prism_toolpath action=params_calculate params={
  strategy: "adaptive_clearing",
  material: "4140_steel",
  tool_diameter: 12
}
```

### Trochoidal Slotting Parameters
```
prism_toolpath action=params_calculate params={
  strategy: "trochoidal",
  material: "inconel_718",
  tool_diameter: 10,
  slot_width: 14
}
```

### Finish Contour Parameters
```
prism_toolpath action=params_calculate params={
  strategy: "finish_contour",
  material: "aluminum_6061",
  tool_diameter: 8,
  target_surface_finish_Ra: 0.8
}
```

## What It Returns
```json
{
  "strategy": "adaptive_clearing",
  "material": "4140_steel",
  "tool_diameter_mm": 12,
  "parameters": {
    "stepover_mm": 1.8,
    "stepover_percent": 15,
    "doc_mm": 18.0,
    "doc_ratio": 1.5,
    "entry_method": "helical_ramp",
    "ramp_angle_deg": 3.0,
    "corner_rounding_mm": 0.5,
    "min_engagement_angle_deg": 30,
    "max_engagement_angle_deg": 90,
    "feed_mm_min": 2400,
    "speed_rpm": 3180,
    "plunge_feed_mm_min": 800
  },
  "notes": "15% stepover maintains constant engagement in 4140 steel with 12mm endmill"
}
```

## Examples
### Adaptive Clearing in Steel
- Input: `prism_toolpath action=params_calculate params={strategy: "adaptive_clearing", material: "4140_steel", tool_diameter: 12}`
- Output: 15% stepover (1.8mm), 1.5xD DOC (18mm), helical ramp entry at 3 degrees
- Edge case: Increase stepover to 20% for roughing-only operations where tool life is secondary

### Trochoidal in Superalloy
- Input: `prism_toolpath action=params_calculate params={strategy: "trochoidal", material: "inconel_718", tool_diameter: 10, slot_width: 14}`
- Output: 8% stepover, 1.0xD DOC, 60-degree max engagement, arc radius 5.6mm
- Edge case: In Inconel, reduce engagement angle to 45 degrees max if chatter appears

### Finish Contour for Surface Quality
- Input: `prism_toolpath action=params_calculate params={strategy: "finish_contour", material: "aluminum_6061", tool_diameter: 8, target_surface_finish_Ra: 0.8}`
- Output: 0.3mm stepover, 0.5mm DOC, climb only, spring pass enabled
- Edge case: Ra below 0.4 um requires ballnose or bull-nose with very fine stepover
