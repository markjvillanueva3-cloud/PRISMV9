---
name: mfg-surface-integrity
description: Predict subsurface effects — residual stress, hardness change, white layer risk from cutting conditions
---

## When To Use
- Machining aerospace or medical parts where subsurface quality matters
- User asks about residual stress, work hardening, or white layer
- Need to validate parameters will not damage part metallurgy
- NOT for surface roughness Ra/Rz (use mfg-surface-finish)
- NOT for general cutting parameter selection (use mfg-speed-feed)

## How To Use
### Predict Surface Integrity
```
prism_calc action=surface_integrity_predict params={
  material: "Ti-6Al-4V",
  Vc: 60,
  f: 0.15,
  ap: 1.0
}
```

### With Tool Condition
```
prism_calc action=surface_integrity_predict params={
  material: "inconel_718",
  Vc: 40,
  f: 0.12,
  ap: 0.5,
  tool_wear_VB: 0.15,
  coolant: "high_pressure"
}
```

## What It Returns
```json
{
  "residual_stress_surface_MPa": -350,
  "residual_stress_type": "compressive",
  "residual_stress_depth_um": 75,
  "hardness_change_percent": 12,
  "hardness_direction": "increase",
  "affected_depth_um": 50,
  "white_layer_risk": "low",
  "white_layer_thickness_um": 0,
  "phase_transformation_risk": "none",
  "recommendation": "Parameters produce favorable compressive residual stress",
  "confidence": "medium",
  "warnings": []
}
```

## Examples
### Titanium Finishing Pass
- Input: `prism_calc action=surface_integrity_predict params={material: "Ti-6Al-4V", Vc: 60, f: 0.15, ap: 1.0}`
- Output: Compressive residual stress -350MPa at surface, 12% hardness increase, no white layer
- Edge case: Worn tools (VB>0.3mm) shift residual stress from compressive to tensile — always specify tool_wear_VB for accuracy

### Hard Turning Steel (HRC 58+)
- Input: `prism_calc action=surface_integrity_predict params={material: "AISI_52100", Vc: 150, f: 0.08, ap: 0.2, hardness_HRC: 60}`
- Output: White layer risk=medium (2-5um), tensile stress at surface — common in hard turning
- Edge case: CBN tool with honed edge reduces white layer risk significantly
