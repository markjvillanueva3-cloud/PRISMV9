---
name: mfg-flow-stress
description: Calculate material flow stress using Johnson-Cook constitutive model at high strain rates
---

## When To Use
- User asks about material behavior at cutting conditions (high strain rate, elevated temperature)
- Need flow stress for FEM simulation input or analytical force models
- Comparing material deformation resistance across conditions
- NOT for static material properties (use mfg-material-lookup)
- NOT for cutting force directly (use mfg-cutting-force)

## How To Use
### Calculate Flow Stress
```
prism_calc action=flow_stress params={
  material: "Ti-6Al-4V",
  strain: 0.5,
  strain_rate: 10000,
  temperature: 600
}
```

### Steel at Various Conditions
```
prism_calc action=flow_stress params={
  material: "4140_steel",
  strain: 1.0,
  strain_rate: 50000,
  temperature: 400
}
```

## What It Returns
```json
{
  "flow_stress_MPa": 1285,
  "johnson_cook": {
    "A": 997,
    "B": 653,
    "n": 0.45,
    "C": 0.0198,
    "m": 0.7,
    "T_melt": 1660,
    "T_ref": 25
  },
  "strain_hardening_term": 1508,
  "strain_rate_term": 1.18,
  "thermal_softening_term": 0.723,
  "model": "johnson_cook",
  "confidence": "high",
  "warnings": []
}
```

## Examples
### Titanium at Typical Cutting Conditions
- Input: `prism_calc action=flow_stress params={material: "Ti-6Al-4V", strain: 0.5, strain_rate: 10000, temperature: 600}`
- Output: 1285 MPa flow stress — Ti retains high strength even at elevated temperature
- Edge case: Above T_melt, model returns zero stress; near-melt temperatures have low confidence

### High-Speed Steel Cutting
- Input: `prism_calc action=flow_stress params={material: "4140_steel", strain: 1.0, strain_rate: 50000, temperature: 400}`
- Output: ~1650 MPa — high strain + rate hardening at moderate temperature
- Edge case: J-C model accuracy decreases for strain > 2.0; use Zerilli-Armstrong for very high strains
