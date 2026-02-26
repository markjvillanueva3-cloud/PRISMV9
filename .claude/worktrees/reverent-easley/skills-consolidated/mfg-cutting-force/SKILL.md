---
name: mfg-cutting-force
description: Calculate cutting forces (Fc, Ft, Fr) using Kienzle model for any material/operation combination
---

## When To Use
- User asks about cutting forces, machining loads, or force components
- Need to verify spindle load or fixture clamping adequacy
- Evaluating whether a setup can handle the expected forces
- NOT for tool life prediction (use mfg-tool-life)
- NOT for power/torque only (use mfg-power or mfg-torque)

## How To Use
### Calculate Cutting Forces
```
prism_calc action=cutting_force params={
  material: "4140_steel",
  operation: "milling",
  Vc: 200,
  fz: 0.15,
  ap: 3,
  ae: 25,
  D: 50,
  z: 4
}
```

### Turning Forces
```
prism_calc action=cutting_force params={
  material: "Ti-6Al-4V",
  operation: "turning",
  Vc: 60,
  f: 0.15,
  ap: 2.0
}
```

## What It Returns
```json
{
  "Fc": 1245.8,
  "Ft": 498.3,
  "Fr": 373.7,
  "Fc_unit": "N",
  "specific_cutting_force": 1780,
  "kc11": 1780,
  "mc": 0.25,
  "model": "kienzle",
  "chip_area_mm2": 0.45,
  "warnings": []
}
```

## Examples
### Milling 4140 Steel with 50mm Endmill
- Input: `prism_calc action=cutting_force params={material: "4140_steel", operation: "milling", Vc: 200, fz: 0.15, ap: 3, ae: 25, D: 50, z: 4}`
- Output: Fc=1245.8N, Ft=498.3N, Fr=373.7N using kc11=1780, mc=0.25
- Edge case: If ae/D > 0.5, engagement angle correction is applied automatically

### Finishing Pass in Aluminum
- Input: `prism_calc action=cutting_force params={material: "aluminum_6061", operation: "milling", Vc: 500, fz: 0.08, ap: 0.5, ae: 12, D: 20, z: 3}`
- Output: Fc=85.2N — low force confirms light finishing parameters
- Edge case: Very small ap (<0.1mm) may produce unreliable Kienzle predictions
