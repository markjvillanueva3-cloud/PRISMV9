---
name: mfg-chip-evacuation
description: Calculate chip evacuation strategy and peck depth for drilling and deep features
---

## When To Use
- When programming drilling operations deeper than 3xD
- When chips are packing in deep holes or pockets
- When selecting between peck drilling, through-tool coolant, or chip breaker strategies
- NOT for surface chip clearing during milling (use mfg-coolant-flow)

## How To Use
### Calculate Chip Evacuation
```
prism_safety action=calculate_chip_evacuation params={
  material: "aluminum_6061",
  operation: "drilling",
  hole_depth: 50,
  hole_diameter: 10
}
```

### Calculate With Full Context
```
prism_safety action=calculate_chip_evacuation params={
  material: "4140_steel",
  operation: "drilling",
  hole_depth: 80,
  hole_diameter: 8,
  drill_type: "twist_drill",
  coolant_type: "through_tool",
  coolant_pressure_bar: 40,
  spindle_rpm: 2500
}
```

## What It Returns
```json
{
  "depth_ratio": 5.0,
  "evacuation_strategy": "peck_drilling",
  "recommended_peck_depth_mm": 5.0,
  "peck_count": 10,
  "retract_height_mm": 3.0,
  "dwell_ms": 200,
  "chip_form": "long_spiral",
  "chip_breaking_needed": true,
  "cycle_time_estimate_s": 45,
  "warnings": ["Long chips in aluminum -- use parabolic flute drill for better chip breaking"],
  "recommendation": "Peck drill Q5.0 R3.0 with dwell. Consider through-tool coolant drill to eliminate pecks."
}
```

## Examples
### Standard Aluminum Drilling
- Input: `prism_safety action=calculate_chip_evacuation params={material: "aluminum_6061", operation: "drilling", hole_depth: 50, hole_diameter: 10}`
- Output: 5xD ratio. Peck drilling at Q5mm. Aluminum produces long stringy chips -- parabolic flute or through-tool coolant recommended.
- Edge case: Aluminum can weld to drill flutes if chips re-cut -- full retract pecks safer than chip-break pecks

### Deep Hole in Steel
- Input: `prism_safety action=calculate_chip_evacuation params={material: "4140_steel", operation: "drilling", hole_depth: 80, hole_diameter: 8}`
- Output: 10xD ratio. CRITICAL depth -- standard twist drill risky beyond 5xD. Recommend: (1) through-tool coolant drill, (2) gun drill, or (3) pilot then step drill. Peck Q2.4mm if twist drill required.
- Edge case: Work hardening at peck retract points in steel -- vary peck depth slightly (2.2-2.6mm) to avoid hardened layer buildup
