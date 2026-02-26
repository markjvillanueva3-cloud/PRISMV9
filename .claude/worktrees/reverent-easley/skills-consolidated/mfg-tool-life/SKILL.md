---
name: mfg-tool-life
description: Predict tool life in minutes using extended Taylor equation for given cutting conditions
---

## When To Use
- User asks how long a tool will last at given parameters
- Need to estimate tool change intervals or cost per part
- Comparing tool life across different cutting speeds
- NOT for wear measurement (use mfg-wear-prediction)
- NOT for tool breakage risk (use prism_safety predict_tool_breakage)

## How To Use
### Predict Tool Life
```
prism_calc action=tool_life params={
  material: "4140_steel",
  tool_material: "carbide",
  Vc: 200,
  fz: 0.15
}
```

### With Extended Parameters
```
prism_calc action=tool_life params={
  material: "Ti-6Al-4V",
  tool_material: "carbide",
  coating: "TiAlN",
  Vc: 60,
  fz: 0.12,
  ap: 1.5,
  coolant: "flood"
}
```

## What It Returns
```json
{
  "tool_life_minutes": 45.2,
  "tool_life_parts": 12,
  "taylor_C": 300,
  "taylor_n": 0.25,
  "model": "extended_taylor",
  "confidence": "high",
  "Vc_for_15min": 280,
  "Vc_for_60min": 165,
  "warnings": []
}
```

## Examples
### Carbide in 4140 Steel at 200 m/min
- Input: `prism_calc action=tool_life params={material: "4140_steel", tool_material: "carbide", Vc: 200, fz: 0.15}`
- Output: 45.2 minutes tool life, C=300, n=0.25
- Edge case: Above 300 m/min in steel, crater wear dominates and Taylor model accuracy decreases

### High-Speed Aluminum Machining
- Input: `prism_calc action=tool_life params={material: "aluminum_6061", tool_material: "carbide", coating: "DLC", Vc: 800, fz: 0.1}`
- Output: 180+ minutes — aluminum is gentle on tooling with proper coating
- Edge case: Built-up edge at low speeds (<100 m/min) invalidates Taylor predictions
