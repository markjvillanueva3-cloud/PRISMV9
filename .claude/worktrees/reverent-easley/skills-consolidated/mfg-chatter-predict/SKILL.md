---
name: mfg-chatter-predict
description: Predict chatter stability — critical RPM, stable depth of cut, stability lobe diagram data
---

## When To Use
- User reports chatter marks or vibration during machining
- Need to find stable spindle speed for a given depth of cut
- Planning aggressive roughing and need to verify stability
- NOT for tool deflection only (use mfg-deflection)
- NOT for fixture vibration (use prism_safety validate_workholding_setup)

## How To Use
### Predict Chatter Stability
```
prism_calc action=chatter_predict params={
  tool_diameter: 20,
  overhang: 60,
  z: 4,
  material: "4140_steel"
}
```

### With Measured FRF Data
```
prism_calc action=chatter_predict params={
  tool_diameter: 16,
  overhang: 80,
  z: 3,
  material: "Ti-6Al-4V",
  natural_freq_Hz: 2800,
  damping_ratio: 0.03,
  stiffness_N_m: 8e6
}
```

## What It Returns
```json
{
  "stable_ap_max_mm": 2.8,
  "critical_speeds_rpm": [6200, 8400, 12600],
  "optimal_speed_rpm": 8400,
  "optimal_ap_mm": 4.5,
  "stability_lobes": [
    {"rpm": 5000, "ap_limit": 2.1},
    {"rpm": 6200, "ap_limit": 4.2},
    {"rpm": 8400, "ap_limit": 4.5},
    {"rpm": 10000, "ap_limit": 2.5}
  ],
  "natural_frequency_Hz": 2650,
  "damping_ratio": 0.035,
  "recommendation": "Use 8400 RPM for maximum stable depth of 4.5mm",
  "warnings": []
}
```

## Examples
### 20mm Endmill in Steel with 60mm Overhang
- Input: `prism_calc action=chatter_predict params={tool_diameter: 20, overhang: 60, z: 4, material: "4140_steel"}`
- Output: Stable ap=2.8mm unconditionally, up to 4.5mm at sweet-spot 8400 RPM
- Edge case: Overhang/diameter ratio > 4 makes predictions unreliable — consider tap test

### Long-Reach Titanium Finishing
- Input: `prism_calc action=chatter_predict params={tool_diameter: 10, overhang: 60, z: 4, material: "Ti-6Al-4V"}`
- Output: Very limited stable depth (~0.5mm) due to L/D=6 — use shrink-fit holder to improve
- Edge case: Titanium's low damping amplifies chatter; stable zones are narrower than steel
