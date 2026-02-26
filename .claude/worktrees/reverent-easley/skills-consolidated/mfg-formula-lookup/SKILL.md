---
name: mfg-formula-lookup
description: Look up and calculate manufacturing formulas from FormulaRegistry (509 formulas) — Kienzle, Taylor, surface finish, MRR
---

## When To Use
- Need the definition, variables, and units for a specific manufacturing formula
- Want to calculate a result using known input values (e.g., Kienzle specific cutting force)
- Looking up formula derivation, assumptions, and valid ranges
- Teaching or documenting manufacturing engineering calculations
- NOT for full cutting parameter optimization (use mfg-cost-optimize or mfg-param-optimize)
- NOT for chained multi-formula calculations (use mfg-inference-chain)

## How To Use
### Look up a formula definition
```
prism_data action=formula_get params={
  id: "kienzle_specific_cutting_force"
}
```

### Calculate using a formula
```
prism_data action=formula_calculate params={
  formula: "kienzle",
  inputs: {
    kc11: 1780,
    mc: 0.25,
    h: 0.15
  }
}
```

### Look up and calculate Taylor tool life
```
prism_data action=formula_calculate params={
  formula: "taylor_tool_life",
  inputs: {
    C: 350,
    n: 0.25,
    Vc: 200
  }
}
```

## What It Returns
```json
{
  "formula": {
    "id": "kienzle_specific_cutting_force",
    "name": "Kienzle Specific Cutting Force",
    "equation": "kc = kc1.1 * h^(-mc)",
    "description": "Calculates specific cutting force as a function of undeformed chip thickness using Kienzle power law model",
    "variables": {
      "kc": {"description": "Specific cutting force", "unit": "N/mm2", "type": "output"},
      "kc11": {"description": "Unit specific cutting force at h=1mm, b=1mm", "unit": "N/mm2", "type": "input"},
      "mc": {"description": "Kienzle exponent (material-dependent)", "unit": "dimensionless", "type": "input"},
      "h": {"description": "Undeformed chip thickness", "unit": "mm", "type": "input"}
    },
    "reference": "Kienzle & Victor (1957), MIT 2.854"
  },
  "result": {
    "kc": 2864.5,
    "unit": "N/mm2",
    "inputs_used": {"kc11": 1780, "mc": 0.25, "h": 0.15},
    "validity": "h in range [0.01, 1.0] mm — VALID"
  }
}
```

## Examples
### Look up and calculate Kienzle force
- Input: `prism_data action=formula_calculate params={formula: "kienzle", inputs: {kc11: 1780, mc: 0.25, h: 0.15}}`
- Output: kc = 2864.5 N/mm2 for 4140 steel at 0.15mm chip thickness, valid range confirmed
- Edge case: h < 0.01mm enters micro-cutting regime where Kienzle model loses accuracy; warning returned

### Calculate Taylor tool life
- Input: `prism_data action=formula_calculate params={formula: "taylor_tool_life", inputs: {C: 350, n: 0.25, Vc: 200}}`
- Output: T = 9.38 minutes tool life at 200 m/min, Taylor equation VT^n = C
- Edge case: Extrapolating beyond tested Vc range produces a warning about reduced prediction accuracy
