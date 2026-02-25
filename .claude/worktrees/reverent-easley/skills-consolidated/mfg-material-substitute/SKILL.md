---
name: mfg-material-substitute
description: Find alternative materials ranked by machinability, cost, availability, or performance criteria
---

## When To Use
- User cannot get their specified material and needs an alternative
- Looking for a cheaper or easier-to-machine substitute
- Need a material with similar properties but better availability
- NOT for general material search (use mfg-material-search)
- NOT for direct comparison of known candidates (use mfg-material-compare)

## How To Use
### Find Substitutes by Cost
```
prism_data action=material_substitute params={
  material: "Ti-6Al-4V",
  criteria: "cost"
}
```

### Find Substitutes by Machinability
```
prism_data action=material_substitute params={
  material: "inconel_718",
  criteria: "machinability"
}
```

### Multi-Criteria
```
prism_data action=material_substitute params={
  material: "316L_stainless",
  criteria: "cost",
  constraints: {
    "min_tensile_MPa": 450,
    "corrosion_resistance": "marine"
  }
}
```

## What It Returns
```json
{
  "original": {
    "id": "Ti-6Al-4V",
    "tensile_MPa": 950,
    "machinability": 22,
    "cost_relative": 8.5
  },
  "substitutes": [
    {
      "id": "17-4PH_stainless",
      "match_score": 0.78,
      "tensile_MPa": 1100,
      "machinability": 48,
      "cost_relative": 2.8,
      "tradeoffs": "Higher density, lower corrosion resistance, much cheaper"
    },
    {
      "id": "Ti-6Al-2Sn-4Zr-2Mo",
      "match_score": 0.85,
      "tensile_MPa": 900,
      "machinability": 20,
      "cost_relative": 9.2,
      "tradeoffs": "Better creep resistance, similar machining difficulty, slightly more expensive"
    }
  ],
  "criteria_used": "cost",
  "warning": "Substitutes may not meet all application requirements — verify with engineering"
}
```

## Examples
### Cheaper Alternative to Titanium
- Input: `prism_data action=material_substitute params={material: "Ti-6Al-4V", criteria: "cost"}`
- Output: 17-4PH SS (70% cheaper), 15-5PH SS (65% cheaper), Inconel 625 (40% cheaper)
- Edge case: Weight-critical applications cannot substitute Ti with steel despite cost savings

### Easier-to-Machine Inconel Alternative
- Input: `prism_data action=material_substitute params={material: "inconel_718", criteria: "machinability"}`
- Output: Waspaloy (machinability 18 vs 12), A286 (machinability 35), 17-4PH (machinability 48)
- Edge case: High-temp applications (>600C) eliminate most substitutes; temperature requirement is critical constraint
