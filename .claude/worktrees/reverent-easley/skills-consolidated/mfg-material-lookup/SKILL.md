---
name: mfg-material-lookup
description: Retrieve full material properties — hardness, tensile, thermal conductivity, machinability rating from 3,533-entry registry
---

## When To Use
- User asks about a specific material's properties
- Need material data as input for cutting calculations
- Looking up machinability rating, hardness, or thermal properties
- NOT for searching by criteria (use mfg-material-search)
- NOT for comparing materials (use mfg-material-compare)

## How To Use
### Get Material Properties
```
prism_data action=material_get params={
  id: "4140_steel"
}
```

### By Standard Designation
```
prism_data action=material_get params={
  id: "Ti-6Al-4V"
}
```

## What It Returns
```json
{
  "id": "4140_steel",
  "name": "AISI 4140 Alloy Steel",
  "category": "alloy_steel",
  "standard": "AISI",
  "equivalent": ["1.7225", "42CrMo4", "SCM440"],
  "mechanical": {
    "hardness_HB": 197,
    "hardness_HRC": null,
    "tensile_strength_MPa": 655,
    "yield_strength_MPa": 415,
    "elongation_pct": 25.7
  },
  "thermal": {
    "conductivity_W_mK": 42.7,
    "specific_heat_J_kgK": 473,
    "melting_point_C": 1416
  },
  "machinability": {
    "rating": 65,
    "reference": "AISI_1212_100",
    "group": "P",
    "ISO_group": "P4"
  },
  "kienzle": {
    "kc11": 1780,
    "mc": 0.25
  },
  "taylor": {
    "C": 300,
    "n": 0.25
  },
  "density_kg_m3": 7850,
  "completeness_score": 0.95
}
```

## Examples
### Look Up 4140 Steel
- Input: `prism_data action=material_get params={id: "4140_steel"}`
- Output: Full property sheet with kc11=1780, machinability=65, HB=197
- Edge case: Heat-treated 4140 (HRC 28-32) has different kc11 than annealed — check hardness state

### Look Up Titanium Alloy
- Input: `prism_data action=material_get params={id: "Ti-6Al-4V"}`
- Output: Grade 5 Ti properties, machinability rating ~22, low thermal conductivity 6.7 W/mK
- Edge case: Alpha-beta vs beta-annealed Ti-6Al-4V have different machinability; specify condition if known
