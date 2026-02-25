---
name: mfg-speed-feed
description: Get recommended cutting speed, feed, depth of cut for a material/tool/operation combination
---

## When To Use
- User asks "what speed and feed should I use for X material?"
- Setting up a new job and need starting parameters
- Switching to a new material or tool and need baseline recommendations
- NOT for optimizing existing parameters (use mfg-unified-machining)
- NOT for trochoidal/HSM-specific parameters (use prism_calc trochoidal or hsm)

## How To Use
### Get Recommendations
```
prism_calc action=speed_feed params={
  material: "aluminum_6061",
  operation: "milling",
  tool_diameter: 12,
  tool_material: "carbide"
}
```

### With Constraints
```
prism_calc action=speed_feed params={
  material: "inconel_718",
  operation: "turning",
  tool_material: "ceramic",
  constraint: "tool_life_30min",
  coolant: "high_pressure"
}
```

## What It Returns
```json
{
  "Vc_recommended": 350,
  "Vc_range": [280, 450],
  "Vc_unit": "m/min",
  "fz_recommended": 0.08,
  "fz_range": [0.05, 0.12],
  "fz_unit": "mm/tooth",
  "ap_recommended": 2.0,
  "ap_range": [0.5, 4.0],
  "ae_recommended": 9.0,
  "ae_range": [3.6, 12.0],
  "n_rpm": 9284,
  "Vf_mmmin": 2228,
  "source": "manufacturer_catalog + empirical",
  "confidence": "high"
}
```

## Examples
### Aluminum 6061 with 12mm Carbide Endmill
- Input: `prism_calc action=speed_feed params={material: "aluminum_6061", operation: "milling", tool_diameter: 12, tool_material: "carbide"}`
- Output: Vc=350 m/min, fz=0.08mm, ap=2.0mm, ae=9.0mm, RPM=9284, Vf=2228 mm/min
- Edge case: If machine max RPM < calculated RPM, recommendation adjusts feed to maintain chip load

### Inconel 718 Turning
- Input: `prism_calc action=speed_feed params={material: "inconel_718", operation: "turning", tool_material: "carbide", coating: "TiAlN"}`
- Output: Vc=40 m/min, f=0.12mm/rev, ap=1.0mm — conservative for superalloy
- Edge case: Inconel work-hardens; interrupted cuts require 20% speed reduction
