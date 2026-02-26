---
name: mfg-material-compare
description: Side-by-side property comparison of two or more materials for selection decisions
---

## When To Use
- User choosing between two candidate materials
- Need to compare machinability, strength, cost, or thermal properties
- Making material substitution decision and want data side-by-side
- NOT for finding alternatives (use mfg-material-substitute)
- NOT for single material lookup (use mfg-material-lookup)

## How To Use
### Compare Two Materials
```
prism_data action=material_compare params={
  materials: ["4140_steel", "4340_steel"]
}
```

### Compare Multiple Materials
```
prism_data action=material_compare params={
  materials: ["aluminum_6061", "aluminum_7075", "aluminum_2024"]
}
```

## What It Returns
```json
{
  "comparison": {
    "4140_steel": {
      "tensile_MPa": 655,
      "hardness_HB": 197,
      "machinability": 65,
      "thermal_conductivity": 42.7,
      "density_kg_m3": 7850,
      "kc11": 1780,
      "cost_relative": 1.0
    },
    "4340_steel": {
      "tensile_MPa": 745,
      "hardness_HB": 217,
      "machinability": 55,
      "thermal_conductivity": 44.5,
      "density_kg_m3": 7850,
      "kc11": 1960,
      "cost_relative": 1.15
    }
  },
  "differences": {
    "tensile_MPa": {"delta": 90, "pct": 13.7, "winner": "4340_steel"},
    "machinability": {"delta": -10, "pct": -15.4, "winner": "4140_steel"},
    "cost_relative": {"delta": 0.15, "pct": 15, "winner": "4140_steel"}
  },
  "recommendation": "4340 is 14% stronger but 15% harder to machine and 15% more expensive"
}
```

## Examples
### 4140 vs 4340 Steel
- Input: `prism_data action=material_compare params={materials: ["4140_steel", "4340_steel"]}`
- Output: 4340 is stronger (745 vs 655 MPa) but lower machinability (55 vs 65) and higher cost
- Edge case: Heat treatment state dramatically changes comparison; specify condition for meaningful results

### Aluminum Alloy Selection
- Input: `prism_data action=material_compare params={materials: ["aluminum_6061", "aluminum_7075", "aluminum_2024"]}`
- Output: 7075 strongest (572 MPa), 6061 most machinable (rating 90), 2024 best fatigue life
- Edge case: 7075 cannot be welded; if welding is required, it is eliminated regardless of strength advantage
