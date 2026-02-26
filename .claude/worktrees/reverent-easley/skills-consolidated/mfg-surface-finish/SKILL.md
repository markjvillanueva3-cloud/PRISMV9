---
name: mfg-surface-finish
description: Calculate theoretical surface roughness Ra, Rz, Rt from cutting parameters and tool geometry
---

## When To Use
- User asks about expected surface finish or roughness values
- Need to verify if parameters will meet a drawing callout (e.g., Ra 0.8)
- Optimizing feed or nose radius for better finish
- NOT for surface integrity (residual stress, hardness) — use mfg-surface-integrity
- NOT for scallop height in 3D milling — use prism_calc scallop

## How To Use
### Milling Surface Finish
```
prism_calc action=surface_finish params={
  operation: "milling",
  fz: 0.1,
  r_epsilon: 0.8,
  ae: 25,
  D: 50
}
```

### Turning Surface Finish
```
prism_calc action=surface_finish params={
  operation: "turning",
  f: 0.12,
  r_epsilon: 0.4
}
```

## What It Returns
```json
{
  "Ra": 1.56,
  "Rz": 6.25,
  "Rt": 7.81,
  "Ra_unit": "um",
  "model": "theoretical_kinematic",
  "formula": "Ra = fz^2 / (32 * r_epsilon)",
  "notes": "Actual Ra typically 1.2-1.5x theoretical due to BUE, vibration, material effects",
  "meets_spec": null,
  "warnings": []
}
```

## Examples
### Milling with 0.8mm Nose Radius
- Input: `prism_calc action=surface_finish params={operation: "milling", fz: 0.1, r_epsilon: 0.8, ae: 25, D: 50}`
- Output: Ra=1.56um, Rz=6.25um — suitable for general machining (Ra 1.6 spec)
- Edge case: At very low feeds (<0.02mm), ploughing effects worsen actual finish vs theoretical

### Precision Turning for Ra 0.4
- Input: `prism_calc action=surface_finish params={operation: "turning", f: 0.05, r_epsilon: 0.8}`
- Output: Ra=0.39um — just meets Ra 0.4 specification
- Edge case: Wiper insert geometry can achieve 2x better finish at same feed rate
