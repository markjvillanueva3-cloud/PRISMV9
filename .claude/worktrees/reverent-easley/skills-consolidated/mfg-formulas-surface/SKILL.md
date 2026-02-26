---
name: mfg-formulas-surface
description: Surface finish formulas including Ra, Rz, Rt, and bearing ratio calculations
---

# Surface Finish Formulas

## When To Use
- Need surface roughness equations (Ra, Rz, Rt from cutting parameters)
- Profile parameter calculations: bearing area curve, Rk, Rpk, Rvk
- Scallop height for ball nose milling
- Functional surface specification (plateau honing, sealing surfaces)
- NOT for process capability of roughness — use mfg-formulas-statistics
- NOT for thermal surface damage — use mfg-formulas-thermal

## How To Use
```
prism_data action=formula_get params={ category: "surface_finish" }
prism_calc action=surface_finish params={
  operation: "turning",
  nose_radius: 0.8,
  feed: 0.15,
  tool_condition: "sharp"
}
```

## What It Returns
- `formulas`: ~25 formulas covering Ra, Rz, Rt, bearing area, scallop height
- `Ra_ideal`: Theoretical Ra = f^2 / (32 * r) for turning
- `Rz_predicted`: Rz with BUE and vibration corrections
- `scallop_height`: Ball nose cusp h = ae^2 / (8 * R) for milling
- `bearing_params`: Rk, Rpk, Rvk from Abbott-Firestone curve

## Examples
- **Turning Ra**: r=0.8mm, f=0.15mm gives Ra_ideal = 3.5 um (actual ~4.2 with corrections)
- **Ball nose scallop**: R=5mm, ae=0.5mm gives cusp height = 6.25 um
- **Rz to Ra**: Typical ratio Rz/Ra = 4-6 for ground surfaces
- **Bearing ratio**: Plateau honed cylinder: Rk=0.5, Rpk=0.2, Rvk=1.5 um
